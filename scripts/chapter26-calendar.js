async (page) => {
 const tenant=__TENANT__,day='__DAY__',phase='__PHASE__',directory='output/chapter26';
 const checks=[],measurements=[],polls=[];
 const ensure=(condition,check)=>{if(!condition)throw Error(check);checks.push({check,pass:true});};
 await page.context().setStorageState(`${directory}/receptionist-state.json`);
 await page.goto('https://haldus.localhost:3443');
 await page.getByRole('heading',{name:tenant.name,exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Kuupäev',exact:true}).fill(day);
 await page.getByRole('list',{name:'Broneeringute loend'}).getByRole('button').first().waitFor();
 await page.bringToFront();
 ensure(await page.evaluate(()=>document.visibilityState)==='visible','Observer calendar is genuinely visible');
 const writer=await page.context().browser().newContext({storageState:`${directory}/owner-state.json`,ignoreHTTPSErrors:true});
 const root='https://haldus.localhost:3443';
 page.on('response',response=>{if(response.url().includes('/api/admin/bookings?')&&response.url().includes('view=list'))polls.push({at:Date.now(),status:response.status()});});
 const rows=page.getByRole('list',{name:'Broneeringute loend'});
 const available=async bookingId=>{
  const params={view:'offers',tenantId:tenant.id,serviceId:tenant.services[0],staffId:tenant.staff[0],day,...(bookingId?{bookingId}:{})};
  const query=Object.entries(params).map(([key,value])=>encodeURIComponent(key)+'='+encodeURIComponent(value)).join('&');
  const response=await writer.request.get(`${root}/api/admin/bookings?${query}`);
  ensure(response.status()===200,'Writer reads real authorized offers');return response.json();
 };
 const mutate=async(action,payload,visible)=>{
  ensure(await page.evaluate(()=>document.visibilityState)==='visible','Observer remained active before '+action);
  const startedAt=Date.now(),key=await page.evaluate(()=>crypto.randomUUID());
  const response=await writer.request.post(`${root}/api/admin/bookings`,{headers:{Origin:root,'Idempotency-Key':key},data:payload});
  const acknowledgedAt=Date.now(),reply=await response.json();
  ensure(response.status()===200,`${action}: actual owner POST succeeded (${response.status()})`);
  await visible(reply);
  const visibleAt=Date.now();
  const measurement={action,bookingId:reply.id,version:reply.version,startedAt,acknowledgedAt,visibleAt,
   writeRequestMs:acknowledgedAt-startedAt,fromAcknowledgementMs:visibleAt-acknowledgedAt,
   fromRequestStartUpperBoundMs:visibleAt-startedAt,active:await page.evaluate(()=>document.visibilityState)==='visible'};
  measurements.push(measurement);
  ensure(measurement.active&&measurement.fromRequestStartUpperBoundMs<=10000,`${action}: visible within 10 seconds, including write and tunnel latency`);
  return reply;
 };
 try{
  for(let i=0;i<5;i++){
   const name=`P26 ${phase} calendar ${i}`;
   const offers=await available(),offer=offers.offers[i%2];
   ensure(Boolean(offer),'Creation offer exists');
   const input=o=>({serviceId:o.serviceId,staffId:o.staffId,start:o.start,expectedPrice:o.price,expectedDuration:o.duration,expectedRulesVersion:offers.rulesVersion});
   const row=rows.getByRole('button').filter({hasText:name});
   const created=await mutate('create',{action:'manual-create',tenantId:tenant.id,...input(offer),name,email:null,sendEmail:false},()=>row.waitFor({state:'visible',timeout:10000}));
   const next=await available(created.id),newOffer=next.offers.find(o=>o.start!==created.start);
   ensure(Boolean(newOffer),'A distinct reschedule offer exists');
   const moved=await mutate('reschedule',{action:'reschedule',tenantId:tenant.id,bookingId:created.id,version:created.version,...input(newOffer),expectedRulesVersion:next.rulesVersion,reason:'P26 measured calendar change'},async reply=>{
    const time=await page.evaluate(start=>new Intl.DateTimeFormat('et-EE',{timeStyle:'short',timeZone:'Europe/Tallinn'}).format(new Date(start)),reply.start);
    await rows.getByRole('button').filter({hasText:name}).filter({hasText:time}).waitFor({state:'visible',timeout:10000});
   });
   await mutate('cancel',{action:'cancel',tenantId:tenant.id,bookingId:moved.id,version:moved.version,reason:'P26 measured calendar cancellation'},()=>rows.getByRole('button').filter({hasText:name}).filter({hasText:'Tühistatud'}).waitFor({state:'visible',timeout:10000}));
  }
  ensure(polls.length>=10&&polls.every(poll=>poll.status===200),'Periodic real calendar reads succeeded without manual refresh');
  await page.screenshot({path:`${directory}/calendar-${phase}.png`});
  return {phase,at:new Date().toISOString(),browser:page.context().browser().version(),environment:'Same VPS isolated production image via TLS and SSH tunnel',measurements,polls,checks,pass:true};
 }finally{await writer.close();}
}
