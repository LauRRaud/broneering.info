/* broneering.info widget v1. Layout-only messages; links remain usable without this script. */
(() => {
  'use strict';
  if(window.__broneeringWidgetV1)return;
  window.__broneeringWidgetV1=true;
  const script=document.currentScript;
  /* LANGUAGES_START */
  const languages={"et":{"Broneerimisvaate laadimine…":"Broneerimisvaate laadimine…","Manustatud vaadet ei õnnestunud avada. Kasuta broneerimislehe linki.":"Manustatud vaadet ei õnnestunud avada. Kasuta broneerimislehe linki.","Broneeri aeg":"Broneeri aeg","Sulge":"Sulge","Ava eraldi broneerimisleht":"Ava eraldi broneerimisleht","Aja broneerimine":"Aja broneerimine","Manustatud vaadet ei õnnestunud avada. Ava eraldi broneerimisleht.":"Manustatud vaadet ei õnnestunud avada. Ava eraldi broneerimisleht."},"en":{"Broneerimisvaate laadimine…":"Loading booking form…","Manustatud vaadet ei õnnestunud avada. Kasuta broneerimislehe linki.":"Could not open the embedded view. Use the booking page link.","Broneeri aeg":"Book an appointment","Sulge":"Close","Ava eraldi broneerimisleht":"Open booking page separately","Aja broneerimine":"Book an appointment","Manustatud vaadet ei õnnestunud avada. Ava eraldi broneerimisleht.":"Could not open the embedded view. Open the booking page separately."},"ru":{"Broneerimisvaate laadimine…":"Загружаем форму записи…","Manustatud vaadet ei õnnestunud avada. Kasuta broneerimislehe linki.":"Не удалось открыть встроенную форму. Используйте ссылку на страницу записи.","Broneeri aeg":"Записаться на приём","Sulge":"Закрыть","Ava eraldi broneerimisleht":"Открыть страницу записи отдельно","Aja broneerimine":"Запись на приём","Manustatud vaadet ei õnnestunud avada. Ava eraldi broneerimisleht.":"Не удалось открыть встроенную форму. Откройте страницу записи отдельно."}};
  /* LANGUAGES_END */
  const language=element=>{const code=(element?.dataset?.bookingLanguage||document.documentElement?.lang||'et').toLowerCase().split('-')[0];return ['et','en','ru'].includes(code)?code:'et';};
  const translate=(locale,text)=>languages[locale]?.[text]||text;
  const local=host=>host==='localhost'||host==='127.0.0.1'||host.endsWith('.localhost');
  const development=script && local(new URL(script.src,location.href).hostname);
  function bookingUrl(value) {
    try {
      const url=new URL(value,location.href);
      const platform=/^[a-z0-9][a-z0-9-]*\.broneering\.info$/.test(url.hostname) && !['haldus','app','api','admin','cdn','www','mail'].includes(url.hostname.split('.')[0]);
      if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
      if(url.protocol==='https:'&&platform)return url;
      return development&&local(url.hostname)&&['http:','https:'].includes(url.protocol)?url:null;
    }catch{return null;}
  }
  function channel(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
  function connect(frame,url,onReady,onFailure,onClose=()=>{}) {
    const id=channel();let stopped=false;let ready=false;let attempts=0;let timer;
    const receive=event=>{
      const data=event.data;
      if(event.source!==frame.contentWindow||event.origin!==url.origin||!data||typeof data!=='object'||Array.isArray(data))return;
      const keys=Object.keys(data);
      if(data.type==='broneering:close'){
        if(ready&&keys.length===3&&keys.every(k=>['type','version','channel'].includes(k))&&data.version===1&&data.channel===id)onClose();
        return;
      }
      if(keys.length!==4||!keys.every(k=>['type','version','channel','height'].includes(k))||data.version!==1||data.channel!==id||
        !['broneering:ready','broneering:resize'].includes(data.type)||!Number.isInteger(data.height)||data.height<100||data.height>20000)return;
      if(data.type==='broneering:ready'){ready=true;clearInterval(timer);onReady();}
      if(ready)frame.height=String(data.height);
    };
    const init=()=>{
      if(stopped)return;
      frame.contentWindow?.postMessage({type:'broneering:init',version:1,channel:id},url.origin);
    };
    const load=()=>{ready=false;attempts=0;clearInterval(timer);init();timer=setInterval(()=>{
      if(ready){clearInterval(timer);return;}
      if(++attempts>=32){clearInterval(timer);onFailure();return;}
      init();
    },250);};
    window.addEventListener('message',receive);frame.addEventListener('load',load);load();
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('message',receive);frame.removeEventListener('load',load);};
  }
  function bindInline(frame) {
    if(frame.dataset.bookingBound)return;
    try {
      const embed=new URL(frame.src,location.href);
      const root=bookingUrl(`${embed.origin}/`);
      if(!root||embed.pathname!=='/embed'||embed.searchParams.get('parent')!==location.origin)return;
      frame.dataset.bookingBound='true';
      const t=text=>translate(language(frame),text);
      const status=document.createElement('p');status.setAttribute('role','status');status.textContent=t('Broneerimisvaate laadimine…');
      frame.after(status);
      connect(frame,root,()=>{status.textContent='';},()=>{status.textContent=t('Manustatud vaadet ei õnnestunud avada. Kasuta broneerimislehe linki.');});
    }catch{/* Ordinary iframe and fallback link still work. */}
  }
  let activeDialog=null;
  const dialogs=new WeakMap();
  function openModal(anchor,url) {
    if(typeof HTMLDialogElement==='undefined'||typeof HTMLDialogElement.prototype.showModal!=='function')return false;
    if(activeDialog)activeDialog.close();
    const cached=dialogs.get(anchor);
    if(cached){cached.showModal();activeDialog=cached;document.documentElement.style.overflow='hidden';cached.querySelector('button').focus();return true;}
    const locale=language(anchor),t=text=>translate(locale,text);
    const dialog=document.createElement('dialog');
    dialog.lang=locale;
    const title=document.createElement('h2');title.textContent=t('Broneeri aeg');title.id=`booking-${channel()}`;
    dialog.setAttribute('aria-labelledby',title.id);
    // Only functional sizing: the application's visual design is intentionally deferred.
    Object.assign(dialog.style,{width:'min(56rem, 96vw)',maxWidth:'96vw',maxHeight:'96dvh',padding:'1rem',boxSizing:'border-box'});
    const close=document.createElement('button');close.type='button';close.textContent=t('Sulge');close.autofocus=true;
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent=t('Broneerimisvaate laadimine…');
    const fallback=document.createElement('a');fallback.href=url.href;fallback.textContent=t('Ava eraldi broneerimisleht');
    const frame=document.createElement('iframe');frame.title=t('Aja broneerimine');frame.width='100%';frame.height='700';frame.referrerPolicy='no-referrer';
    const embed=new URL('/embed',url);embed.searchParams.set('parent',location.origin);embed.searchParams.set('lang',locale);frame.src=embed.href;
    dialog.append(title,close,status,fallback,frame);
    let disconnect=()=>{};const oldOverflow=document.documentElement.style.overflow;
    const cleanup=()=>{if(activeDialog===dialog){document.documentElement.style.overflow=oldOverflow;activeDialog=null;anchor.focus();}};
    close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',cleanup);
    // Native Escape handles the parent; the embedded frame sends a validated close message.
    try {
      if(activeDialog)activeDialog.close();
      document.body.append(dialog);dialog.showModal();activeDialog=dialog;dialogs.set(anchor,dialog);
      document.documentElement.style.overflow='hidden';close.focus();
      disconnect=connect(frame,url,()=>{status.textContent='';},()=>{status.textContent=t('Manustatud vaadet ei õnnestunud avada. Ava eraldi broneerimisleht.');frame.hidden=true;},()=>dialog.close());
      return true;
    }catch{disconnect();dialog.remove();document.documentElement.style.overflow=oldOverflow;activeDialog=null;return false;}
  }
  function start() {
    document.querySelectorAll('iframe[data-booking-frame]').forEach(bindInline);
    document.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=event.target instanceof Element?event.target.closest('a[data-booking-modal]'):null;
      if(!anchor||anchor.hasAttribute('download')||anchor.target==='_blank')return;
      const url=bookingUrl(anchor.href);if(!url)return;
      try {if(openModal(anchor,url))event.preventDefault();}catch{/* Keep the original link navigation. */}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
