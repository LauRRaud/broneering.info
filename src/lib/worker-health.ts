import {mkdir,readFile,rename,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';

export function heartbeatPath(worker:string){
  if(!['notifications','exports','payments','billing'].includes(worker))throw new Error('Invalid worker');
  return process.env.WORKER_HEARTBEAT_FILE || path.join(tmpdir(),`broneering-${worker}-heartbeat.json`);
}
export async function writeHeartbeat(file:string,ok:boolean,now=Date.now()){
  await mkdir(path.dirname(file),{recursive:true});
  const temporary=`${file}.${randomUUID()}.tmp`;
  try{
    await writeFile(temporary,JSON.stringify({version:1,ok,completedAt:now}),{mode:0o600,flag:'wx'});
    await rename(temporary,file);
  }finally{await unlink(temporary).catch(()=>{});}
}
export async function checkHeartbeat(file:string,maxAge=300000,now=Date.now()):Promise<boolean>{
  try{
    const state=JSON.parse(await readFile(file,'utf8'));
    return Number.isFinite(maxAge)&&maxAge>0&&state.version===1&&state.ok===true&&Number.isSafeInteger(state.completedAt)&&state.completedAt<=now&&now-state.completedAt<=maxAge;
  }catch{return false;}
}
export async function recordWorkerHeartbeat(worker:string,ok:boolean){await writeHeartbeat(heartbeatPath(worker),ok);}
