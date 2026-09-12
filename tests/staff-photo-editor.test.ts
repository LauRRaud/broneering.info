// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import StaffPhotoEditor from '../src/components/admin/staff-photo-editor';
const staff={id:'10000000-0000-4000-8000-000000000002',name:'Mari',title:'',bio:'',photoUrl:'',active:true,online:true,version:1};
let root:Root,container:HTMLDivElement;
async function render(disabled=false){
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({version:2})));
  vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=>'blob:test-photo'),revokeObjectURL:vi.fn()}));
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  const saved=vi.fn(async()=>{});
  await act(async()=>root.render(createElement(StaffPhotoEditor,{tenantId:'10000000-0000-4000-8000-000000000001',staff,onSaved:saved,disabled})));
  return saved;
}
const button=(text:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)!;
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();vi.unstubAllGlobals();});
it('previews a selected file and uploads only after explicit save',async()=>{
  const saved=await render();
  const file=new File(['jpeg'],'portrait.jpg',{type:'image/jpeg'}),input=container.querySelector('input[type=file]')!;
  Object.defineProperty(input,'files',{value:[file]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:test-photo');expect(fetch).not.toHaveBeenCalled();
  await act(async()=>button('Salvesta foto').click());
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('staffId='+staff.id),expect.objectContaining({method:'PUT',body:file}));
  expect(saved).toHaveBeenCalledOnce();
});
it('keeps the selected file available when upload fails and does not report success',async()=>{
  const saved=await render();vi.mocked(fetch).mockResolvedValue(Response.json({error:'Salvestus ebaõnnestus'},{status:503}));
  const input=container.querySelector('input[type=file]')!;
  Object.defineProperty(input,'files',{value:[new File(['jpeg'],'portrait.jpg',{type:'image/jpeg'})]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  await act(async()=>button('Salvesta foto').click());
  expect(container.querySelector('[role=alert]')?.textContent).toBe('Salvestus ebaõnnestus');
  expect(container.querySelector('img')).not.toBeNull();expect(saved).not.toHaveBeenCalled();
});
it('offers a separate camera hint and disables photo changes while profile edits are unsaved',async()=>{
  await render(true);
  expect(container.querySelector('input[capture]')?.getAttribute('accept')).toBe('image/*');
  expect(container.querySelector('input[capture]')?.getAttribute('capture')).toBe('environment');
  expect(container.querySelector('fieldset')?.disabled).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
