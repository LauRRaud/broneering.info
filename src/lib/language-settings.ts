import {z} from 'zod';
import {withTenant} from './db';
import {requireMembershipInClient,audit,type Actor} from './access';
import {AppError} from './errors';
import {locales,type Locale} from './locales';
const schema=z.object({tenantId:z.uuid(),adminLanguage:z.enum(locales).optional(),defaultLanguage:z.enum(locales).optional()}).strict();
export async function languageSettings(actor:Actor,raw:unknown,write=false){
  const parsed=schema.safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Vali toetatud keel.');
  const d=parsed.data;
  return withTenant(d.tenantId,async client=>{
    const m=await requireMembershipInClient(actor,d.tenantId,undefined,client);
    if(write){
      if(d.defaultLanguage){
        if(m.role!=='owner')throw new AppError(403,'FORBIDDEN','Ettevõtte vaikekeele määrab omanik.');
        await client.query('UPDATE tenants SET default_language=$2 WHERE id=$1',[d.tenantId,d.defaultLanguage]);
      }
      if(d.adminLanguage)await client.query('UPDATE memberships SET admin_language=$3 WHERE tenant_id=$1 AND user_id=$2',[d.tenantId,actor.id,d.adminLanguage]);
      await audit(client,d.tenantId,actor.id,'language.settings.updated',actor.id,d.tenantId,{adminLanguage:d.adminLanguage,defaultLanguage:d.defaultLanguage});
    }
    const result=await client.query<{adminLanguage:Locale;defaultLanguage:Locale}>('SELECT m.admin_language AS "adminLanguage",t.default_language AS "defaultLanguage" FROM memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.tenant_id=$1 AND m.user_id=$2',[d.tenantId,actor.id]);
    return result.rows[0];
  });
}
