async (page) => {
 const engine='__ENGINE__',results=[];
 if(!['chrome','firefox'].includes(engine))throw Error('Cookie restriction proof requires Chrome CDP or Firefox cookieBehavior=1; WebKit Windows is not Safari privacy testing');
 const ensure=(condition,message)=>{if(!condition)throw Error(message);results.push({check:message,pass:true});};
 await page.context().setStorageState({cookies:[],origins:[]});
 await page.goto('__PUBLIC_URL__/');
 if(engine==='chrome'){
  const session=await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCookieControls',{enableThirdPartyCookieRestriction:true});
 }
 await page.evaluate(()=>{document.cookie='g03_cookie_probe=present; Path=/; SameSite=None; Secure';});
 const planted=await page.evaluate(()=>document.cookie.includes('g03_cookie_probe=present'));
 ensure(planted,'Probe cookie available as first party');
 await page.goto('http://127.0.0.1:3110/inline');
 await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='');
 const frame=page.frames().find(frame=>frame.url().includes('/embed?'));
 if(engine==='chrome'){
  const session=await page.context().newCDPSession(frame);
  await session.send('Network.enable');
  await session.send('Network.setCookieControls',{enableThirdPartyCookieRestriction:true});
  await frame.goto(frame.url());
  await frame.waitForFunction(()=>document.activeElement.id==='booking-title');
 }
 ensure(!await frame.evaluate(()=>document.cookie.includes('g03_cookie_probe=present')),'SameSite=None probe cookie blocked in third-party iframe');
 await frame.getByRole('button',{name:'G03 lõikus',exact:true}).click();
 await frame.getByRole('button',{name:'Töötaja pole oluline',exact:true}).click();
 await frame.getByRole('textbox',{name:'Valitud kuupäev',exact:true}).fill('__DAY__');
 await frame.getByRole('list',{name:'Vabad ajad',exact:true}).getByRole('button').last().click();
 await frame.waitForFunction(()=>document.activeElement.id==='booking-title'&&document.activeElement.textContent==='Veel mõned andmed.');
 await frame.getByRole('textbox',{name:'Teenuse saaja nimi *',exact:true}).fill(`G03 ${engine} Cookies`);
 await frame.getByRole('textbox',{name:'Kontaktisiku e-post *',exact:true}).fill(`g03-cookies-${engine}@example.invalid`);
 const pending=page.waitForResponse(response=>response.url().endsWith('/api/bookings')&&response.request().method()==='POST');
 await frame.getByRole('button',{name:'Kinnita broneering',exact:true}).click();
 const response=await pending;
 ensure(response.status()===201,'Cookie-restricted iframe commits real booking');
 const sentCookie=(await response.request().allHeaders()).cookie??'';
 ensure(!sentCookie.includes('g03_cookie_probe'),'Cookie-restricted booking request excludes the probe cookie');
 await frame.getByRole('heading',{name:'Kohtumiseni, G03.',exact:true}).waitFor();
 await page.screenshot({path:`output/playwright/acceptance-g03/${engine}-cookie-restricted.png`,fullPage:true});
 return {engine,version:page.context().browser().version(),results,pass:true};
}
