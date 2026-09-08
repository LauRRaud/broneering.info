import {it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createRecoveryArtifact,restoreRecoveryArtifact} from '../scripts/operations/recovery-artifact';

it('encrypts private files and removal records, verifies integrity and refuses a nonempty restore target',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'booking-recovery-test-'));
 try{
  const source=path.join(root,'source'),backup=path.join(root,'backup'),restored=path.join(root,'restored');await mkdir(source);
  const tenantId=randomUUID(),key=`${tenantId}_${randomUUID()}_csv`,secret=randomBytes(32),environmentId=randomUUID();
  await writeFile(path.join(source,key),'name,email\nPrivate Person,private@example.invalid');
  const removal={id:randomUUID(),tenantId,customerIds:[randomUUID()],bookingIds:[],removedAt:'2026-09-08T00:00:00.000Z'};
  await createRecoveryArtifact({sourceDirectory:source,artifactDirectory:backup,key:secret,environmentId,removals:[removal]});
  for(const entry of await readdir(backup))expect((await readFile(path.join(backup,entry))).toString()).not.toContain('private@example.invalid');
  await expect(restoreRecoveryArtifact({artifactDirectory:backup,targetDirectory:restored,key:randomBytes(32),environmentId})).rejects.toThrow();
  expect(await readdir(restored).catch(()=>[])).toEqual([]);
  const manifest=await restoreRecoveryArtifact({artifactDirectory:backup,targetDirectory:restored,key:secret,environmentId});
  expect(manifest.removals).toEqual([removal]);expect(await readFile(path.join(restored,key),'utf8')).toContain('Private Person');
  await expect(restoreRecoveryArtifact({artifactDirectory:backup,targetDirectory:restored,key:secret,environmentId})).rejects.toThrow();
  await expect(restoreRecoveryArtifact({artifactDirectory:backup,targetDirectory:path.join(root,'wrong'),key:secret,environmentId:randomUUID()})).rejects.toThrow();
 }finally{await rm(root,{recursive:true,force:true});}
});

it('rejects modified encrypted content before publishing a restored directory',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'booking-recovery-test-'));
 try{
  const source=path.join(root,'source'),backup=path.join(root,'backup'),target=path.join(root,'restored');await mkdir(source);
  const filename=`${randomUUID()}_${randomUUID()}_jsonl`,secret=randomBytes(32),environmentId=randomUUID();await writeFile(path.join(source,filename),'sensitive file');
  await createRecoveryArtifact({sourceDirectory:source,artifactDirectory:backup,key:secret,environmentId,removals:[]});
  const file=(await readdir(backup)).find(n=>n.endsWith('.bin'))!;const bytes=await readFile(path.join(backup,file));bytes[15]^=1;await writeFile(path.join(backup,file),bytes);
  await expect(restoreRecoveryArtifact({artifactDirectory:backup,targetDirectory:target,key:secret,environmentId})).rejects.toThrow();
  expect(await readdir(target).catch(()=>[])).toEqual([]);
 }finally{await rm(root,{recursive:true,force:true});}
});
