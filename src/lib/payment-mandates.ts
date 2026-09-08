import {z} from 'zod';
import {withTenant} from './db';
import {requireOwnerInTransaction,requirePlatformInClient,audit,type Actor} from './access';
import {billingCommandReply,saveBillingCommand} from './invoices';
import {tokenHash} from './booking-secrets';
import {AppError} from './errors';
export const recurringTerms={version:'monthly-v1',amount:3500,currency:'EUR',interval:'monthly',invoiceOnEveryPayment:true,cancellation:'owner_can_disable',failure:'invoice_payment_link'} as const;
export async function readPaymentMandate(actor:Actor,tenantId:string,platform=false){
 if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
 return withTenant(tenantId,async client=>{if(platform)await requirePlatformInClient(actor,client);else await requireOwnerInTransaction(actor,tenantId,client);
  const row=(await client.query('SELECT id,status,consent_at,terms,valid_until::text,activated_at,revoked_at,version FROM payment_mandates WHERE tenant_id=$1 ORDER BY consent_at DESC,id DESC LIMIT 1',[tenantId])).rows[0];
  return {mandate:row?{id:row.id,status:row.status,consentAt:row.consent_at.toISOString(),terms:row.terms,validUntil:row.valid_until,activatedAt:row.activated_at?.toISOString()??null,revokedAt:row.revoked_at?.toISOString()??null,version:row.version}:null};
 });
}
const revokeSchema=z.object({tenantId:z.uuid(),mandateId:z.uuid(),version:z.number().int().positive(),requestKey:z.uuid(),confirmed:z.literal(true)}).strict();
export async function revokePaymentMandate(actor:Actor,raw:unknown){
 const parsed=revokeSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_MANDATE','Kontrolli püsimakse kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await requireOwnerInTransaction(actor,d.tenantId,client);
  const hash=tokenHash(JSON.stringify({action:'mandate.revoke',...d})),previous=await billingCommandReply<{revoked:true}>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const row=(await client.query('SELECT id,status,version,setup_attempt_id FROM payment_mandates WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[d.tenantId,d.mandateId])).rows[0];
  if(!row)throw new AppError(404,'MANDATE_NOT_FOUND','Püsimakse nõusolekut ei leitud.');if(row.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(row.status!=='revoked')await client.query("UPDATE payment_mandates SET status='revoked',encrypted_token=NULL,revoked_at=clock_timestamp(),revoked_by=$3,version=version+1 WHERE tenant_id=$1 AND id=$2",[d.tenantId,d.mandateId,actor.id]);
  await client.query("UPDATE payment_attempts SET state='cancelled' WHERE tenant_id=$1 AND id=$2 AND state IN ('creating','ready')",[d.tenantId,row.setup_attempt_id]);
  await client.query("UPDATE subscriptions SET payment_mode='invoice',version=version+1 WHERE tenant_id=$1 AND payment_mode<>'invoice'",[d.tenantId]);
  const reply={revoked:true as const};await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'mandate.revoke',hash,reply);await audit(client,d.tenantId,actor.id,'payment.mandate.revoked',undefined,d.mandateId);return reply;
 });
}
