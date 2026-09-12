// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import TimePicker from '../src/components/booking/time-picker';
let root:Root,container:HTMLDivElement;
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();vi.unstubAllGlobals();});
it('discards late month responses and still allows day selection after a month load error',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const calls:Array<{url:string;signal:AbortSignal;resolve:(value:Response)=>void}>=[];
 vi.stubGlobal('fetch',vi.fn((url:string,init:RequestInit)=>new Promise<Response>(resolve=>calls.push({url,signal:init.signal!,resolve}))));
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 const onChange=vi.fn();
 await act(async()=>root.render(createElement(TimePicker,{date:'2026-09-15',min:'2026-09-12',max:'2026-11-15',disabled:false,onChange,serviceId:'service',staffId:'worker',endpoint:'/api/availability',children:'Päeva ajad'})));
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Järgmine kuu"]')!.click());
 expect(calls[0].signal.aborted).toBe(true);
 await act(async()=>calls[1].resolve(Response.json({days:{'2026-10-02':false}})));
 await act(async()=>calls[0].resolve(Response.json({days:{'2026-10-03':false}})));
 expect(container.querySelector('[data-date="2026-10-02"]')?.getAttribute('aria-label')).toContain('Vabu aegu pole');
 expect(container.querySelector('[data-date="2026-10-03"]')?.getAttribute('aria-label')).not.toContain('Vabu aegu pole');
 await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Järgmine kuu"]')!.click());
 await act(async()=>calls[2].resolve(Response.json({error:'Unavailable'},{status:503})));
 expect(container.textContent).toContain('Kuu ülevaadet ei saanud laadida');
 await act(async()=>container.querySelector<HTMLButtonElement>('[data-date="2026-11-02"]')!.click());
 expect(onChange).toHaveBeenCalledWith('2026-11-02');expect(container.textContent).toContain('Päeva ajad');
});
