import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';
import {writeHeartbeat,checkHeartbeat} from '../src/lib/worker-health';
let directory:string;
afterEach(async()=>{if(directory)await rm(directory,{recursive:true,force:true});});
describe('worker heartbeat',()=>{
 it('fails missing, old, failed, corrupt and future state; accepts recent success',async()=>{
  directory=await mkdtemp(path.join(tmpdir(),'worker-health-'));const file=path.join(directory,'health.json');
  expect(await checkHeartbeat(file,1000,10000)).toBe(false);
  await writeHeartbeat(file,true,9500);expect(await checkHeartbeat(file,1000,10000)).toBe(true);
  expect(JSON.parse(await readFile(file,'utf8'))).toEqual({version:1,ok:true,completedAt:9500});
  expect(await checkHeartbeat(file,1000,11000)).toBe(false);
  await writeHeartbeat(file,false,9900);expect(await checkHeartbeat(file,1000,10000)).toBe(false);
  await writeHeartbeat(file,true,11000);expect(await checkHeartbeat(file,1000,10000)).toBe(false);
  await writeFile(file,'bad');expect(await checkHeartbeat(file,1000,10000)).toBe(false);
 });
});
