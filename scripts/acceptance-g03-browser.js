async (page) => {
  const results = [];
  const engine = '__ENGINE__';
  const day = '__DAY__';
  const base = 'http://haldus.localhost:3108';
  const dir = 'output/playwright/acceptance-g03';
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  for (const role of ['staff', 'receptionist', 'owner', 'platform']) {
    await page.context().setStorageState(`${dir}/${role}-state.json`);
    await page.setViewportSize({width:1280,height:900});
    await page.goto(base);
    await page.getByRole('heading', {name:role==='platform'?'Platvorm':'G03 ettevõte A',exact:true}).waitFor();
    await page.keyboard.press('Tab');
    const skipReachable=await page.locator(':focus').innerText()==='Liigu põhisisu juurde';
    let skipLink=false,bookingKeyboard=null;
    if(skipReachable){
      await page.keyboard.press('Enter');
      skipLink=await page.evaluate(()=>document.activeElement.id)==='main-content';
    }
    if(role!=='platform') {
      await page.getByRole('textbox',{name:'Kuupäev',exact:true}).fill(day);
      const list=page.getByRole('list',{name:'Broneeringute loend'});
      await list.getByRole('button').first().waitFor();
      verify(await list.getByRole('button').count()===(role==='staff'?1:2),'Booking scope mismatch');
      verify(await page.getByRole('heading',{name:'Kliendid',exact:true}).count()===(role==='staff'?0:1),'Customer UI role mismatch');
      verify(await page.getByRole('heading',{name:'Liikmed',exact:true}).count()===(role==='owner'?1:0),'Member UI role mismatch');
      // Reach the booking list with actual Tab presses, without injecting focus.
      await page.reload();
      await page.getByRole('textbox',{name:'Kuupäev',exact:true}).fill(day);
      await list.getByRole('button').first().waitFor();
      await page.keyboard.press('Tab');
      let reached=false;
      for(let i=0;i<140;i++) {
        if(await page.evaluate(()=>!!document.activeElement.closest('ul[aria-label="Broneeringute loend"]'))) {reached=true;break;}
        await page.keyboard.press('Tab');
      }
      bookingKeyboard=reached;
      await page.screenshot({path:`${dir}/${engine}-${role}-desktop.png`});
      await page.setViewportSize({width:390,height:844});
      await list.scrollIntoViewIfNeeded();
      verify(await list.getByRole('button').first().isVisible(),'Mobile booking list invisible');
      await page.screenshot({path:`${dir}/${engine}-${role}-mobile.png`});
    } else {
      verify(await page.getByRole('heading',{name:'Broneeringud',exact:true}).count()===0,'Platform must have no member booking view');
      verify(await page.getByRole('heading',{name:'Kliendid',exact:true}).count()===0,'Platform must have no customer view');
      await page.screenshot({path:`${dir}/${engine}-${role}-desktop.png`});
    }
    results.push({role,roleScope:true,pass:skipLink&&bookingKeyboard!==false,skipLink,bookingKeyboard,desktop:'1280x900',mobile:role==='platform'?null:'390x844'});
  }
  return {engine,version:page.context().browser().version(),userAgent:await page.evaluate(()=>navigator.userAgent),results};
}
