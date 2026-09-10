async (page) => {
 const engine='__ENGINE__',directory='output/playwright/acceptance-g03',results=[];
 const ensure=(condition,message)=>{if(!condition)throw Error(message);results.push({check:message,pass:true});};
 await page.context().setStorageState({cookies:[],origins:[]});
 await page.setViewportSize({width:390,height:844});
 await page.goto('__PUBLIC_URL__/');
 await page.waitForFunction(()=>document.activeElement.id==='booking-title');
 await page.getByRole('button',{name:'G03 lõikus',exact:true}).click();
 await page.getByRole('button',{name:'Töötaja pole oluline',exact:true}).click();
 await page.getByRole('textbox',{name:'Valitud kuupäev',exact:true}).fill('__DAY__');
 await page.getByRole('list',{name:'Vabad ajad',exact:true}).getByRole('button').last().click();
 await page.waitForFunction(()=>document.activeElement.id==='booking-title'&&document.activeElement.textContent==='Veel mõned andmed.');
 await page.getByRole('textbox',{name:'Teenuse saaja nimi *',exact:true}).fill(`G03 ${engine} Recovery`);
 await page.getByRole('textbox',{name:'Kontaktisiku e-post *',exact:true}).fill(`g03-recovery-${engine}@example.invalid`);
 const keys=[],payloads=[];let attempt=0,created;
 await page.route('**/api/bookings',async route=>{
  keys.push(route.request().headers()['idempotency-key']);payloads.push(route.request().postData());attempt++;
  if(attempt===1){const response=await route.fetch();ensure(response.status()===201,'Lost reply follows real committed HTTP 201');created=await response.json();await route.abort('failed');}
  else if(attempt===2)await route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({code:'RATE_LIMITED',error:'G03 temporary admission limit'})});
  else if(attempt===3)await route.fulfill({status:403,contentType:'text/html',body:'<html>G03 temporary proxy denial</html>'});
  else await route.continue();
 });
 await page.getByRole('button',{name:'Kinnita broneering',exact:true}).click();
 for(let index=0;index<3;index++){
  await page.getByRole('alert').filter({hasText:'Kontrollime kinnituse tulemust.'}).waitFor();
  ensure(await page.getByRole('textbox',{name:'Teenuse saaja nimi *',exact:true}).isDisabled(),'Uncertain creation locks original contact '+index);
  await page.getByRole('button',{name:'Proovi uuesti',exact:true}).click();
 }
 await page.getByRole('heading',{name:'Kohtumiseni, G03.',exact:true}).waitFor();
 ensure(keys.length===4&&new Set(keys).size===1&&new Set(payloads).size===1,'Lost response, JSON 429 and HTML 403 preserve one request');
 ensure(await page.getByText(created.reference,{exact:true}).count()>0,'Recovered creation shows original booking reference');
 await page.unroute('**/api/bookings');
 await page.screenshot({path:`${directory}/${engine}-recovered-creation.png`});
 for(const kind of ['expired','revoked','foreign']){
  const cases={expired:'__EXPIRED_URL__',revoked:'__REVOKED_URL__',foreign:'__FOREIGN_URL__'};
  const pending=page.waitForResponse(response=>response.url().endsWith('/api/booking/manage'));
  await page.goto(cases[kind]);
  const response=await pending;ensure(response.status()===410,kind+' management link returns 410');
  await page.getByRole('alert').filter({hasText:'Link on vigane, aegunud või tühistatud.'}).waitFor();
  ensure(await page.getByRole('complementary',{name:'Ettevõtte kontakt'}).getByRole('link',{name:'g03-contact@example.invalid'}).isVisible(),kind+' link shows contact guidance');
  ensure(await page.getByRole('button',{name:'Tühista broneering',exact:true}).count()===0,kind+' link exposes no mutation controls');
  ensure(!(await response.text()).includes('G03 A klient'),kind+' link exposes no booking contact');
 }
 await page.screenshot({path:`${directory}/${engine}-expired-link.png`});
 await page.goto('http://127.0.0.1:3110/');
 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/embed?**',async route=>{await gate;await route.continue();});
 await page.locator('#opener').click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('status').filter({hasText:'Manustatud vaadet ei õnnestunud avada.'}).waitFor({timeout:20000});
 ensure(await dialog.getByRole('link',{name:'Ava eraldi broneerimisleht',exact:true}).isVisible(),'Delayed iframe preserves fallback link');
 release();
 await page.waitForFunction(()=>document.querySelector('dialog [role=status]').textContent==='');
 ensure(await dialog.locator('iframe').isVisible(),'Late iframe readiness restores the booking frame');
 await page.unroute('**/embed?**');
 await dialog.getByRole('button',{name:'Sulge',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement.id==='opener');
 await page.route('**/widget/v1.js',route=>route.abort('failed'));
 await page.reload();
 await page.locator('#opener').click();
 await page.waitForURL('__PUBLIC_URL__/');
 await page.getByRole('button',{name:'G03 lõikus',exact:true}).waitFor();
 ensure(true,'Blocked widget request preserves ordinary navigation');
 await page.unroute('**/widget/v1.js');
 return {engine,version:page.context().browser().version(),createdBookingId:created.id,results,pass:true};
}
