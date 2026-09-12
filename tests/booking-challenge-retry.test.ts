// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import BookingFlow from '../src/components/booking-flow';
import type {Catalog,Offer} from '../src/lib/contracts';
import {finishScriptLoad,installTurnstileProvider} from './helpers/turnstile-provider';

const offer:Offer={serviceId:'11111111-1111-4111-8111-111111111111',staffId:'22222222-2222-4222-8222-222222222222',staffName:'Test worker',start:'2026-09-15T10:00:00Z',end:'2026-09-15T10:30:00Z',price:2500,duration:30};
const catalog:Catalog={tenant:{name:'Test salon',slug:'test',address:'Test street',timezone:'Europe/Tallinn',description:'',cancellationHours:24,rulesVersion:1,demo:false},services:[{id:offer.serviceId,name:'Test service',description:'',category:'',priceFrom:2500,durationFrom:30}],staff:[{id:offer.staffId,name:offer.staffName,title:'',serviceIds:[offer.serviceId]}],today:'2026-09-15',maxDate:'2026-10-15'};

it('refreshes rejected challenges while retrying the same possibly committed booking',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  installTurnstileProvider();
  const requests:{key:string|null;token:string|null;body:BodyInit|null|undefined}[]=[];
  vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
    if(String(input).includes('/availability'))return Response.json({offers:[offer]});
    if(String(input)!=='/api/bookings')throw new Error(`Unexpected request ${input}`);
    const headers=new Headers(init?.headers);
    requests.push({key:headers.get('idempotency-key'),token:headers.get('cf-turnstile-response'),body:init?.body});
    if(requests.length===1)throw new TypeError('Response lost after commit');
    if(requests.length<4)return Response.json({code:requests.length===2?'CHALLENGE_REJECTED':'CHALLENGE_REQUIRED',error:'Solve again'},{status:403});
    return Response.json({...offer,id:'booking-id',reference:'TEST-123',serviceName:'Test service',status:'confirmed'},{status:201});
  });
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  const button=(text:string)=>[...container.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')??b.textContent)?.includes(text))!;
  try{
    await act(async()=>root.render(createElement(BookingFlow,{catalog,challengeSiteKey:'test'})));
    await act(async()=>button('Test service').click());
    await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Vabad ajad"] [role="tabpanel"] button')!.click());
    await act(async()=>finishScriptLoad());
    await act(async()=>button('Solve challenge').click());
    for(const [id,value] of [['name','Test Customer'],['email','test@example.com']]){
      await act(async()=>{
        const element=container.querySelector<HTMLInputElement>(`#${id}`)!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,value);
        element.dispatchEvent(new Event('input',{bubbles:true}));
      });
    }
    const submit=async()=>act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    await submit();
    await submit();
    expect(container.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    // Waiting for a fresh challenge must not unlock a possibly committed command.
    await submit();
    expect(requests).toHaveLength(2);
    expect(container.querySelector<HTMLInputElement>('#name')!.disabled).toBe(true);
    await act(async()=>button('Solve challenge').click());
    await submit();
    expect(requests[2].token).not.toBe(requests[1].token);
    await act(async()=>button('Solve challenge').click());
    await submit();
    expect(requests[3].token).not.toBe(requests[2].token);
    expect(new Set(requests.map(r=>r.key)).size).toBe(1);
    expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Set(requests.map(r=>r.body)).size).toBe(1);
    expect(container.textContent).toContain('TEST-123');
  }finally{await act(async()=>root.unmount());container.remove();delete window.turnstile;vi.unstubAllGlobals();}
});
