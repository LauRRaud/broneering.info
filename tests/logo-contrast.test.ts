import {expect,it} from 'vitest';
import {needsLogoContrast,sampleLogo} from '../src/components/ui/theme/logo-contrast';

function image(...pixels:number[][]){return new Uint8ClampedArray(pixels.flat());}
const transparent=[0,0,0,0],black=[0,0,0,255],white=[255,255,255,255];

it('rescues dark artwork on dark surfaces while preserving its light appearance',()=>{
  const logo=sampleLogo(image(transparent,transparent,black,black));
  expect(needsLogoContrast(logo,['#ffffff','#f8f6f2'])).toBe(false);
  expect(needsLogoContrast(logo,['#1c1b19','#26231f'])).toBe(true);
});

it('preserves a suitable light logo and detects a missing light-mode variant',()=>{
  const logo=sampleLogo(image(transparent,transparent,white,white));
  expect(needsLogoContrast(logo,['#121212'])).toBe(false);
  expect(needsLogoContrast(logo,['#ffffff'])).toBe(true);
});

it('keeps opaque artwork intact instead of turning a JPG into a solid rectangle',()=>{
  const logo=sampleLogo(image(white,white,black,black));
  expect(logo.transparent).toBe(false);
  expect(needsLogoContrast(logo,['#ffffff','#121212'])).toBe(false);
});

it('ignores transparent whitespace and faint antialiasing but notices a lost part of a two-colour logo',()=>{
  const edge=sampleLogo(image(transparent,[0,0,0,20],white,white));
  expect(needsLogoContrast(edge,['#121212'])).toBe(false);
  const mixed=sampleLogo(image(transparent,white,white,black));
  expect(needsLogoContrast(mixed,['#121212'])).toBe(true);
  expect(needsLogoContrast(sampleLogo(image(transparent)),['#121212'])).toBe(false);
});
