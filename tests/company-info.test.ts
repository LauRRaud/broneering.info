// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import CompanyInfo from '../src/components/booking/company-info';
import type {Catalog} from '../src/lib/contracts';

let root:Root,container:HTMLDivElement;
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();});
it('opens the configured company address and contact details on demand, then restores focus',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  const tenant:Catalog['tenant']={name:'Salong',slug:'salong',address:'Näidise 2, Tallinn 10111',contactPhone:'+372 5555 0101',contactEmail:'info@example.test',description:'Sissepääs hoovist.\nTasuta parkimine.',timezone:'Europe/Tallinn',cancellationHours:24,rulesVersion:1,demo:true};
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  await act(async()=>root.render(createElement(CompanyInfo,{tenant})));
  const trigger=container.querySelector<HTMLButtonElement>('[aria-controls]')!,dialog=container.querySelector('dialog')!;
  expect(trigger.textContent).toContain('Näidise 2, Tallinn');
  expect(trigger.textContent).not.toContain('10111');
  expect(dialog.open).toBe(false);
  expect(container.querySelector('a')).toBeNull();
  await act(async()=>trigger.click());
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain(tenant.address);
  expect(dialog.textContent).toContain(tenant.description);
  expect(dialog.querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:+37255550101');
  expect(dialog.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe('mailto:info@example.test');
  const map=dialog.querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
  expect(new URL(map.href).searchParams.get('query')).toBe(tenant.address);
  await act(async()=>dialog.dispatchEvent(new Event('cancel',{cancelable:true})));
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  await act(async()=>root.render(createElement(CompanyInfo,{tenant:{...tenant,address:'',description:'',contactPhone:'',contactEmail:''}})));
  expect(container.querySelector('button')).toBeNull();
});
