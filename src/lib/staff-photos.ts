import sharp from 'sharp';
import {z} from 'zod';
import {withTenant} from './db';
import {audit,type Actor} from './access';
import {requireServiceStructure} from './service-management';
import {AppError} from './errors';

export const PHOTO_MAX_BYTES=10*1024*1024;
const identity=z.object({tenantId:z.uuid(),staffId:z.uuid()});
const change=identity.extend({version:z.number().int().positive()});
function invalid(){return new AppError(400,'INVALID_PHOTO','Vali JPG-, PNG- või WebP-pilt kuni 10 MB ja 40 megapikslit. HEIC-pilt salvesta esmalt JPG-na.');}
export async function readPhotoUpload(request:Request){
  if(!['image/jpeg','image/png','image/webp'].includes(request.headers.get('content-type')?.split(';')[0]??''))throw invalid();
  if(Number(request.headers.get('content-length'))>PHOTO_MAX_BYTES)throw invalid();
  const reader=request.body?.getReader();if(!reader)throw invalid();
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>PHOTO_MAX_BYTES){await reader.cancel();throw invalid();}chunks.push(value);}}finally{reader.releaseLock();}
  if(!size)throw invalid();return Buffer.concat(chunks);
}
export async function normalizeStaffPhoto(input:Buffer){
  if(!input.length||input.length>PHOTO_MAX_BYTES)throw invalid();
  try{
    const pipeline=sharp(input,{limitInputPixels:40_000_000,failOn:'warning'});
    const meta=await pipeline.metadata();
    if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)!==1)throw invalid();
    // auto-orient before resizing; sharp strips EXIF/GPS metadata by default.
    const output=await pipeline.rotate().resize(768,768,{fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:80}).toBuffer();
    if(output.length>524288)throw invalid();return output;
  }catch{throw invalid();}
}
export async function authorizeStaffPhoto(actor:Actor,raw:unknown){
  const parsed=identity.safeParse(raw);if(!parsed.success)throw invalid();const d=parsed.data;
  await withTenant(d.tenantId,async c=>{await requireServiceStructure(c,actor,d.tenantId);if(!(await c.query('SELECT id FROM staff WHERE tenant_id=$1 AND id=$2',[d.tenantId,d.staffId])).rowCount)throw new AppError(404,'NOT_FOUND','Töötajat ei leitud.');});
  return d;
}
export async function changeStaffPhoto(actor:Actor,raw:unknown,input:Buffer|null){
  const parsed=change.safeParse(raw);if(!parsed.success)throw invalid();const d=parsed.data;
  await authorizeStaffPhoto(actor,d);
  const photo=input===null?null:await normalizeStaffPhoto(input);
  return withTenant(d.tenantId,async c=>{
    await requireServiceStructure(c,actor,d.tenantId);
    const photoUrl=photo?`/api/staff-photos/${d.staffId}?v=${d.version+1}`:'';
    const saved=await c.query('UPDATE staff SET photo_image=$4,photo_url=$5,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$3 RETURNING version',[d.tenantId,d.staffId,d.version,photo,photoUrl]);
    if(!saved.rowCount)throw new AppError(409,'VERSION_CONFLICT','Töötaja andmed on muutunud. Laadi haldus uuesti ja proovi foto salvestamist uuesti.');
    await audit(c,d.tenantId,actor.id,photo?'staff.photo.saved':'staff.photo.removed',undefined,d.staffId,{bytes:photo?.length??0});
    return {photoUrl,version:saved.rows[0].version};
  });
}
export async function staffPhoto(tenantId:string,staffId:string,actor?:Actor){
  const parsed=identity.safeParse({tenantId,staffId});if(!parsed.success)throw invalid();
  return withTenant(tenantId,async c=>{
    if(actor)await requireServiceStructure(c,actor,tenantId);
    const row=(await c.query(`SELECT s.photo_image FROM staff s JOIN tenants t ON t.id=s.tenant_id WHERE s.tenant_id=$1 AND s.id=$2 AND s.photo_image IS NOT NULL AND ($3::boolean OR (s.active AND s.online AND t.active AND t.public_state='published' AND (t.booking_stops_at IS NULL OR t.booking_stops_at>now())))`,[tenantId,staffId,!!actor])).rows[0];
    if(!row)throw new AppError(404,'NOT_FOUND','Fotot ei leitud.');return row.photo_image as Buffer;
  });
}
export function photoResponse(bytes:Buffer){
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Content-Length':String(bytes.length),'Cache-Control':'no-store','Vary':'Host, Cookie','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
