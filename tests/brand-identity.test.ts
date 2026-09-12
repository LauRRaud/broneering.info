// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import BrandIdentity from '../src/components/ui/theme/brand-identity';
import {ThemeSurface} from '../src/components/ui/theme/theme-surface';
import {defaultTheme,type PublicTheme} from '../src/lib/theme-contracts';
let root:Root,container:HTMLDivElement;
async function render(theme:PublicTheme){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 if(!container){container=document.createElement('div');document.body.append(container);root=createRoot(container);}
 await act(async()=>root.render(createElement(ThemeSurface,{theme,children:createElement(BrandIdentity,{name:'Ilutegu'})})));
}
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();container=undefined!;});
it('shows only the company name when chosen, even if logos are stored',async()=>{
 await render({config:{...defaultTheme,brandDisplay:'name'},lightLogo:'/logo.png'});
 expect(container.querySelector('h1')?.textContent).toBe('Ilutegu');expect(container.querySelector('img')).toBeNull();
});
it('keeps one accessible company name in logo mode and falls back per failed logo variant',async()=>{
 await render({config:{...defaultTheme,brandDisplay:'logo'},lightLogo:'/light.png',darkLogo:'/dark.png'});
 const name=container.querySelector('h1 > span')!;
 expect(name.textContent).toBe('Ilutegu');expect(name.getAttribute('aria-hidden')).toBeNull();
 const images=[...container.querySelectorAll('img')];expect(images).toHaveLength(2);
 expect(images.every(img=>img.alt===''&&img.closest('[aria-hidden="true"]'))).toBe(true);
 await act(async()=>images[0].dispatchEvent(new Event('error')));
 expect(container.querySelector('img[src="/light.png"]')).toBeNull();
 expect(container.querySelector('img[src="/dark.png"]')).not.toBeNull();
 expect(container.querySelector('[aria-hidden="true"]')?.textContent).toContain('Ilutegu');
 await render({config:{...defaultTheme,brandDisplay:'logo'},lightLogo:'/replacement.png'});
 expect(container.querySelector('img[src="/replacement.png"]')).not.toBeNull();
});
it('uses a visible name without a logo and accepts legacy theme configurations',async()=>{
 await render({config:{...defaultTheme,brandDisplay:'logo'}});
 expect(container.querySelector('h1 > span')?.className).toBe('');
 const {brandDisplay,...legacy}=defaultTheme;
 await render({config:legacy,lightLogo:'/old.png'});expect(container.querySelector('img')).not.toBeNull();
});
