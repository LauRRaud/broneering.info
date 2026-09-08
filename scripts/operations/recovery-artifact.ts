import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,readdir,lstat,open,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {z} from 'zod';

const removalSchema=z.object({id:z.uuid(),tenantId:z.uuid(),customerIds:z.array(z.uuid()).max(100000),bookingIds:z.array(z.uuid()).max(100000),removedAt:z.iso.datetime()}).strict();
export type RemovalRecord=z.infer<typeof removalSchema>;
const privateKey=/^[0-9a-f-]{36}_[0-9a-f-]{36}_(csv|jsonl)$/;
const manifestSchema=z.object({version:z.literal(1),environmentId:z.uuid(),createdAt:z.iso.datetime(),removals:z.array(removalSchema).max(100000),files:z.array(z.object({name:z.string().regex(privateKey),blob:z.string().regex(/^[0-9a-f-]{36}\.bin$/),bytes:z.number().int().nonnegative(),sha256:z.string().regex(/^[a-f0-9]{64}$/),tag:z.string().regex(/^[a-f0-9]{32}$/)}).strict()).max(100000)}).strict();
type Manifest=z.infer<typeof manifestSchema>;
type Common={artifactDirectory:string;key:Buffer;environmentId:string};
function validate(common:Common){if(common.key.length!==32||!z.uuid().safeParse(common.environmentId).success)throw Error('Invalid recovery key or environment identifier');}
function seal(data:Buffer,key:Buffer,aad:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(aad));return Buffer.concat([iv,cipher.update(data),cipher.final(),cipher.getAuthTag()]);}
function unseal(data:Buffer,key:Buffer,aad:string){if(data.length<28)throw Error('Invalid recovery envelope');const cipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));cipher.setAAD(Buffer.from(aad));cipher.setAuthTag(data.subarray(-16));return Buffer.concat([cipher.update(data.subarray(12,-16)),cipher.final()]);}
async function syncFile(filename:string){const handle=await open(filename,'r+');try{await handle.sync();}finally{await handle.close();}}
async function absent(directory:string){try{await lstat(directory);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}throw Error('Destination must not exist');}

export async function createRecoveryArtifact(options:Common&{sourceDirectory:string;removals:RemovalRecord[]}){
 validate(options);await absent(options.artifactDirectory);
 const source=path.resolve(options.sourceDirectory),destination=path.resolve(options.artifactDirectory);
 if(destination===source||destination.startsWith(source+path.sep))throw Error('Backup must be outside source directory');
 const manifest:Manifest={version:1,environmentId:options.environmentId,createdAt:new Date().toISOString(),removals:z.array(removalSchema).max(100000).parse(options.removals),files:[]};
 const staging=destination+'.partial-'+randomUUID();await mkdir(staging,{recursive:true,mode:0o700});
 try{
  for(const entry of await readdir(source,{withFileTypes:true})){
   if(!entry.isFile()||!privateKey.test(entry.name))throw Error('Unexpected file in private storage');
   const blob=randomUUID()+'.bin',iv=randomBytes(12),hash=createHash('sha256');let bytes=0;
   const file=path.join(source,entry.name),before=await lstat(file);if(!before.isFile()||before.isSymbolicLink())throw Error('Invalid private file');
   const cipher=createCipheriv('aes-256-gcm',options.key,iv);cipher.setAAD(Buffer.from(options.environmentId+':'+entry.name));
   await writeFile(path.join(staging,blob),iv,{flag:'wx',mode:0o600});
   await pipeline(createReadStream(file),new Transform({transform(chunk,encoding,done){bytes+=chunk.length;hash.update(chunk);done(null,chunk);}}),cipher,createWriteStream(path.join(staging,blob),{flags:'a'}));
   await syncFile(path.join(staging,blob));
   const after=await lstat(file);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||bytes!==before.size)throw Error('Private file changed during backup');
   manifest.files.push({name:entry.name,blob,bytes,sha256:hash.digest('hex'),tag:cipher.getAuthTag().toString('hex')});
  }
  const encoded=Buffer.from(JSON.stringify(manifest));if(encoded.length>64*1024*1024)throw Error('Recovery manifest too large');
  await writeFile(path.join(staging,'manifest.enc'),seal(encoded,options.key,'booking-recovery-v1'),{flag:'wx',mode:0o600});
  await syncFile(path.join(staging,'manifest.enc'));
  await rename(staging,destination);return {files:manifest.files.length,removals:manifest.removals.length,createdAt:manifest.createdAt};
 }catch(e){await rm(staging,{recursive:true,force:true});throw e;}
}

export async function readRecoveryManifest(options:Common):Promise<Manifest>{
 validate(options);const filename=path.join(options.artifactDirectory,'manifest.enc'),stat=await lstat(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64*1024*1024+28)throw Error('Invalid recovery manifest');
 const manifest=manifestSchema.parse(JSON.parse(unseal(await readFile(filename),options.key,'booking-recovery-v1').toString('utf8')));
 if(manifest.environmentId!==options.environmentId)throw Error('Recovery environment mismatch');
 if(new Set(manifest.files.map(f=>f.name)).size!==manifest.files.length||new Set(manifest.files.map(f=>f.blob)).size!==manifest.files.length)throw Error('Duplicate recovery file');
 return manifest;
}
export async function restoreRecoveryArtifact(options:Common&{targetDirectory:string}){
 const manifest=await readRecoveryManifest(options);await absent(options.targetDirectory);
 const destination=path.resolve(options.targetDirectory),staging=destination+'.partial-'+randomUUID();await mkdir(staging,{recursive:true,mode:0o700});
 try{
  for(const file of manifest.files){
   const source=path.join(options.artifactDirectory,file.blob),stat=await lstat(source);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==file.bytes+12)throw Error('Recovery file size mismatch');
   const handle=await open(source,'r'),iv=Buffer.alloc(12);try{await handle.read(iv,0,12,0);}finally{await handle.close();}
   const cipher=createDecipheriv('aes-256-gcm',options.key,iv);cipher.setAAD(Buffer.from(options.environmentId+':'+file.name));cipher.setAuthTag(Buffer.from(file.tag,'hex'));
   const hash=createHash('sha256');let bytes=0;
   await pipeline(createReadStream(source,{start:12}),cipher,new Transform({transform(chunk,encoding,done){hash.update(chunk);bytes+=chunk.length;done(null,chunk);}}),createWriteStream(path.join(staging,file.name),{flags:'wx',mode:0o600}));
   await syncFile(path.join(staging,file.name));
   if(bytes!==file.bytes||hash.digest('hex')!==file.sha256)throw Error('Recovery file integrity mismatch');
  }
  await rename(staging,destination);return manifest;
 }catch(e){await rm(staging,{recursive:true,force:true});throw e;}
}
