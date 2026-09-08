import {recordWorkerHeartbeat} from '../src/lib/worker-health';
import {pool,closePool} from '../src/lib/db';
import {runTenantBilling} from '../src/lib/billing-worker';
import {deliverInvoiceMail,queueInvoiceReminders} from '../src/lib/invoice-mail';
let stopping=false,cursor='00000000-0000-0000-0000-000000000000';
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
async function main(){
 do{
  let cycleOk=true;
  try{
   const tenants=(await pool().query('SELECT id FROM tenants WHERE id>$1 ORDER BY id LIMIT 100',[cursor])).rows;
   for(const tenant of tenants){
    if(stopping)break;
    try{const result=await runTenantBilling(tenant.id);if(result.issued)console.log(JSON.stringify({event:'billing.invoice_issued',count:1}));}
    catch{cycleOk=false;console.error(JSON.stringify({event:'billing.tenant_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}
    try{await queueInvoiceReminders(tenant.id);if(await deliverInvoiceMail(tenant.id)==='failed')cycleOk=false;}
    catch{cycleOk=false;console.error(JSON.stringify({event:'billing.mail_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}
   }
   cursor=tenants.length===100?tenants.at(-1).id:'00000000-0000-0000-0000-000000000000';
  }catch{cycleOk=false;console.error(JSON.stringify({event:'billing.batch_failed'}));if(process.argv.includes('--once'))process.exitCode=1;}
  await recordWorkerHeartbeat('billing',cycleOk);
  if(process.argv.includes('--once')){if(!cycleOk)process.exitCode=1;break;}
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,10000));
 }while(!stopping);
}
main().catch(()=>{process.exitCode=1;}).finally(closePool);
