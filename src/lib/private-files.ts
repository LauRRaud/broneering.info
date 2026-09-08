import {mkdir,chmod,realpath,open,unlink,opendir,stat} from 'node:fs/promises';
import type {FileHandle} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

function within(root:string,file:string){const r=path.relative(root,file);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));}
async function root(){
  const configured=process.env.PRIVATE_STORAGE_DIR;
  if(process.env.NODE_ENV==='production'&&!configured)throw new Error('Private storage is not configured');
  const value=path.resolve(/*turbopackIgnore: true*/ configured||path.join(process.cwd(),'.private','storage'));
  const forbidden=['public','src','.next'].map(name=>path.resolve(/*turbopackIgnore: true*/ process.cwd(),name));
  if(within(value,process.cwd())||forbidden.some(p=>within(p,value)))throw new Error('Private storage must not be public');
  // Runtime private volumes are never build assets and must not be traced into the image.
  await mkdir(value,{recursive:true,mode:0o700});const resolved=await realpath(/*turbopackIgnore: true*/ value);
  if(within(resolved,await realpath(/*turbopackIgnore: true*/ process.cwd())))throw new Error('Private storage must not be public');
  for(const p of forbidden){const actual=await realpath(/*turbopackIgnore: true*/ p).catch(()=>p);if(within(actual,resolved))throw new Error('Private storage must not be public');}
  await chmod(resolved,0o700);return resolved;
}
function key(value:string){if(!/^[0-9a-f-]{36}_[0-9a-f-]{36}_(jsonl|csv)$/.test(value))throw new Error('Invalid private file key');return value;}
export async function createPrivateFile(tenantId:string,extension:'jsonl'|'csv'):Promise<{key:string;handle:FileHandle}>{
  if(!/^[0-9a-f-]{36}$/.test(tenantId))throw new Error('Invalid tenant id');
  const value=key(`${tenantId}_${randomUUID()}_${extension}`),base=await root();
  return {key:value,handle:await open(path.join(base,value),'wx',0o600)};
}
export async function readPrivateFile(storageKey:string){
  const base=await root(),file=path.join(base,key(storageKey)),resolved=await realpath(/*turbopackIgnore: true*/ file);
  if(!within(base,resolved)||resolved!==file)throw new Error('Invalid private file location');
  return open(/*turbopackIgnore: true*/ file,'r');
}
export async function removePrivateFile(storageKey:string){
  const base=await root(),file=path.join(base,key(storageKey));
  try{await unlink(file);}catch(e){if((e as {code?:string}).code!=='ENOENT')throw e;}
}
/** Orphans wait longer than the maximum seven-day export lifetime, so an uncertain
 * COMMIT or a paused worker can never lose a file that could still be published. */
export async function pruneOrphanFiles(referenced:(tenantId:string,storageKey:string)=>Promise<boolean>){
  const base=await root(),directory=await opendir(/*turbopackIgnore: true*/ base);let removed=0;
  for await(const entry of directory){
    if(!entry.isFile()||! /^[0-9a-f-]{36}_[0-9a-f-]{36}_(jsonl|csv)$/.test(entry.name))continue;
    const info=await stat(/*turbopackIgnore: true*/ path.join(base,entry.name)).catch(()=>null);
    if(!info||info.mtimeMs>Date.now()-8*86400000)continue;
    if(!await referenced(entry.name.slice(0,36),entry.name)){await removePrivateFile(entry.name);removed++;}
    if(removed>=100)break;
  }
  return removed;
}
