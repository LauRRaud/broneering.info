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
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({offers:[offer]})));
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 await act(async()=>root.render(createElement(BookingFlow,{catalog:value})));
}
const button=(name:string)=>[...container.querySelectorAll('button')].find(item=>item.textContent===name)!;
const click=async(name:string)=>act(async()=>button(name).click());
const title=()=>container.querySelector('#booking-title')?.textContent;
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();vi.unstubAllGlobals();});

it('shows one choice step at a time and retains contacts and choices when going back',async()=>{
 await render();
 expect(title()).toBe('Vali teenusegrupp');
 expect(container.querySelector('[aria-label="Teenused"]')).toBeNull();
 expect(container.querySelector('header details')?.hasAttribute('open')).toBe(false);
 await click('Juuksed');
 expect(title()).toBe('Vali teenus');
 expect(container.querySelector('[aria-label="Teenusegrupid"]')).toBeNull();
 expect(button('Massaaž')).toBeUndefined();
 expect(container.querySelector('[aria-label="Teenused"] details')?.hasAttribute('open')).toBe(false);
 await click('Lõikus');
 expect(title()).toBe('Vali töötaja');
 expect(container.querySelector('[aria-label="Teenused"]')).toBeNull();
 await click('Anna');
 expect(title()).toBe('Vali aeg');
 expect(container.querySelector('[aria-label="Töötajad"]')).toBeNull();
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] button')!.click());
 expect(title()).toBe('Sinu andmed');
 expect(container.querySelector('[aria-label="Vabad ajad"]')).toBeNull();
 expect(container.querySelector('[aria-label="Broneerimistingimused"]')?.textContent).toContain('Tingimused enne kinnitamist');
 await act(async()=>{const input=container.querySelector<HTMLInputElement>('#name')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Test Kasutaja');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Tagasi');
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] button')!.click());
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
 expect(title()).toBe('Vali aeg');
 await click('Tagasi');
 expect(title()).toBe('Vali teenus');
});

it('handles uncategorized services without showing every other category',async()=>{
 await render();await click('Muud teenused');
 expect(button('Muu teenus')).toBeDefined();
 expect(button('Lõikus')).toBeUndefined();
 expect(button('Massaaž')).toBeUndefined();
});

it('skips a redundant category and staff step for a direct worker link',async()=>{
 await render({...catalog,services:[catalog.services[0]],staff:[catalog.staff[0]],selectedStaffId:'anna'});
 expect(title()).toBe('Vali teenus');
 expect(button('Tagasi')).toBeUndefined();
 await click('Lõikus');expect(title()).toBe('Vali aeg');
 await click('Tagasi');expect(title()).toBe('Vali teenus');
});
