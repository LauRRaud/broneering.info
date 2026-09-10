async (page) => {
 const engine='__ENGINE__',directory='output/playwright/acceptance-g03',results=[];
 for(const role of ['owner','receptionist','staff','platform']){
  await page.context().setStorageState(`${directory}/${role}-state.json`);
  await page.goto('http://haldus.localhost:3108');
  await page.getByRole('heading',{name:role==='platform'?'Platvorm':'G03 ettevõte A',exact:true}).waitFor();
  if(role!=='platform'){
   await page.getByRole('textbox',{name:'Kuupäev',exact:true}).fill('__DAY__');
   await page.getByRole('list',{name:'Broneeringute loend'}).getByRole('button').first().waitFor();
  }
  for(const locale of ['et','en','ru']){
   await page.locator('select').first().selectOption(locale);
   await page.waitForFunction(language=>document.documentElement.lang===language,locale);
   for(const viewport of [{width:320,height:700},{width:844,height:390},{width:1280,height:900}]){
    await page.setViewportSize(viewport);
    const evidence=await page.evaluate(()=>{
     const controls=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')];
     const unnamed=controls.filter(element=>!element.labels?.length&&!element.getAttribute('aria-label')&&!element.getAttribute('aria-labelledby')).map(element=>element.outerHTML.slice(0,180));
     const identifiers=[...document.querySelectorAll('[id]')].map(element=>element.id);
     return {width:document.documentElement.scrollWidth,viewport:innerWidth,controls:controls.length,unnamed,duplicates:identifiers.filter((id,index)=>identifiers.indexOf(id)!==index)};
    });
    if(evidence.width>viewport.width+1||evidence.unnamed.length||evidence.duplicates.length)throw Error(JSON.stringify({role,locale,viewport,evidence}));
    results.push({role,locale,viewport,evidence,pass:true});
   }
  }
  await page.setViewportSize({width:320,height:700});
  await page.screenshot({path:`${directory}/${engine}-${role}-russian-320.png`});
 }
 await page.context().setStorageState({cookies:[],origins:[]});
 for(const locale of ['et','en','ru']){
  await page.goto('__PUBLIC_URL__/');
  await page.waitForFunction(()=>document.activeElement.id==='booking-title');
  await page.locator('select').first().selectOption(locale);
  await page.waitForFunction(language=>document.documentElement.lang===language,locale);
  for(const viewport of [{width:320,height:700},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   const width=await page.evaluate(()=>document.documentElement.scrollWidth);
   if(width>viewport.width+1)throw Error(`Public ${locale} overflow ${width}`);
   results.push({role:'public',locale,viewport,width,pass:true});
  }
 }
 return {engine,version:page.context().browser().version(),results,pass:true};
}
