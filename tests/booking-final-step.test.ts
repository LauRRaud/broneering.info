// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import BookingFlow from '../src/components/booking-flow';
import {canRequestReminder} from '../src/components/booking/booking-reminder';
import type {Catalog,Offer} from '../src/lib/contracts';
let root:Root,container:HTMLDivElement;
const offer:Offer={serviceId:'service',staffId:'staff',staffName:'Mari',start:'2026-09-19T09:00:00Z',end:'2026-09-19T09:30:00Z',price:2500,duration:30};
const catalog:Catalog={tenant:{name:'Salong',slug:'salong',address:'Tallinn',timezone:'Europe/Tallinn',description:'',bookingTerms:'Salongi tingimused\nTeine rida',cancellationHours:24,rulesVersion:1,demo:true,reminderMinutes:1440},services:[{id:'service',name:'Teenus',description:'',category:'',priceFrom:2500,durationFrom:30}],staff:[{id:'staff',name:'Mari',title:'',serviceIds:['service']}],today:'2026-09-12',maxDate:'2026-10-12'};
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function render(){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-09-12T10:00:00Z'));
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(init?.method==='POST')throw new TypeError('Response lost');
  return Response.json(String(input).includes('month=1')?{days:{}}:{offers:[offer]});
 }));
 // jsdom lacks native dialog behaviour; focus trapping/Escape are checked in a real browser.
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 await act(async()=>root.render(createElement(BookingFlow,{catalog})));
 await act(async()=>[...container.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')==='Teenus')!.click());
 await act(async()=>[...container.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')==='Mari')!.click());
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] [role="tabpanel"] button')!.click());
 for(const [id,value] of [['name','Test Customer'],['email','client@example.invalid']])await act(async()=>{
  const input=container.querySelector<HTMLInputElement>('#'+id)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));
 });
}
it('opens company terms without submitting or losing input and sends reminder opt-in in an immutable retry',async()=>{
 await render();
 const checkbox=container.querySelector<HTMLInputElement>('[name="emailReminder"]')!;
 expect(checkbox.checked).toBe(false);
 await act(async()=>checkbox.click());
 const link=[...container.querySelectorAll<HTMLButtonElement>('#booking-form [aria-haspopup="dialog"]')].find(button=>button.textContent==='broneerimistingimustega')!,dialog=document.getElementById(link.getAttribute('aria-controls')!) as HTMLDialogElement;
 expect(dialog.open).toBe(false);await act(async()=>link.click());expect(dialog.open).toBe(true);
 expect(dialog.textContent).toContain('Salongi tingimused');expect(dialog.textContent).toContain('Salong');
 expect(vi.mocked(fetch).mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
 await act(async()=>dialog.querySelector('button')!.click());
 expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('Test Customer');expect(checkbox.checked).toBe(true);
 const submit=async()=>act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await submit();expect(checkbox.disabled).toBe(true);await submit();
 const requests=vi.mocked(fetch).mock.calls.filter(call=>call[1]?.method==='POST');
 expect(requests).toHaveLength(2);expect(requests[0][1]?.body).toBe(requests[1][1]?.body);
 expect(JSON.parse(String(requests[0][1]?.body))).toMatchObject({emailReminder:true,expectedRulesVersion:1});
});
it('omits the untouched phone prefix and sends an explicit reminder opt-out',async()=>{
 await render();
 expect(container.querySelector<HTMLInputElement>('#phone')!.value).toBe('+372 ');
 expect(container.querySelector('label[for="phone"]')!.textContent).toBe('Telefoninumber');
 await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 const request=vi.mocked(fetch).mock.calls.find(call=>call[1]?.method==='POST')!;
 expect(JSON.parse(String(request[1]?.body))).toMatchObject({emailReminder:false});
 expect(JSON.parse(String(request[1]?.body))).not.toHaveProperty('phone');
 expect(canRequestReminder('2026-09-12T11:00:00Z',1440)).toBe(false);
 expect(canRequestReminder(offer.start,null)).toBe(false);
});

it('reveals cancellation notice on demand without submitting or losing contact details',async()=>{
 await render();
 const trigger=container.querySelector<HTMLButtonElement>('button[aria-label="Muutmine ja tühistamine"]')!;
 const dialog=document.getElementById(trigger.getAttribute('aria-controls')!) as HTMLDialogElement;
 expect(container.textContent).not.toContain('Kinnitatud broneeringu muutmisest');
 await act(async()=>trigger.click());
 expect(dialog.open).toBe(true);
 expect(dialog.textContent).toContain('vähemalt 24 tundi ette.');
 expect(dialog.textContent).toContain('Kinnitatud broneeringu muutmisest või tühistamisest');
 expect(dialog.textContent).toContain('Enne broneeringu kinnitamist saad oma valikuid vabalt muuta.');
 expect(vi.mocked(fetch).mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
 await act(async()=>dialog.dispatchEvent(new Event('cancel',{cancelable:true})));
 expect(dialog.open).toBe(false);
 expect(document.activeElement).toBe(trigger);
 expect(container.querySelector<HTMLInputElement>('#name')!.value).toBe('Test Customer');
 expect(container.textContent).not.toContain('Kinnitatud broneeringu muutmisest');
});

it('requires an international phone for the demo SMS choice and preserves it on a retry',async()=>{
 await render();const sms=container.querySelector<HTMLInputElement>('[name="smsReminder"]')!;expect(sms.checked).toBe(false);
 await act(async()=>sms.click());expect(container.querySelector<HTMLInputElement>('#phone')!.required).toBe(true);
 const submit=async()=>act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await submit();expect(vi.mocked(fetch).mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(0);expect(document.activeElement?.id).toBe('phone');
 await act(async()=>{const input=container.querySelector<HTMLInputElement>('#phone')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'+372 5555 0101');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await submit();expect(sms.disabled).toBe(true);await submit();
 const requests=vi.mocked(fetch).mock.calls.filter(call=>call[1]?.method==='POST');expect(requests).toHaveLength(2);expect(requests[0][1]?.body).toBe(requests[1][1]?.body);expect(JSON.parse(String(requests[0][1]?.body))).toMatchObject({smsReminder:true,phone:'+372 5555 0101'});
});
