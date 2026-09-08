import {recordWorkerHeartbeat} from '../src/lib/worker-health';
import {pool,closePool} from '../src/lib/db';
import {processTenantPaymentEvents,reconcileTenantCheckouts} from '../src/lib/payment-events';
import {makeCommerceConfig} from '../src/lib/makecommerce';
import {runTenantAutopay} from '../src/lib/payment-autopay';
let stopping=false,cursor='00000000-0000-0000-0000-000000000000';
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function main(){
 makeCommerceConfig();
 do{
  let cycleOk=true;
  try{
   const tenants=(await pool().query('SELECT id FROM tenants WHERE id>$1 ORDER BY id LIMIT 100',[cursor])).rows;
   for(const tenant of tenants){if(stopping)break;try{await runTenantAutopay(tenant.id);await reconcileTenantCheckouts(tenant.id);const result=await processTenantPaymentEvents(tenant.id);if(result.processed)console.log(JSON.stringify({event:'payments.processed',count:result.processed}));}catch{cycleOk=false;console.error(JSON.stringify({event:'payments.tenant_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}}
   cursor=tenants.length===100?tenants.at(-1).id:'00000000-0000-0000-0000-000000000000';
  }catch{cycleOk=false;console.error(JSON.stringify({event:'payments.batch_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}
  await recordWorkerHeartbeat('payments',cycleOk);
  if(process.argv.includes('--once'))break;
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,2000));
 }while(!stopping);
}
main().catch(()=>{console.error('Payment worker configuration failed');process.exitCode=1;}).finally(closePool);
