import type {PoolClient} from 'pg';
import {z} from 'zod';
import {randomBookingToken,tokenHash,sealBookingReply,openBookingReply} from './booking-secrets';
import {authBaseUrl} from './auth-host';
import {AppError} from './errors';
/** Fragment keeps the bearer secret out of HTTP access logs and Referer headers. */
export async function ensureInvoicePaymentLink(client:PoolClient,tenantId:string,invoiceId:string){
 const token=randomBookingToken();
 await client.query('INSERT INTO invoice_payment_links(tenant_id,invoice_id,token_hash,encrypted_token) VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,invoice_id) DO NOTHING',[tenantId,invoiceId,tokenHash(token),sealBookingReply(token,'invoice-link:'+tenantId+':'+invoiceId)]);
 const link=await readInvoicePaymentLink(client,tenantId,invoiceId);if(!link)throw new AppError(410,'PAYMENT_LINK_EXPIRED','Arve makselink ei ole enam kehtiv.');return link;
}
export async function readInvoicePaymentLink(client:PoolClient,tenantId:string,invoiceId:string){
 const row=(await client.query('SELECT encrypted_token,revoked_at FROM invoice_payment_links WHERE tenant_id=$1 AND invoice_id=$2',[tenantId,invoiceId])).rows[0];
 if(!row||row.revoked_at)return null;
 const secret=openBookingReply<string>(row.encrypted_token,'invoice-link:'+tenantId+':'+invoiceId);
 return authBaseUrl+'/pay#'+tenantId+'.'+secret;
}
export async function invoiceForPaymentLink(client:PoolClient,tenantId:string,token:string){
 if(!z.uuid().safeParse(tenantId).success||! /^[A-Za-z0-9_-]{43}$/.test(token))throw new AppError(404,'PAYMENT_LINK_NOT_FOUND','Arve makselinki ei leitud.');
 const row=(await client.query('SELECT invoice_id FROM invoice_payment_links WHERE tenant_id=$1 AND token_hash=$2 AND revoked_at IS NULL',[tenantId,tokenHash(token)])).rows[0];
 if(!row)throw new AppError(404,'PAYMENT_LINK_NOT_FOUND','Arve makselinki ei leitud.');return row.invoice_id as string;
}
