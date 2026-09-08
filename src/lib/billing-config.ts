import {z} from 'zod';
import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {requirePlatformInClient,audit,type Actor} from './access';
import {tokenHash} from './booking-secrets';
import {AppError} from './errors';

export const billingPartySchema=z.object({
 name:z.string().trim().min(2).max(200),registrationCode:z.string().trim().min(2).max(50),
 address:z.string().trim().min(2).max(500),country:z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
 vatNumber:z.string().trim().max(50),email:z.email().trim().toLowerCase().max(254),
}).strict();
export type BillingParty=z.infer<typeof billingPartySchema>;
function validIban(value:string){
 if(!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value))return false;
 const moved=value.slice(4)+value.slice(0,4);let remainder=0;
 for(const char of moved){const digits=/[A-Z]/.test(char)?String(char.charCodeAt(0)-55):char;for(const digit of digits)remainder=(remainder*10+Number(digit))%97;}
 return remainder===1;
}
const settingsSchema=z.object({
 issuer:billingPartySchema,iban:z.string().trim().transform(v=>v.replaceAll(' ','').toUpperCase()).refine(validIban),
 numberPrefix:z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9-]{0,11}$/),
 vatRegistered:z.boolean(),taxRateBasisPoints:z.number().int().min(0).max(10000),taxNote:z.string().trim().max(500),
}).strict().superRefine((d,ctx)=>{
 if(!d.vatRegistered&&(d.taxRateBasisPoints!==0||d.issuer.vatNumber!==''))ctx.addIssue({code:'custom',message:'Non-VAT issuer cannot charge VAT'});
 if(d.vatRegistered&&!d.issuer.vatNumber)ctx.addIssue({code:'custom',message:'VAT number required'});
 if(d.taxRateBasisPoints===0&&d.taxNote.length<10)ctx.addIssue({code:'custom',message:'Explain tax treatment'});
});
export type BillingSettings=z.infer<typeof settingsSchema>;
export type BillingIssuerVersion={version:number;settings:BillingSettings;approvedAt:string;approvalNote:string};
const schema=z.object({requestKey:z.uuid(),expectedVersion:z.number().int().min(0),settings:settingsSchema,approvalNote:z.string().trim().min(10).max(1000),confirmed:z.literal(true)}).strict();
const globalContext='00000000-0000-0000-0000-000000000000';
function view(row:Record<string,any>):BillingIssuerVersion{return {version:row.version,settings:row.settings,approvedAt:row.approved_at.toISOString(),approvalNote:row.approval_note};}
export async function currentBillingIssuer(client:PoolClient):Promise<BillingIssuerVersion|null>{const row=(await client.query('SELECT version,settings,approved_at,approval_note FROM billing_issuer_versions ORDER BY version DESC LIMIT 1')).rows[0];return row?view(row):null;}
export async function billingIssuerState(actor:Actor){return withTenant(globalContext,async client=>{await requirePlatformInClient(actor,client);return {issuer:await currentBillingIssuer(client)};});}
export async function saveBillingIssuer(actor:Actor,raw:unknown){
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_BILLING_ISSUER','Kontrolli arve väljastaja andmeid, IBAN-it, maksuseadeid ja raamatupidamise kinnitust.');const d=parsed.data;
 return withTenant(globalContext,async client=>{
  await requirePlatformInClient(actor,client);await client.query("SELECT pg_advisory_xact_lock(hashtextextended('billing-issuer-versions',0))");
  const hash=tokenHash(JSON.stringify(d)),previous=(await client.query('SELECT * FROM billing_issuer_versions WHERE request_key=$1',[d.requestKey])).rows[0];
  if(previous){if(previous.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return {issuer:view(previous)};}
  const before=await currentBillingIssuer(client);if((before?.version??0)!==d.expectedVersion)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  const row=(await client.query('INSERT INTO billing_issuer_versions(version,request_key,payload_hash,settings,approved_by,approval_note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[(before?.version??0)+1,d.requestKey,hash,JSON.stringify(d.settings),actor.id,d.approvalNote])).rows[0];
  await audit(client,null,actor.id,'billing.issuer.approved',undefined,undefined,{version:row.version});return {issuer:view(row)};
 });
}
