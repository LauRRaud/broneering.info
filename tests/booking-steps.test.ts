// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import BookingFlow from '../src/components/booking-flow';
import type {Catalog,Offer} from '../src/lib/contracts';

const offer:Offer={serviceId:'cut',staffId:'anna',staffName:'Anna',start:'2026-09-15T10:00:00Z',end:'2026-09-15T10:30:00Z',price:2500,duration:30};
const catalog:Catalog={tenant:{name:'Salong',slug:'salong',address:'Tallinn',timezone:'Europe/Tallinn',description:'Ettevõtte pikk tutvustus',bookingTerms:'Tingimused enne kinnitamist',cancellationHours:24,rulesVersion:1,demo:true},services:[{id:'cut',name:'Lõikus',description:'Teenuse pikk kirjeldus',category:'Juuksed',priceFrom:2500,durationFrom:30},{id:'massage',name:'Massaaž',description:'',category:'Heaolu',priceFrom:4500,durationFrom:60},{id:'other',name:'Muu teenus',description:'',category:'',priceFrom:1000,durationFrom:15}],staff:[{id:'anna',name:'Anna',title:'',serviceIds:['cut','massage','other']},{id:'mari',name:'Mari',title:'',serviceIds:['cut']}],today:'2026-09-15',maxDate:'2026-10-15'};
let root:Root;let container:HTMLDivElement;
async function render(value=catalog){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 vi.stubGlobal('fetch',vi.fn(async(input:string|URL|Request)=>Response.json(String(input).includes('month=1')?{days:{}}:{offers:[offer]})));
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 await act(async()=>root.render(createElement(BookingFlow,{catalog:value})));
}
const button=(name:string)=>[...container.querySelectorAll('button')].find(item=>(item.getAttribute('aria-label')??item.textContent)===name)!;
const click=async(name:string)=>act(async()=>button(name).click());
const title=()=>container.querySelector('#booking-title')?.textContent;
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();vi.unstubAllGlobals();});

it('shows one choice step at a time and retains contacts and choices when going back',async()=>{
 await render();
 expect(title()).toBe('Vali kategooria');
 expect(container.querySelector('[aria-label="Teenused"]')).toBeNull();
 expect(container.querySelector('header details')).toBeNull();
 await click('Juuksed');
 expect(title()).toBe('Vali teenus');
 expect(container.querySelector('[aria-label="Teenusegrupid"]')).toBeNull();
 expect(button('Massaaž')).toBeUndefined();
 expect(container.querySelector('[aria-label="Teenused"]')?.textContent).not.toContain('Teenuse pikk kirjeldus');
 await click('Teenuse lisainfo: Lõikus');
 expect(container.querySelector('dialog[open]')?.textContent).toContain('Teenuse pikk kirjeldus');
 await click('Sulge');
 await click('Lõikus');
 expect(title()).toBe('Vali spetsialist');
 expect(container.querySelector('[aria-label="Teenused"]')).toBeNull();
 await click('Anna');
 expect(title()).toBe('Vali aeg');
 expect(container.querySelector('[aria-label="Töötajad"]')).toBeNull();
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] [role="tabpanel"] button')!.click());
 expect(title()).toBe('Kinnita broneering');
 expect(container.querySelector('[aria-label="Vabad ajad"]')).toBeNull();
 expect([...container.querySelectorAll('#booking-form dialog')].some(dialog=>dialog.textContent?.includes('Tingimused enne kinnitamist'))).toBe(true);
 await act(async()=>{const input=container.querySelector<HTMLInputElement>('#name')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Test Kasutaja');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Tagasi');
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] [role="tabpanel"] button')!.click());
 expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('Test Kasutaja');
 await click('Tagasi');await click('Tagasi');
 expect(button('Anna').getAttribute('aria-pressed')).toBe('true');
 await click('Tagasi');
 expect(button('Lõikus').getAttribute('aria-pressed')).toBe('true');
 await click('Tagasi');
 expect(button('Juuksed').getAttribute('aria-pressed')).toBe('true');
 await click('Heaolu');
 expect(button('Lõikus')).toBeUndefined();
 await click('Massaaž');
 expect(title()).toBe('Vali spetsialist');
 await click('Anna');
 expect(title()).toBe('Vali aeg');
 await click('Tagasi');
 expect(title()).toBe('Vali spetsialist');
 await click('Tagasi');
 expect(title()).toBe('Vali teenus');
});

it('opens completed booking steps from the progress menu without losing later choices',async()=>{
 await render();
 expect(button('Mine sammu „Teenus”')).toBeUndefined();
 await click('Juuksed');await click('Lõikus');await click('Anna');
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] [role="tabpanel"] button')!.click());
 expect(title()).toBe('Kinnita broneering');
 expect(button('Mine sammu „Teenusegrupp”')).toBeDefined();
 expect(button('Mine sammu „Teenus”')).toBeDefined();
 expect(button('Mine sammu „Töötaja”')).toBeDefined();
 expect(button('Mine sammu „Aeg”')).toBeDefined();
 await click('Mine sammu „Teenusegrupp”');
 expect(title()).toBe('Vali kategooria');
 expect(button('Juuksed').getAttribute('aria-pressed')).toBe('true');
 await click('Mine sammu „Sinu andmed”');
 expect(title()).toBe('Kinnita broneering');
});

it('handles uncategorized services without showing every other category',async()=>{
 await render();await click('Muud teenused');
 expect(button('Muu teenus')).toBeDefined();
 expect(button('Lõikus')).toBeUndefined();
 expect(button('Massaaž')).toBeUndefined();
});

it('keeps the month grid and day offers together and refreshes offers only when a day is selected',async()=>{
 await render();await click('Heaolu');await click('Massaaž');await click('Anna');
 expect(title()).toBe('Vali aeg');expect(container.querySelector('[role="grid"]')).not.toBeNull();
 const dates=()=>vi.mocked(fetch).mock.calls.map(call=>String(call[0])).filter(url=>url.includes('availability')&&!url.includes('month=1'));
 const before=dates().length;
 await click('Järgmine kuu');expect(dates()).toHaveLength(before);
 expect(container.querySelector('[aria-label="Vabad ajad"]')).not.toBeNull();
 await act(async()=>container.querySelector<HTMLButtonElement>('[data-date="2026-10-01"]')!.click());
 expect(dates().at(-1)).toContain('date=2026-10-01');
 expect(container.querySelector('[data-date="2026-10-01"]')?.getAttribute('aria-pressed')).toBe('true');
 expect(container.querySelector('[aria-label="Valitud päeva ajad"] h3')?.textContent).toContain('1. oktoober');
 expect(title()).toBe('Vali aeg');
});

it('shows worker information only in the worker step and keeps it separate from selection',async()=>{
 await render({...catalog,staff:[{...catalog.staff[0],publicPhone:'+372 5555 0101'},catalog.staff[1]]});
 expect(container.querySelector('[aria-label^="Töötaja "][aria-expanded]')).toBeNull();
 await click('Juuksed');expect(container.querySelector('[aria-label^="Töötaja "][aria-expanded]')).toBeNull();
 await click('Lõikus');const toggle=container.querySelector<HTMLButtonElement>('[aria-label="Töötaja Anna telefon"]')!;
 expect(container.querySelector('a[href^="tel:"]')).toBeNull();
 await act(async()=>toggle.click());
 expect(container.querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:+37255550101');
 expect(title()).toBe('Vali spetsialist');expect(button('Anna').getAttribute('aria-pressed')).toBe('false');
});

it('skips a redundant category and staff step for a direct worker link',async()=>{
 await render({...catalog,services:[catalog.services[0]],staff:[catalog.staff[0]],selectedStaffId:'anna'});
 expect(title()).toBe('Vali teenus');
 expect(button('Tagasi')).toBeUndefined();
 await click('Lõikus');expect(title()).toBe('Vali aeg');
 await click('Tagasi');expect(title()).toBe('Vali teenus');
});


it('walks nested categories without splitting slash characters in group names',async()=>{
 const nested={...catalog,services:[
  {...catalog.services[0],category:'Juuksur / Värv / lõikus',categoryPath:['Juuksur','Värv / lõikus']},
  {...catalog.services[1],category:'Juuksur / Soengud',categoryPath:['Juuksur','Soengud']},
  {...catalog.services[2],category:'Pediküür',categoryPath:['Pediküür']},
 ]};
 await render(nested);
 await click('Juuksur');
 expect(title()).toBe('Vali kategooria');
 expect(button('Värv / lõikus')).toBeDefined();
 expect(button('Pediküür')).toBeUndefined();
 await click('Värv / lõikus');
 expect(title()).toBe('Vali teenus');
 expect(button('Lõikus')).toBeDefined();
 expect(button('Massaaž')).toBeUndefined();
 await click('Tagasi');expect(button('Soengud')).toBeDefined();
 await click('Tagasi');expect(button('Pediküür')).toBeDefined();
});

it('keeps direct services reachable alongside subgroups and skips a sole top-level group',async()=>{
 await render({...catalog,services:[
  {...catalog.services[0],categoryPath:['Juuksur']},
  {...catalog.services[1],categoryPath:['Juuksur','Soengud']},
 ]});
 expect(title()).toBe('Vali kategooria');
 expect(button('Juuksur')).toBeUndefined();
 expect(button('Lõikus')).toBeDefined();
 expect(button('Soengud')).toBeDefined();
 await click('Lõikus');await click('Tagasi');await click('Tagasi');
 expect(title()).toBe('Vali kategooria');expect(button('Soengud')).toBeDefined();
});
