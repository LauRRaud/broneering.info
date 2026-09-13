// Playwright browser callback. Replace __BOOKING_URL__ with an Ilutegu demo URL.
// Run against `next start` or the deployed build, not only `next dev`.
async (page) => {
  const p=await page.context().newPage(),results=[],errors=[];
  p.on('pageerror',error=>errors.push(error.message));
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const settle=async()=>{
    await p.mouse.move(0,0);
    await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});
  };
  const appearance=async locator=>locator.evaluate(element=>{
    const css=getComputedStyle(element),probe=document.createElement('span');
    probe.style.color='var(--icons)';element.parentElement.append(probe);
    const iconColor=getComputedStyle(probe).color;probe.remove();
    return {border:parseFloat(css.borderTopWidth)>0&&css.borderTopStyle!=='none'&&css.borderTopColor!=='rgba(0, 0, 0, 0)',background:css.backgroundColor,color:css.color,decoration:css.textDecorationLine,font:css.fontFamily,iconColor};
  });
  const borderless=async(locator,label)=>{
    const css=await appearance(locator);assert(!css.border,`${label}: unexpected border ${JSON.stringify(css)}`);results.push(label);
    return css;
  };
  try{
    await p.setViewportSize({width:1536,height:694});
    await p.goto('__BOOKING_URL__',{waitUntil:'networkidle'});
    await p.locator('header button[aria-haspopup="menu"]').first().click();
    await p.getByRole('menuitemradio',{name:'Eesti',exact:true}).click();
    // Reappend primitive rules after every feature stylesheet to expose order dependencies.
    const injected=await p.getByRole('button',{name:'Ripsmed',exact:true}).evaluate(button=>{
      const prefix=button.classList[0].replace(/root$/,'');
      const collect=rules=>[...rules].flatMap(rule=>rule.selectorText?.includes(prefix)?[rule.cssText]:rule.cssRules?collect(rule.cssRules):[]);
      const css=[...document.styleSheets].flatMap(sheet=>collect(sheet.cssRules));
      const style=document.createElement('style');style.textContent=css.join('\n');document.head.append(style);
      return css.length;
    });
    assert(injected>0,'Button defaults were not found in the built CSS');
    await p.getByRole('button',{name:'Ripsmed',exact:true}).click();
    await settle();
    const serviceName='Klassikaliste ripsmete paigaldus';
    const service=p.getByRole('button',{name:serviceName,exact:true});
    await borderless(service,'Unselected service');
    await borderless(p.getByRole('button',{name:'Teenuse lisainfo: '+serviceName,exact:true}),'Service info');
    await service.click();await settle();
    await borderless(p.getByRole('button',{name:'Töötaja Anette info',exact:true}),'Staff info');
    await borderless(p.getByRole('button',{name:'Ettevõtte telefon',exact:true}),'Staff phone');
    await p.getByRole('button',{name:'Mine sammu „Teenus”',exact:true}).click();await settle();
    for(const hovered of [false,true]){
      if(hovered)await service.hover();
      const selected=await appearance(service),other=await appearance(p.getByRole('button',{name:'Hübriidripsmete hooldus',exact:true}));
      assert(selected.color===other.color&&selected.decoration==='none'&&selected.background==='rgba(0, 0, 0, 0)',`Selected service changes contrast on hover=${hovered}: ${JSON.stringify(selected)}`);
      results.push(`Selected service hover=${hovered}`);
    }
    await service.click();await p.getByRole('button',{name:'Anette',exact:true}).click();await settle();
    const date=await p.locator('[data-date]').evaluateAll(days=>days.find(day=>!day.disabled&&day.getAttribute('aria-current')!=='date'&&day.getAttribute('aria-pressed')!=='true'&&!day.className.includes('__empty'))?.getAttribute('data-date'));
    assert(date,'No available date for the demo flow');
    await borderless(p.locator(`[data-date="${date}"]`),'Unselected calendar date');
    for(const button of await p.getByRole('navigation',{name:'Broneerimise edenemine'}).getByRole('button').all())await borderless(button,'Progress control');
    await p.locator(`[data-date="${date}"]`).click();
    await p.locator('[role="tabpanel"] button').first().click();await settle();
    const policy=p.getByRole('button',{name:'Muutmine ja tühistamine',exact:true});
    const info=await borderless(policy,'Booking info');assert(info.color===info.iconColor,'Booking info lost its icon color');
    await borderless(p.getByRole('button',{name:'broneerimistingimustega',exact:true}),'Booking terms link');
    const confirm=await appearance(p.getByRole('button',{name:'Kinnita broneering',exact:true}));
    const input=await appearance(p.locator('#phone'));assert(confirm.font===input.font,'Confirmation button lost the body font');results.push('Confirmation font');
    await policy.hover();
    assert(await policy.evaluate(element=>getComputedStyle(element,'::before').borderTopColor!=='rgba(0, 0, 0, 0)'),'Info hover ring disappeared');results.push('Info hover ring');
    await p.keyboard.press('Tab');await policy.focus();
    const focus=await policy.evaluate(element=>({visible:element.matches(':focus-visible'),width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle}));
    assert(focus.visible&&parseFloat(focus.width)>0&&focus.style!=='none',`Keyboard focus indicator disappeared: ${JSON.stringify(focus)}`);results.push('Keyboard focus');
    assert(errors.length===0,JSON.stringify(errors));
    return {pass:true,injectedPrimitiveRules:injected,results};
  }finally{await p.close();}
}
