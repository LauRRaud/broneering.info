import {recordWorkerHeartbeat} from '../src/lib/worker-health';
import {runNotificationBatch} from '../src/lib/notification-worker';
import {bookingMailConfigured} from '../src/lib/notification-config';
import {closePool} from '../src/lib/db';
let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function main(){
  if(!bookingMailConfigured())throw new Error('Booking mail transport is not configured');
  do{
    try{const result=await runNotificationBatch();await recordWorkerHeartbeat('notifications',result.failed===0);if(result.failed&&process.argv.includes('--once'))process.exitCode=1;if(result.processed)console.log(JSON.stringify({event:'notifications.batch',processed:result.processed}));}
    catch{await recordWorkerHeartbeat('notifications',false).catch(()=>{});console.error(JSON.stringify({event:'notifications.batch_failed'}));if(process.argv.includes('--once')){process.exitCode=1;break;}}
    if(process.argv.includes('--once'))break;
    if(!stopping)await new Promise(resolve=>setTimeout(resolve,2000));
  }while(!stopping);
}
main().catch(()=>{console.error('Notification worker configuration failed');process.exitCode=1;}).finally(closePool);
