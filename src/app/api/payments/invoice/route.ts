import {isIP} from 'node:net';
import {assertAdminHost,adminJson,adminError} from '@/lib/admin-http';
import {readJson,limitTenant} from '@/lib/http';
import {readPublicInvoicePayment,beginPublicInvoiceCheckout} from '@/lib/payment-checkout';
import {localeFromHeaders} from '@/lib/locales';
import {AppError} from '@/lib/errors';
export const runtime='nodejs';
export async function POST(request:Request){try{
 assertAdminHost(request,true);
 const ip=process.env.NODE_ENV==='production'?request.headers.get('x-real-ip')??'':'127.0.0.1';if(!isIP(ip))throw new AppError(503,'PAYMENT_CLIENT_IP_MISSING','Veebimaksed pole praegu saadaval.');
 await limitTenant('public-invoice:'+ip,120);
 const raw=await readJson(request);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');
 const {action,...data}=raw as Record<string,unknown>;
 if(action==='summary')return adminJson(await readPublicInvoicePayment(data));
 if(action==='checkout')return adminJson(await beginPublicInvoiceCheckout(data,{ip,locale:localeFromHeaders(request.headers)}));
 throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');
}catch(error){return adminError(error,request);}}
