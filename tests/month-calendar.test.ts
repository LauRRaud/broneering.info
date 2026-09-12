// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,createElement,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import MonthCalendar from '../src/components/ui/month-calendar/month-calendar';
import {moveDay,moveMonth} from '../src/components/ui/month-calendar/calendar-dates';

let root:Root,container:HTMLDivElement;
const labels={previous:'Eelmine kuu',next:'Järgmine kuu',help:'Nooleklahvid',empty:'Vabu aegu pole'};
const choose=vi.fn();
async function render(value='2026-09-30',min='2026-09-12',max='2026-11-05'){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});choose.mockClear();
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 function Harness(){const [date,setDate]=useState(value),[month,setMonth]=useState(value.slice(0,7));return createElement(MonthCalendar,{value:date,month,min,max,today:min,locale:'et-EE',days:{'2026-09-29':false},labels,onMonthChange:setMonth,onChange:(next:string)=>{choose(next);setDate(next);}});}
 await act(async()=>root.render(createElement(Harness)));
}
const day=(date:string)=>container.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!;
const key=async(value:string)=>act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true})));
afterEach(async()=>{if(root)await act(async()=>root.unmount());container?.remove();});

it('shows a Monday-first month with bounded dates, today and accessible selection/empty markers',async()=>{
 await render();
 expect(container.querySelectorAll('tbody button')).toHaveLength(30);
 expect(container.querySelector('th')?.getAttribute('abbr')).toBe('esmaspäev');
 expect(day('2026-09-11').disabled).toBe(true);
 expect(day('2026-09-12').getAttribute('aria-current')).toBe('date');
 expect(day('2026-09-30').getAttribute('aria-pressed')).toBe('true');
 expect(day('2026-09-30').closest('td')?.getAttribute('aria-selected')).toBe('true');
 expect(day('2026-09-29').getAttribute('aria-label')).toContain('Vabu aegu pole');
 expect(day('2026-09-29').disabled).toBe(false); // Can recheck stale month availability.
 expect(container.querySelectorAll('tbody button[tabindex="0"]')).toHaveLength(1);
});
it('moves keyboard focus across months without choosing a date, then selects explicitly',async()=>{
 await render();await act(async()=>day('2026-09-30').focus());
 await key('ArrowRight');expect(document.activeElement).toBe(day('2026-10-01'));expect(choose).not.toHaveBeenCalled();
 await key('Home');expect(document.activeElement).toBe(day('2026-09-28'));
 await key('End');expect(document.activeElement).toBe(day('2026-10-04'));
 await key('PageDown');expect(document.activeElement).toBe(day('2026-11-04'));
 await key('ArrowDown');expect(document.activeElement).toBe(day('2026-11-05'));
 await act(async()=>day('2026-11-05').click());expect(choose).toHaveBeenLastCalledWith('2026-11-05');
 expect(day('2026-11-05').getAttribute('aria-pressed')).toBe('true');
});
it('keeps month navigation focus on its button and respects leap years and year boundaries',async()=>{
 await render('2026-12-31','2026-12-01','2027-02-03');
 const next=container.querySelector<HTMLButtonElement>('[aria-label="Järgmine kuu"]')!;
 await act(async()=>{next.focus();next.click();});
 expect(day('2027-01-01')).toBeDefined();expect(document.activeElement).toBe(next);expect(choose).not.toHaveBeenCalled();
 expect(moveMonth('2024-01-31',1)).toBe('2024-02-29');
 expect(moveMonth('2025-01-31',1)).toBe('2025-02-28');
 expect(moveDay('2026-03-29',1)).toBe('2026-03-30');
});
