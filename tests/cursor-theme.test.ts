import {describe,it,expect} from 'vitest';
import {cursorImage} from '../src/components/ui/cursor/cursor-image';
import {themeSchema,defaultTheme,resolvedPalette} from '../src/lib/theme-contracts';
describe('configurable cursor colors',()=>{
 it('keeps old themes valid and preserves custom colors through serialization',()=>{
  const old=themeSchema.parse(defaultTheme);expect(resolvedPalette(old.light).cursor).toBe('#f1e8d9');
  const value=themeSchema.parse(JSON.parse(JSON.stringify({...old,light:{...old.light,cursor:'#112233',cursorHover:'#ddeeff',cursorOutline:'#778899'}})));
  expect(resolvedPalette(value.light).cursorHover).toBe('#ddeeff');
  expect(decodeURIComponent(cursorImage(value.light.cursor!,value.light.cursorOutline!))).toContain('fill="#112233"');
 });
 it('rejects non-colors in saved themes and does not interpolate markup into the image',()=>{
  expect(themeSchema.safeParse({...defaultTheme,light:{...defaultTheme.light,cursor:'url(bad)'}}).success).toBe(false);
  expect(decodeURIComponent(cursorImage('<script>','bad'))).not.toContain('<script>');
 });
});
