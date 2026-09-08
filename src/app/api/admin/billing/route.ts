import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant,readJson} from '@/lib/http';
import {AppError} from '@/lib/errors';
import {billingIssuerState,saveBillingIssuer} from '@/lib/billing-config';
import {saveBillingRecipient,previewInvoice,issueInvoice,readInvoices,readInvoice} from '@/lib/invoices';
import {invoiceDocument} from '@/lib/invoice-document';
import {resolveLocale} from '@/lib/locales';
import {recordPayment,reversePayment,readPayments} from '@/lib/payments';
import {creditInvoice} from '@/lib/invoice-corrections';
import {beginInvoiceCheckout,readCheckouts} from '@/lib/payment-checkout';
import {makeCommerceAvailability,makeCommerceCardSettings} from '@/lib/makecommerce';
import {readPaymentMandate,revokePaymentMandate} from '@/lib/payment-mandates';
import {localeFromHeaders} from '@/lib/locales';
import {isIP} from 'node:net';
import {withTenant} from '@/lib/db';
import {readInvoicePaymentLink} from '@/lib/invoice-links';
import {retryInvoiceMail} from '@/lib/invoice-mail-admin';
export const runtime='nodejs';
export async function GET(request:Request){try{
 assertAdminHost(request);const actor=await adminActor(request);await limitTenant('billing-read:'+actor.id,120);
 const q=new URL(request.url).searchParams,tenantId=q.get('tenantId')??'',platform=q.get('platform')==='true';
 switch(q.get('view')){
  case 'issuer':return adminJson(await billingIssuerState(actor));
  case 'preview':return adminJson(await previewInvoice(actor,tenantId,q.get('replacementInvoiceId')??undefined));
  case 'invoice':return adminJson(await readInvoice(actor,tenantId,q.get('id')??'',platform));
  case 'payment-link':{const invoice=await readInvoice(actor,tenantId,q.get('id')??'',platform);return adminJson({url:await withTenant(tenantId,client=>readInvoicePaymentLink(client,tenantId,invoice.id))});}
  case 'payments':return adminJson(await readPayments(actor,tenantId,q.get('id')??'',platform,Number(q.get('offset')??0)));
  case 'checkout':return adminJson({...await readCheckouts(actor,tenantId,q.get('id')??'',platform),...await readPaymentMandate(actor,tenantId,platform),provider:makeCommerceAvailability(),card:makeCommerceCardSettings()});
  case 'print':{
   const invoice=await readInvoice(actor,tenantId,q.get('id')??'',platform);
   const paymentLink=await withTenant(tenantId,client=>readInvoicePaymentLink(client,tenantId,invoice.id));
   return new Response(invoiceDocument(invoice,resolveLocale(q.get('lang')),paymentLink),{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':`inline; filename="invoice-${invoice.id}.html"`,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Host, Cookie','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
  }
  default:return adminJson(await readInvoices(actor,tenantId,platform,Number(q.get('offset')??0)));
 }
}catch(error){return adminError(error,request);}}
export async function POST(request:Request){try{
 assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('billing-write:'+actor.id,30);
 const raw=await readJson(request);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AppError(400,'INVALID_INPUT','Kontrolli vormi andmeid.');
 const {action,platform,...data}=raw as Record<string,unknown>;
 switch(action){
  case 'issuer':return adminJson(await saveBillingIssuer(actor,data));
  case 'recipient':return adminJson(await saveBillingRecipient(actor,data,platform===true));
  case 'issue':return adminJson(await issueInvoice(actor,data));
  case 'credit':return adminJson(await creditInvoice(actor,data));
  case 'retry-mail':return adminJson(await retryInvoiceMail(actor,data));
  case 'revoke-mandate':return adminJson(await revokePaymentMandate(actor,data));
  case 'checkout':{
   // Production nginx overwrites this header and the app port is bound to loopback.
   const ip=process.env.NODE_ENV==='production'?request.headers.get('x-real-ip')??'':'127.0.0.1';
   if(!isIP(ip))throw new AppError(503,'PAYMENT_CLIENT_IP_MISSING','Veebimaksed pole praegu saadaval.');
   return adminJson(await beginInvoiceCheckout(actor,data,{ip,locale:localeFromHeaders(request.headers)}));
  }
  case 'payment':return adminJson(await recordPayment(actor,data));
  case 'reverse-payment':return adminJson(await reversePayment(actor,data));
  default:throw new AppError(400,'INVALID_INPUT','Kontrolli vormi andmeid.');
 }
}catch(error){return adminError(error,request);}}
