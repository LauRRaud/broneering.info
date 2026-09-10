// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import Turnstile from '../src/components/turnstile';
import {finishScriptLoad,installTurnstileProvider} from './helpers/turnstile-provider';

it('recreates the challenge after returning to the details step and clears the removed token',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  installTurnstileProvider();
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  let token='';
  const view=()=>createElement(Turnstile,{siteKey:'test',label:'Bot check',resetSignal:0,onToken:(value:string)=>{token=value;}});
  try{
    await act(async()=>root.render(view()));
    await act(async()=>finishScriptLoad());
    await act(async()=>container.querySelector('button')!.click());
    expect(token).toBe('token-1');
    await act(async()=>root.render(null));
    expect.soft(token).toBe('');
    await act(async()=>root.render(view()));
    expect(container.querySelector('button')?.textContent).toBe('Solve challenge');
    await act(async()=>container.querySelector('button')!.click());
    expect(token).toBe('token-2');
  }finally{await act(async()=>root.unmount());container.remove();delete window.turnstile;}
});
