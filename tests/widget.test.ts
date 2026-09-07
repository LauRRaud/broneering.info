import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';

it('the shipped widget rejects forged windows, origins, channels and payloads',()=>{
  const listeners=new Map<string,(event:unknown)=>void>();
  const sent:{data:Record<string,unknown>;origin:string}[]=[];
  const frame={src:'https://salong.broneering.info/embed?parent=https%3A%2F%2Fsalong.ee',dataset:{},height:'700',
    contentWindow:{postMessage:(data:Record<string,unknown>,origin:string)=>sent.push({data,origin})},
    addEventListener:()=>{},removeEventListener:()=>{},after:()=>{}};
  const window={addEventListener:(name:string,callback:(event:unknown)=>void)=>listeners.set(name,callback),removeEventListener:()=>{}};
  const document={currentScript:{src:'https://broneering.info/widget/v1.js'},readyState:'complete',
    querySelectorAll:()=>[frame],addEventListener:()=>{},createElement:()=>({setAttribute:()=>{},textContent:''})};
  runInNewContext(readFileSync(new URL('../public/widget/v1.js',import.meta.url),'utf8'),{
    window,document,location:{href:'https://salong.ee/',origin:'https://salong.ee'},URL,
    crypto:{getRandomValues:(bytes:Uint8Array)=>bytes.fill(7)},Uint8Array,setInterval:()=>1,clearInterval:()=>{},
  });
  expect(sent).toHaveLength(1);
  expect(sent[0].origin).toBe('https://salong.broneering.info');
  expect(Object.keys(sent[0].data).sort()).toEqual(['channel','type','version']);
  const data={type:'broneering:ready',version:1,channel:sent[0].data.channel,height:900};
  const deliver=(changes:Record<string,unknown>)=>listeners.get('message')!({source:frame.contentWindow,origin:'https://salong.broneering.info',data,...changes});
  deliver({source:{}});deliver({origin:'https://evil.example'});deliver({origin:'null'});
  deliver({data:{...data,channel:'0'.repeat(32)}});deliver({data:{...data,email:'private@example.invalid'}});
  deliver({data:{...data,height:999999}});
  expect(frame.height).toBe('700');
  deliver({});expect(frame.height).toBe('900');
  deliver({data:{...data,type:'broneering:resize',height:1100}});expect(frame.height).toBe('1100');
});
