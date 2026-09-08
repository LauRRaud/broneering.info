import {translator} from './i18n';
import {localeFromHeaders} from './locales';
import { AppError } from './errors';
import {recordSecurityRejection} from './security-log';
export {limitTenant} from './request-limits';

export function json(value: unknown, status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','Vary':'Host, Cookie, X-Booking-Language'}});
}
export function errorResponse(error: unknown,request?:Request) {
  if (error instanceof AppError) {
    recordSecurityRejection(error.code,error.status);
    const response=json({error:translator(request?localeFromHeaders(request.headers):'et')(error.message),code:error.code},error.status);
    if(error.code==='RATE_LIMIT')response.headers.set('Retry-After','60');
    return response;
  }
  // Never log bodies, customer contacts, SQL parameters, or raw database errors.
  console.error('Request failed', error instanceof Error ? error.name : 'UnknownError');
  return json({error:translator(request?localeFromHeaders(request.headers):'et')('Teenus pole hetkel kättesaadav. Palun proovi uuesti.'),code:'INTERNAL_ERROR'},500);
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError(415,'CONTENT_TYPE','Päring peab olema JSON-vormingus.');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400,'EMPTY_BODY','Päringu sisu puudub.');
  let bytes=0;
  const chunks: Uint8Array[]=[];
  while (true) {
    const {done,value}=await reader.read();
    if(done) break;
    bytes+=value.byteLength;
    if(bytes>8192) { await reader.cancel(); throw new AppError(413,'BODY_TOO_LARGE','Päring on liiga suur.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AppError(400,'INVALID_JSON','Päringu vorming on vigane.'); }
}

export function assertSameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  let accepted=false;
  try {
    const parsed=origin?new URL(origin):null;
    const protocol=process.env.NODE_ENV==='production'?'https:':new URL(request.url).protocol;
    accepted=!!parsed && origin===parsed.origin && parsed.protocol===protocol && parsed.host===request.headers.get('host');
  }catch{ /* Malformed Origin is a rejected request, not an internal error. */ }
  if (!accepted) throw new AppError(403,'ORIGIN_REJECTED','Broneerimine peab toimuma ettevõtte broneerimislehel.');
}
