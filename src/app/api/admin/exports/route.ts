import {Readable} from 'node:stream';
import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {requestExport,exportState,downloadExport} from '@/lib/export-management';
import {limitTenant,readJson} from '@/lib/http';
export const runtime='nodejs';
export async function GET(request:Request){try{
  assertAdminHost(request);const actor=await adminActor(request);await limitTenant('export-read:'+actor.id,120);
  const q=new URL(request.url).searchParams,tenantId=q.get('tenantId')??'',id=q.get('download');
  if(!id)return adminJson(await exportState(actor,tenantId));
  await limitTenant('export-download:'+actor.id,10);
  const {file,bytes}=await downloadExport(actor,tenantId,id);
  const stream=file.createReadStream({autoClose:true});
  return new Response(Readable.toWeb(stream) as ReadableStream,{headers:{'Content-Type':'application/x-ndjson','Content-Disposition':`attachment; filename="company-export-${id}.jsonl"`,'Content-Length':String(bytes),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',Vary:'Host, Cookie'}});
}catch(e){return adminError(e,request);}}
export async function POST(request:Request){try{assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('export-create:'+actor.id,10);return adminJson(await requestExport(actor,await readJson(request)),202);}catch(e){return adminError(e,request);}}
