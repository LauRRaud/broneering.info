import {createHash,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {AppError} from './errors';
import type {Locale} from './locales';

export type MakeCommerceConfig={mode:'test'|'live';shopId:string;secret:string;publishableKey:string;origin:string;apiOrigin:string;paymentOrigin:string;scriptUrl:string};
const unavailable=()=>new AppError(503,'PAYMENTS_UNAVAILABLE','Veebimaksed pole praegu saadaval.');
export function makeCommerceConfig():MakeCommerceConfig{
 const mode=process.env.MAKECOMMERCE_MODE;
 if(mode!=='test'&&mode!=='live')throw unavailable();
 const shopId=process.env.MAKECOMMERCE_SHOP_ID??'',secret=process.env.MAKECOMMERCE_SECRET_KEY??'',publishableKey=process.env.MAKECOMMERCE_PUBLISHABLE_KEY??'';
 let origin:URL;try{origin=new URL(process.env.MAKECOMMERCE_BASE_URL??'');}catch{throw unavailable();}
 if(!z.uuid().safeParse(shopId).success||secret.length<16||/\s/.test(secret)||!publishableKey||origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw unavailable();
 return {mode,shopId,secret,publishableKey,origin:origin.origin,apiOrigin:mode==='live'?'https://api.maksekeskus.ee':'https://api.test.maksekeskus.ee',paymentOrigin:mode==='live'?'https://payment.maksekeskus.ee':'https://payment.test.maksekeskus.ee',scriptUrl:mode==='live'?'https://static.cc.maksekeskus.ee/checkout/dist/checkout.min.js':'https://static.cc-test.maksekeskus.ee/checkout/dist/checkout.min.js'};
}
export function makeCommerceAvailability(){try{const c=makeCommerceConfig();return {enabled:true,mode:c.mode};}catch{return {enabled:false,mode:null};}}
export function makeCommerceCardSettings(){try{const c=makeCommerceConfig();return {key:c.publishableKey,scriptUrl:c.scriptUrl,origin:c.origin};}catch{return null;}}
const statuses=['CREATED','PENDING','CANCELLED','EXPIRED','APPROVED','COMPLETED','PART_REFUNDED','REFUNDED'] as const;
export type ProviderStatus=typeof statuses[number];
export type ProviderTransaction={id:string;status:ProviderStatus;amount:number;currency:'EUR';reference:string;merchantData:string;redirectUrl:string|null;completedAt:string|null;refundedAmount:number|null;refundedAt:string|null};
/** Never round provider money: any precision beyond cents is rejected. */
export function providerCents(value:unknown):number{
 const s=String(value);if(!/^(0|[1-9]\d{0,6})(\.\d{1,2})?$/.test(s))throw new AppError(502,'PAYMENT_RESPONSE_INVALID','Maksepakkuja vastus vajab kontrollimist.');
 const [whole,fraction='']=s.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(cents)||cents>100000000)throw new AppError(502,'PAYMENT_RESPONSE_INVALID','Maksepakkuja vastus vajab kontrollimist.');return cents;
}
const invalid=()=>new AppError(502,'PAYMENT_RESPONSE_INVALID','Maksepakkuja vastus vajab kontrollimist.');
const transactionSchema=z.object({id:z.uuid(),status:z.enum(statuses),amount:z.union([z.string(),z.number()]),currency:z.literal('EUR'),reference:z.string(),merchant_data:z.string(),completed_at:z.string().nullable().optional(),refunded_at:z.string().nullable().optional(),refunded_amount:z.union([z.string(),z.number()]).nullable().optional(),refunded_original_amount:z.union([z.string(),z.number()]).nullable().optional(),payment_methods:z.object({other:z.array(z.object({name:z.string(),url:z.string()})).optional()}).optional()});
function transaction(raw:unknown,c:MakeCommerceConfig):ProviderTransaction{
 const p=transactionSchema.safeParse(raw);if(!p.success)throw invalid();const d=p.data;
 const redirect=d.payment_methods?.other?.find(item=>item.name==='redirect')?.url??null;
 if(redirect){let u:URL;try{u=new URL(redirect);}catch{throw invalid();}if(u.origin!==c.paymentOrigin||u.username||u.password||u.searchParams.get('trx')!==d.id)throw invalid();}
 if([d.completed_at,d.refunded_at].some(value=>value&&!Number.isFinite(Date.parse(value))))throw invalid();
 const refunded=d.refunded_original_amount??d.refunded_amount,refundedAmount=refunded===undefined||refunded===null?null:providerCents(refunded),amount=providerCents(d.amount);
 if(refundedAmount!==null&&refundedAmount>amount)throw invalid();
 return {id:d.id,status:d.status,amount,currency:d.currency,reference:d.reference,merchantData:d.merchant_data,redirectUrl:redirect,completedAt:d.completed_at??null,refundedAmount,refundedAt:d.refunded_at??null};
}
export class PaymentProviderError extends AppError{
 constructor(public readonly outcome:'rejected'|'unknown',public readonly providerCode:number|null=null){super(502,outcome==='unknown'?'PAYMENT_OUTCOME_UNKNOWN':'PAYMENT_REJECTED',outcome==='unknown'?'Makse tulemus on veel kontrollimisel. Ära alusta uut makset.':'Maksepakkuja ei kinnitanud makset.');}
}
async function api(c:MakeCommerceConfig,path:string,body?:unknown){
 let response:Response;
 try{response=await fetch(c.apiOrigin+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Basic '+Buffer.from(c.shopId+':'+c.secret).toString('base64'),'Content-Type':'application/json',Accept:'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});}
 catch{throw new PaymentProviderError('unknown');}
 // Do not expose raw gateway errors, headers, card tokens or customer details.
 let raw:unknown;try{const reader=response.body?.getReader();if(!reader)throw invalid();let size=0;const chunks:Uint8Array[]=[];while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>262144){await reader.cancel();throw invalid();}chunks.push(next.value);}raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PaymentProviderError('unknown');}
 if(!response.ok){const code=z.object({code:z.number().int()}).safeParse(raw);throw new PaymentProviderError([400,401,403,404,415].includes(response.status)?'rejected':'unknown',code.success?code.data.code:null);}
 return raw;
}
export async function createProviderTransaction(input:{tenantId:string;amount:number;reference:string;attemptId:string;email:string;ip:string;locale:Locale;recurring:boolean},c=makeCommerceConfig()){
 if(!Number.isSafeInteger(input.amount)||input.amount<(input.recurring?0:1)||input.amount>100000000||!z.uuid().safeParse(input.tenantId).success||!z.uuid().safeParse(input.attemptId).success||!input.reference||input.reference.length>100||!isIP(input.ip)||!z.email().safeParse(input.email).success)throw new AppError(400,'INVALID_PAYMENT_REQUEST','Kontrolli makse andmeid.');
 const callback=(path:string)=>({url:c.origin+path+'?'+new URLSearchParams({tenantId:input.tenantId,attemptId:input.attemptId}),method:'POST'});
 const raw=await api(c,'/v1/transactions',{transaction:{amount:(input.amount/100).toFixed(2),currency:'EUR',reference:input.reference,merchant_data:input.attemptId,recurring_required:input.recurring,transaction_url:{return_url:callback('/api/payments/makecommerce/return'),cancel_url:callback('/api/payments/makecommerce/return'),notification_url:callback('/api/payments/makecommerce/notify')}},customer:{email:input.email,ip:input.ip,locale:input.locale,country:'ee'}});
 const result=transaction(raw,c);if(result.amount!==input.amount||result.reference!==input.reference||result.merchantData!==input.attemptId)throw new PaymentProviderError('unknown');return result;
}
export async function getProviderTransaction(id:string,c=makeCommerceConfig()){
 if(!z.uuid().safeParse(id).success)throw invalid();const result=transaction(await api(c,'/v1/transactions/'+id),c);if(result.id!==id)throw invalid();return result;
}
export async function chargeProviderToken(id:string,token:string,c=makeCommerceConfig()){
 if(!z.uuid().safeParse(id).success||!z.uuid().safeParse(token).success)throw invalid();
 const raw=await api(c,'/v1/transactions/'+id+'/payments',{token});
 const p=z.object({transaction:z.object({id:z.uuid().optional(),status:z.enum(statuses)})}).safeParse(raw);if(!p.success||(p.data.transaction.id&&p.data.transaction.id!==id))throw new PaymentProviderError('unknown');return p.data.transaction.status;
}
const paymentMessage=z.object({message_type:z.literal('payment_return'),message_time:z.string(),shop:z.uuid(),transaction:z.uuid(),status:z.enum(statuses),amount:z.union([z.string(),z.number()]),currency:z.literal('EUR'),reference:z.string(),merchant_data:z.string()});
const tokenMessage=z.object({message_type:z.literal('token_return'),message_time:z.string(),transaction:z.object({id:z.uuid(),status:z.enum(statuses),reference:z.string()}),token:z.object({id:z.uuid(),multiuse:z.boolean(),valid_until:z.iso.date()}).optional()});
export type ProviderMessage=ReturnType<typeof verifyProviderMessage>;
export function verifyProviderMessage(json:string,mac:string,c=makeCommerceConfig()){
 const rejected=()=>new AppError(403,'PAYMENT_MESSAGE_INVALID','Makse teadet ei saanud kinnitada.');
 if(Buffer.byteLength(json)>32768||! /^[0-9a-f]{128}$/i.test(mac))throw rejected();
 const expected=createHash('sha512').update(json).update(c.secret).digest(),actual=Buffer.from(mac,'hex');if(!timingSafeEqual(expected,actual))throw rejected();
 let raw:unknown;try{raw=JSON.parse(json);}catch{throw rejected();}
 const p=z.discriminatedUnion('message_type',[paymentMessage,tokenMessage]).safeParse(raw);if(!p.success||!Number.isFinite(Date.parse(p.data.message_time)))throw rejected();
 if(p.data.message_type==='payment_return'){if(p.data.shop!==c.shopId)throw rejected();return {...p.data,amount:providerCents(p.data.amount)};}
 return p.data;
}
