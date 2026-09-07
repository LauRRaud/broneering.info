import { AppError } from './errors';

export function json(value: unknown, status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','Vary':'Host'}});
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return json({error:error.message,code:error.code},error.status);
  // Never log bodies, customer contacts, SQL parameters, or raw database errors.
  console.error('Request failed', error instanceof Error ? error.name : 'UnknownError');
  return json({error:'Teenus pole hetkel kättesaadav. Palun proovi uuesti.',code:'INTERNAL_ERROR'},500);
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
  if (!origin || new URL(origin).host !== request.headers.get('host')) throw new AppError(403,'ORIGIN_REJECTED','Broneerimine peab toimuma ettevõtte broneerimislehel.');
}

// Bounded process-local admission control for the technical pilot, not distributed protection.
const counters=new Map<string,{count:number;expires:number}>();
export function limitTenant(key:string,maximum:number) {
  const now=Date.now();
  if(counters.size>2000) for(const [k,v] of counters) if(v.expires<=now) counters.delete(k);
  const current=counters.get(key);
  if(current && current.expires>now) {
    if(current.count>=maximum) throw new AppError(429,'RATE_LIMIT','Päringuid on korraga liiga palju. Proovi minuti pärast.');
    current.count++;
  } else {
    if(counters.size>=4000 && !current) throw new AppError(503,'BUSY','Teenus on hetkel hõivatud.');
    counters.set(key,{count:1,expires:now+60000});
  }
}
