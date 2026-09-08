import {z} from 'zod';
import {DateTime} from 'luxon';
import type {PoolClient} from 'pg';
import {withTenant} from './db';
import {requirePlatformInClient,requireOwnerInTransaction,audit,type Actor} from './access';
import {AppError} from './errors';
import {tokenHash} from './booking-secrets';
import {billingPartySchema,currentBillingIssuer,type BillingParty,type BillingSettings} from './billing-config';
import {includedTax,invoiceDueDate} from './billing-rules';
import {ensureInvoicePaymentLink} from './invoice-links';

export type InvoiceLine={description:string;quantity:number;unitPrice:number;taxRateBasisPoints:number;subtotal:number;tax:number;total:number;planId:string;planVersion:number};
export type InvoiceView={id:string;number:string|null;version:number;status:string;kind:'invoice'|'credit';originalInvoiceId:string|null;originalNumber:string|null;correctionReason:string|null;creditId:string|null;issuedOn:string|null;issuedAt:string|null;dueDate:string;periodStart:string;periodEnd:string;
 subtotal:number;tax:number;total:number;currency:string;issuer:BillingSettings;recipient:BillingParty;lines:InvoiceLine[];paidAmount:number;voidReason:string|null;
 mail?:InvoiceMailState|null;reminder?:InvoiceMailState|null;replacedInvoiceId?:string|null;replacedNumber?:string|null};
export type InvoiceMailState={status:string;attempts:number;nextAttemptAt:string;sentAt:string|null;errorCode:string|null};
export type InvoicePreview={subscriptionId:string;subscriptionVersion:number;issuerVersion:number;issuedOn:string;dueDate:string;periodStart:string;periodEnd:string;
 issuer:BillingSettings;recipient:BillingParty;lines:InvoiceLine[];subtotal:number;tax:number;total:number;currency:'EUR';fingerprint:string;replacementInvoiceId?:string;replacedNumber?:string};

export async function billingCommandReply<T>(client:PoolClient,tenantId:string,requestKey:string,hash:string):Promise<T|null>{
 const row=(await client.query('SELECT payload_hash,reply FROM billing_commands WHERE tenant_id=$1 AND request_key=$2',[tenantId,requestKey])).rows[0];
 if(!row)return null;if(row.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');return row.reply;
}
export async function saveBillingCommand(client:PoolClient,actor:Actor,tenantId:string,requestKey:string,action:string,hash:string,reply:unknown){
 await client.query('INSERT INTO billing_commands(tenant_id,request_key,action,payload_hash,reply,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)',[tenantId,requestKey,action,hash,JSON.stringify(reply),actor.id]);
}
async function lockPlatformTenant(client:PoolClient,actor:Actor,tenantId:string){
 await requirePlatformInClient(actor,client);
 const row=(await client.query('SELECT timezone,service_ends_at FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];
 if(!row)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');return row;
}
const identity={tenantId:z.uuid(),requestKey:z.uuid()};
const recipientSchema=z.object({...identity,version:z.number().int().positive(),recipient:billingPartySchema}).strict();
export async function saveBillingRecipient(actor:Actor,raw:unknown,platform=false){
 const parsed=recipientSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_BILLING_RECIPIENT','Kontrolli arve saaja nime, registrikoodi, aadressi ja e-posti.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  if(platform)await lockPlatformTenant(client,actor,d.tenantId);else await requireOwnerInTransaction(actor,d.tenantId,client);
  const hash=tokenHash(JSON.stringify({action:'recipient.save',...d})),previous=await billingCommandReply<{version:number}>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  const saved=(await client.query('UPDATE subscriptions SET billing_recipient=$3,billing_contact_name=$4,billing_email=$5,version=version+1 WHERE tenant_id=$1 AND version=$2 RETURNING version',[d.tenantId,d.version,JSON.stringify(d.recipient),d.recipient.name,d.recipient.email])).rows[0];
  if(!saved)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'recipient.save',hash,saved);
  await audit(client,d.tenantId,actor.id,'billing.recipient.updated',undefined,undefined,{version:saved.version});return saved as {version:number};
 });
}
export async function previewInvoiceInClient(client:PoolClient,tenantId:string,timezone:string,replacementInvoiceId?:string):Promise<InvoicePreview>{
 const issuer=await currentBillingIssuer(client);if(!issuer)throw new AppError(409,'BILLING_ISSUER_REQUIRED','Enne arve väljastamist kinnita arve väljastaja ja maksuseaded.');
 const s=(await client.query(`SELECT s.id,s.version,s.period_start::text,s.period_end::text,s.status,s.ends_at,s.billing_recipient,p.id AS plan_id,p.version AS plan_version,p.name,p.monthly_price,p.currency,p.entitlements
  FROM subscriptions s JOIN plan_versions p ON (p.id,p.version)=(s.plan_id,s.plan_version) WHERE s.tenant_id=$1`,[tenantId])).rows[0];
 if(!s)throw new AppError(409,'SUBSCRIPTION_REQUIRED','Loo enne ettevõtte tellimus.');
 const original=replacementInvoiceId?await invoiceInClient(client,tenantId,replacementInvoiceId):null;
 if(original&&(original.kind!=='invoice'||original.status!=='void'||!original.creditId||original.lines.length!==1||original.lines[0].quantity!==1))throw new AppError(409,'INVOICE_NOT_REPLACEABLE','Asendada saab ainult täielikult krediteeritud kuuarvet.');
 if(!original&&(s.status==='ended'||(s.ends_at&&DateTime.fromISO(s.period_end,{zone:timezone}).toMillis()>new Date(s.ends_at).getTime())))throw new AppError(409,'BILLING_PERIOD_ENDED','Arveldusperiood ulatub üle teenuse lõpu. Kontrolli lõpetamise kokkulepet.');
 const recipient=billingPartySchema.safeParse(s.billing_recipient);if(!recipient.success)throw new AppError(409,'BILLING_RECIPIENT_REQUIRED','Täida enne arve saaja andmed.');
 if(s.currency!=='EUR'||s.entitlements.taxIncluded!==true||s.entitlements.paymentTermDays!==7||s.entitlements.graceDays!==0)throw new AppError(409,'BILLING_TERMS_UNSUPPORTED','Tellimuse arveldustingimused vajavad kinnitamist.');
 const issuedOn=DateTime.now().setZone(timezone).toISODate();if(!issuedOn)throw new AppError(409,'INVALID_TIMEZONE','Ettevõtte ajavöönd on vigane.');
 const amounts=includedTax(original?.total??s.monthly_price,issuer.settings.taxRateBasisPoints);
 const lines:InvoiceLine[]=[{description:original?.lines[0].description??`broneering.info — ${s.name}`,quantity:1,unitPrice:amounts.subtotal,taxRateBasisPoints:issuer.settings.taxRateBasisPoints,
  subtotal:amounts.subtotal,tax:amounts.tax,total:amounts.total,planId:original?.lines[0].planId??s.plan_id,planVersion:original?.lines[0].planVersion??s.plan_version}];
 const snapshot={subscriptionId:s.id,subscriptionVersion:s.version,issuerVersion:issuer.version,issuedOn,dueDate:invoiceDueDate(issuedOn),periodStart:original?.periodStart??s.period_start,periodEnd:original?.periodEnd??s.period_end,
  issuer:issuer.settings,recipient:recipient.data,lines,...amounts,...(original?{replacementInvoiceId:original.id,replacedNumber:original.number!}:{})};
 return {...snapshot,fingerprint:tokenHash(JSON.stringify(snapshot))};
}
export async function previewInvoice(actor:Actor,tenantId:string,replacementInvoiceId?:string){
 if(!z.uuid().safeParse(tenantId).success||(replacementInvoiceId&&!z.uuid().safeParse(replacementInvoiceId).success))throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
 return withTenant(tenantId,async client=>{const tenant=await lockPlatformTenant(client,actor,tenantId);return previewInvoiceInClient(client,tenantId,tenant.timezone,replacementInvoiceId);});
}
function invoiceView(row:Record<string,any>):InvoiceView{return {id:row.id,number:row.number,version:row.version,status:row.status,kind:row.kind,originalInvoiceId:row.original_invoice_id,originalNumber:row.original_number,correctionReason:row.correction_reason,creditId:row.credit_id,issuedOn:row.issued_on,issuedAt:row.issued_at?.toISOString()??null,
 dueDate:row.due_date,periodStart:row.period_start,periodEnd:row.period_end,subtotal:row.subtotal,tax:row.tax,total:row.total,currency:row.currency,issuer:row.issuer_snapshot,recipient:row.recipient_snapshot,lines:row.lines_snapshot,paidAmount:Number(row.paid_amount??0),voidReason:row.void_reason,mail:row.mail??null,reminder:row.reminder??null,replacedInvoiceId:row.replaced_invoice_id??null,replacedNumber:row.replaced_number??null};}
const selectInvoice=`SELECT i.*,i.issued_on::text,i.period_start::text,i.period_end::text,i.due_date::text,
 (SELECT o.number FROM invoices o WHERE o.tenant_id=i.tenant_id AND o.id=i.original_invoice_id) AS original_number,
 (SELECT o.number FROM invoices o WHERE o.tenant_id=i.tenant_id AND o.id=i.replaced_invoice_id) AS replaced_number,
 (SELECT c.id FROM invoices c WHERE c.tenant_id=i.tenant_id AND c.original_invoice_id=i.id AND c.kind='credit') AS credit_id,
 (SELECT json_build_object('status',m.status,'attempts',m.attempts,'nextAttemptAt',m.next_attempt_at,'sentAt',m.sent_at,'errorCode',m.last_error_code) FROM invoice_mail_outbox m WHERE m.tenant_id=i.tenant_id AND m.invoice_id=i.id AND m.kind='issued') AS mail,
 (SELECT json_build_object('status',m.status,'attempts',m.attempts,'nextAttemptAt',m.next_attempt_at,'sentAt',m.sent_at,'errorCode',m.last_error_code) FROM invoice_mail_outbox m WHERE m.tenant_id=i.tenant_id AND m.invoice_id=i.id AND m.kind='overdue') AS reminder,
 invoice_paid_amount(i.tenant_id,i.id) AS paid_amount FROM invoices i`;
export async function invoiceInClient(client:PoolClient,tenantId:string,id:string){
 const row=(await client.query(selectInvoice+' WHERE i.tenant_id=$1 AND i.id=$2',[tenantId,id])).rows[0];if(!row)throw new AppError(404,'INVOICE_NOT_FOUND','Arvet ei leitud.');return invoiceView(row);
}
export async function readInvoices(actor:Actor,tenantId:string,platform=false,offset=0){
 if(!z.uuid().safeParse(tenantId).success||!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new AppError(400,'INVALID_BILLING_QUERY','Vigane arvelduse päring.');
 return withTenant(tenantId,async client=>{
  if(platform)await requirePlatformInClient(actor,client);else await requireOwnerInTransaction(actor,tenantId,client);
  const rows=(await client.query(selectInvoice+' WHERE i.tenant_id=$1 ORDER BY i.created_at DESC,i.id DESC LIMIT 51 OFFSET $2',[tenantId,offset])).rows;
  return {invoices:rows.slice(0,50).map(invoiceView),hasMore:rows.length>50};
 });
}
export async function readInvoice(actor:Actor,tenantId:string,id:string,platform=false){
 if(!z.uuid().safeParse(tenantId).success||!z.uuid().safeParse(id).success)throw new AppError(400,'INVALID_BILLING_QUERY','Vigane arvelduse päring.');
 return withTenant(tenantId,async client=>{if(platform)await requirePlatformInClient(actor,client);else await requireOwnerInTransaction(actor,tenantId,client);return invoiceInClient(client,tenantId,id);});
}
const issueSchema=z.object({...identity,fingerprint:z.string().regex(/^[0-9a-f]{64}$/),confirmed:z.literal(true),replacementInvoiceId:z.uuid().optional()}).strict();
export async function issueInvoice(actor:Actor,raw:unknown):Promise<InvoiceView>{
 const parsed=issueSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INVOICE','Kontrolli arve eelvaadet ja kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  const tenant=await lockPlatformTenant(client,actor,d.tenantId),hash=tokenHash(JSON.stringify({action:'invoice.issue',...d}));
  const previous=await billingCommandReply<InvoiceView>(client,d.tenantId,d.requestKey,hash);if(previous)return previous;
  // Serialize issuer approval with snapshot selection, without locking any other tenant.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('billing-issuer-versions',0))");
  const p=await previewInvoiceInClient(client,d.tenantId,tenant.timezone,d.replacementInvoiceId);
  if(p.fingerprint!==d.fingerprint)throw new AppError(409,'INVOICE_PREVIEW_CHANGED','Arve andmed muutusid. Vaata uus eelvaade üle.');
  if((await client.query("SELECT id FROM invoices WHERE tenant_id=$1 AND subscription_id=$2 AND period_start=$3 AND period_end=$4 AND kind='invoice' AND status<>'void'",[d.tenantId,p.subscriptionId,p.periodStart,p.periodEnd])).rowCount)throw new AppError(409,'INVOICE_EXISTS','Selle perioodi arve on juba olemas.');
  const row=await insertInvoiceInClient(client,d.tenantId,d.requestKey,p);
  const reply=await invoiceInClient(client,d.tenantId,row.id);
  await saveBillingCommand(client,actor,d.tenantId,d.requestKey,'invoice.issue',hash,reply);
  await audit(client,d.tenantId,actor.id,'invoice.issued',undefined,row.id,{number:reply.number,total:p.total,periodStart:p.periodStart,periodEnd:p.periodEnd,replacedInvoiceId:p.replacementInvoiceId});return reply;
 });
}

/** Caller holds the tenant lock and the issuer-version advisory lock. */
export async function insertInvoiceInClient(client:PoolClient,tenantId:string,requestKey:string,p:InvoicePreview){
  const serial=(await client.query("SELECT nextval('invoice_number_counter')::text n")).rows[0].n;
  const number=`${p.issuer.numberPrefix}-${p.issuedOn.slice(0,4)}-${serial.padStart(6,'0')}`;
  const row=(await client.query(`INSERT INTO invoices(tenant_id,subscription_id,request_key,number,period_start,period_end,due_date,issuer_snapshot,recipient_snapshot,lines_snapshot,subtotal,tax,total,currency,status,issued_at,issued_on,snapshot_hash,issuer_version,replaced_invoice_id)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'EUR','issued',clock_timestamp(),$14,$15,$16,$17) RETURNING id`,
   [tenantId,p.subscriptionId,requestKey,number,p.periodStart,p.periodEnd,p.dueDate,JSON.stringify(p.issuer),JSON.stringify(p.recipient),JSON.stringify(p.lines),p.subtotal,p.tax,p.total,p.issuedOn,p.fingerprint,p.issuerVersion,p.replacementInvoiceId??null])).rows[0];
  await ensureInvoicePaymentLink(client,tenantId,row.id);
  await client.query('INSERT INTO invoice_mail_outbox(tenant_id,invoice_id) VALUES($1,$2)',[tenantId,row.id]);
  return row as {id:string};
}
