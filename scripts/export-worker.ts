import {recordWorkerHeartbeat} from '../src/lib/worker-health';
import {runExportBatch} from '../src/lib/export-worker';
import {closePool} from '../src/lib/db';
let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function main(){do{
  try{const result=await runExportBatch();await recordWorkerHeartbeat('exports',result.failed===0);if(result.failed&&process.argv.includes('--once'))process.exitCode=1;if(result.processed)console.log(JSON.stringify({event:'exports.batch',processed:result.processed}));}
  catch{await recordWorkerHeartbeat('exports',false).catch(()=>{});console.error(JSON.stringify({event:'exports.batch_failed'}));if(process.argv.includes('--once')){process.exitCode=1;break;}}
  if(process.argv.includes('--once'))break;
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,2000));
}while(!stopping);}
main().catch(()=>{console.error('Export worker failed');process.exitCode=1;}).finally(closePool);
