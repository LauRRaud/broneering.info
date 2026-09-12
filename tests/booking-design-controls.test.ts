// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import DropdownMenu from '../src/components/ui/dropdown-menu/dropdown-menu';
import OfferSelection,{offerPeriod} from '../src/components/booking/offer-selection';
import {descendSingleCategory,orderedCategories,ServiceSelection} from '../src/components/booking/service-selection';
import {ThemeProvider,useAppearance} from '../src/components/ui/theme/theme-provider';
let root:Root,container:HTMLDivElement;
async function render(element:React.ReactNode){Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(element));}
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();});
it('places the Ilutegu beauty categories in the agreed booking order',()=>{
 expect(orderedCategories(['Küünehooldus','Juuksur','Ripsmed','Massaaž'])).toEqual(['Juuksur','Massaaž','Ripsmed','Küünehooldus']);
});
it('skips a sole empty intermediate category and opens its services',()=>{
 const catalog={services:[{id:'one',name:'Spaapediküür',description:'',category:'Küünehooldus / Pediküür',categoryPath:['Küünehooldus','Pediküür'],priceFrom:2500,durationFrom:30}],staff:[]} as never;
 expect(descendSingleCategory(catalog,['Küünehooldus'])).toEqual(['Küünehooldus','Pediküür']);
});
it('navigates the preference menu by keyboard and returns focus on Escape without choosing',async()=>{
 const choose=vi.fn();await render(createElement(DropdownMenu,{label:'ET',accessibleLabel:'Keel',items:[{id:'et',label:'Eesti',checked:true,onSelect:choose},{id:'en',label:'English',checked:false,onSelect:choose}]}));
 const trigger=container.querySelector('button')!;await act(async()=>trigger.click());
 expect(document.activeElement?.textContent).toContain('Eesti');
 await act(async()=>document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true})));
 expect(document.activeElement?.textContent).toContain('English');
 await act(async()=>document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
 expect(container.querySelector('[role=menu]')).toBeNull();expect(document.activeElement).toBe(trigger);expect(choose).not.toHaveBeenCalled();
});
it('returns to standard contrast when a regular color mode is selected',async()=>{
 function AppearanceProbe(){const {mode,highContrast,setMode}=useAppearance();return createElement('button',{type:'button',onClick:()=>setMode('light')},`${mode}:${highContrast?'high':'standard'}`);}
 await render(createElement(ThemeProvider,{initialMode:'dark',initialContrast:true,children:createElement(AppearanceProbe)}));
 const button=container.querySelector('button')!;
 expect(button.textContent).toBe('dark:high');
 await act(async()=>button.click());
 expect(button.textContent).toBe('light:standard');
});
it('keeps all three time periods reachable, announces an empty period, and selects the real staff offer',async()=>{
 const choose=vi.fn(),base={serviceId:'s',staffId:'a',staffName:'Mari',price:2000,duration:30,start:'2026-09-15T07:00:00Z',end:'2026-09-15T07:30:00Z'};
 const evening={...base,staffId:'b',staffName:'Kertu',price:3000,start:'2026-09-15T15:00:00Z',end:'2026-09-15T15:30:00Z'};
 await render(createElement(OfferSelection,{offers:[base,evening],timezone:'Europe/Tallinn',showStaff:true,disabled:false,onSelect:choose}));
 const tabs=container.querySelectorAll<HTMLButtonElement>('[role=tab]');
 expect([...tabs].map(tab=>tab.textContent)).toEqual(['Hommik','Päev','Õhtu']);
 await act(async()=>tabs[1].click());expect(container.querySelector('[role=tabpanel]')?.textContent).toContain('Selles päevaosas vabu aegu ei ole.');
 await act(async()=>tabs[2].click());expect(container.querySelector('[role=tabpanel]')?.textContent).toContain('Kertu');
 await act(async()=>container.querySelector<HTMLButtonElement>('[role=tabpanel] button')!.click());expect(choose).toHaveBeenCalledWith(evening);
 expect(offerPeriod('2026-09-15T07:00:00Z','America/New_York')).toBe('Hommik');
});
it('groups real duration variants without changing their identifiers or hiding different service content',async()=>{
 const choose=vi.fn(),base={id:'one',name:'Massaaž, 1 h',description:'Lõõgastav massaaž.',category:'Massaaž',priceFrom:4500,durationFrom:60};
 await render(createElement(ServiceSelection,{services:[base,{...base,id:'two',name:'Massaaž, 1,5 h',durationFrom:90,priceFrom:6000},{...base,id:'three',name:'Massaaž, 2 h',durationFrom:120,priceFrom:7500}],selected:'',disabled:false,exactPrice:true,search:'',onSearch:vi.fn(),onSelect:choose}));
 expect(container.querySelectorAll('h3')).toHaveLength(1);
 expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(3);
 await act(async()=>container.querySelector<HTMLButtonElement>('button[aria-label="Massaaž, 1,5 h"]')!.click());
 expect(choose.mock.calls[0][0].id).toBe('two');
 await act(async()=>container.querySelector<HTMLButtonElement>('button[aria-label="Massaaž, 2 h"]')!.click());
 expect(choose.mock.calls[1][0].id).toBe('three');
});
