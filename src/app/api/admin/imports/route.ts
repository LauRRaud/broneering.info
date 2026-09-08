import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {limitTenant,readJson} from '@/lib/http';
import {readCsvUpload} from '@/lib/import-csv';
import {uploadImport,importState,previewImport,importSetup} from '@/lib/import-management';
import {commitImport} from '@/lib/import-commit';
import {importLifecycle} from '@/lib/import-lifecycle';
import {importTemplate,type ImportKind} from '@/lib/import-fields';
import {AppError} from '@/lib/errors';
export const runtime='nodejs';
export async function PUT(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('import-commit:'+actor.id,10);
  return adminJson(await commitImport(actor,await readJson(request)));
}catch(e){return adminError(e,request);}}
export async function GET(request:Request){try{
  assertAdminHost(request);const actor=await adminActor(request);await limitTenant('import-read:'+actor.id,120);
  const q=new URL(request.url).searchParams;
  if(q.has('setup'))return adminJson(await importSetup(actor,q.get('tenantId')??''));
  if(q.has('template')){
    await importState(actor,q.get('tenantId')??'');
    const kind=q.get('template')??'';if(!['services','staff','customers','bookings'].includes(kind))throw new AppError(400,'INVALID_INPUT','Vigane impordi liik.');
    return new Response(importTemplate(kind as ImportKind),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="import-${kind}.csv"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Host, Cookie'}});
  }
  return adminJson(await importState(actor,q.get('tenantId')??'',q.get('id')??undefined,Number(q.get('after')??0)));
}catch(e){return adminError(e,request);}}
export async function PATCH(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('import-preview:'+actor.id,10);
  const body=await readJson(request);
  return adminJson(body&&typeof body==='object'&&'action' in body?await importLifecycle(actor,body):await previewImport(actor,body));
}catch(e){return adminError(e,request);}}
export async function POST(request:Request){try{
  assertAdminHost(request,true);const actor=await adminActor(request);await limitTenant('import-upload:'+actor.id,10);
  const q=new URL(request.url).searchParams;
  return adminJson(await uploadImport(actor,{tenantId:q.get('tenantId'),requestKey:request.headers.get('Idempotency-Key'),kind:q.get('kind'),delimiter:q.get('delimiter')??','},await readCsvUpload(request)),201);
}catch(e){return adminError(e,request);}}
