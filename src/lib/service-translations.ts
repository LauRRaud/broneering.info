import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {requireMembershipInClient,audit,type Actor} from './access';
import {AppError} from './errors';
import {translationCommand,type TranslationState,type TranslationRow,type TranslationService} from './service-translation-contracts';
import {generateServiceTranslations,translationConfigured} from './translation-provider';
import type {Locale} from './locales';
import {z} from 'zod';

const serviceColumns='id,name,description,source_language AS "sourceLanguage",content_version AS "contentVersion",active';
const translationColumns='language,name,description,source_version AS "sourceVersion",version,status,origin,updated_at AS "updatedAt",published_name AS "publishedName",published_description AS "publishedDescription",published_source_version AS "publishedSourceVersion"';
async function context(client:PoolClient,actor:Actor,tenantId:string){
  const tenant=await client.query('SELECT id FROM tenants WHERE id=$1 AND active FOR UPDATE',[tenantId]);
  if(!tenant.rowCount)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
  const member=await requireMembershipInClient(actor,tenantId,'services.manage',client);
  if(member.role!=='owner')throw new AppError(403,'FORBIDDEN','Teenuste tõlkeid haldab ettevõtte omanik.');
}
function conflict():never{throw new AppError(409,'TRANSLATION_CONFLICT','Algtekst või tõlge on vahepeal muutunud. Laadi värske seis; sinu sisestatud tekst jääb vormi alles.');}
export async function serviceTranslationState(actor:Actor,tenantId:string,serviceId?:string):Promise<TranslationState>{
  if(!z.uuid().safeParse(tenantId).success||(serviceId&&!z.uuid().safeParse(serviceId).success))throw new AppError(400,'INVALID_INPUT','Vigane tunnus.');
  return withTenant(tenantId,async client=>{
    await context(client,actor,tenantId);
    const services=await client.query<Omit<TranslationService,'translations'>>(`SELECT ${serviceColumns} FROM services WHERE tenant_id=$1 ORDER BY active DESC,name,id`,[tenantId]);
    const translations=await client.query<TranslationRow&{serviceId:string}>(`SELECT service_id AS "serviceId",${translationColumns} FROM service_translations WHERE tenant_id=$1 ORDER BY language`,[tenantId]);
    const history=serviceId?await client.query('SELECT a.action,a.created_at AS at,u.name AS "actorName",a.metadata FROM access_audit_log a LEFT JOIN auth_user u ON u.id=a.actor_user_id WHERE a.tenant_id=$1 AND a.target_id=$2 AND (a.action LIKE \'translation.%\' OR a.action=\'catalog.save-service\') ORDER BY a.created_at DESC,a.id DESC LIMIT 100',[tenantId,serviceId]):{rows:[]};
    return {services:services.rows.map(s=>({...s,translations:translations.rows.filter(t=>t.serviceId===s.id)})),generationAvailable:translationConfigured(),history:history.rows};
  });
}
export async function changeServiceTranslation(actor:Actor,raw:unknown){
  const parsed=translationCommand.safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli tõlke nime, kirjeldust ja valitud keelt.');
  const d=parsed.data,targets=d.action==='generate'?d.targets:[{language:d.language,version:d.version}];
  if(new Set(targets.map(t=>t.language)).size!==targets.length)throw new AppError(400,'INVALID_INPUT','Vali erinevad sihtkeeled.');
  async function checked(client:PoolClient){
    await context(client,actor,d.tenantId);
    const service=(await client.query<TranslationService>(`SELECT ${serviceColumns} FROM services WHERE tenant_id=$1 AND id=$2`,[d.tenantId,d.serviceId])).rows[0];
    if(!service)throw new AppError(404,'NOT_FOUND','Teenust ei leitud.');
    if(service.contentVersion!==d.sourceVersion)conflict();
    if(targets.some(t=>t.language===service.sourceLanguage))throw new AppError(400,'INVALID_INPUT','Tõlke keel peab erinema algteksti keelest.');
    const existing=(await client.query<TranslationRow>(`SELECT ${translationColumns} FROM service_translations WHERE tenant_id=$1 AND service_id=$2`,[d.tenantId,d.serviceId])).rows;
    for(const target of targets)if((existing.find(r=>r.language===target.language)?.version??0)!==target.version)conflict();
    return {service,existing};
  }
  // Never hold database locks while an external provider is working. Recheck source,
  // translation versions and fresh access before storing any generated draft.
  let generated:Array<{language:Locale;name:string;description:string}>|undefined;
  if(d.action==='generate'){
    const {service}=await withTenant(d.tenantId,checked);
    generated=await generateServiceTranslations({name:service.name,description:service.description,language:service.sourceLanguage},targets.map(t=>t.language));
  }
  return withTenant(d.tenantId,async client=>{
    const {service,existing}=await checked(client);
    for(const target of targets){
      const before=existing.find(r=>r.language===target.language);
      if(d.action==='publish'){
        if(!before||before.sourceVersion!==service.contentVersion)conflict();
        if(before.status==='published')continue;
        const after=(await client.query(`UPDATE service_translations SET status='published',published_name=name,published_description=description,published_source_version=source_version,version=version+1,updated_at=now() WHERE tenant_id=$1 AND service_id=$2 AND language=$3 RETURNING ${translationColumns}`,[d.tenantId,d.serviceId,target.language])).rows[0];
        await audit(client,d.tenantId,actor.id,'translation.published',undefined,d.serviceId,{language:target.language,before,after});
      }else{
        const text=d.action==='save'?d:generated!.find(t=>t.language===target.language)!;
        const after=(await client.query(`INSERT INTO service_translations(tenant_id,service_id,language,name,description,source_version,status,origin) VALUES($1,$2,$3,$4,$5,$6,'draft',$7) ON CONFLICT(tenant_id,service_id,language) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,source_version=EXCLUDED.source_version,status='draft',origin=EXCLUDED.origin,version=service_translations.version+1,updated_at=now() RETURNING ${translationColumns}`,[d.tenantId,d.serviceId,target.language,text.name,text.description,service.contentVersion,d.action==='save'?'manual':'machine'])).rows[0];
        await audit(client,d.tenantId,actor.id,d.action==='save'?'translation.saved':'translation.generated',undefined,d.serviceId,{language:target.language,before:before??null,after});
      }
    }
    return {ok:true};
  });
}
