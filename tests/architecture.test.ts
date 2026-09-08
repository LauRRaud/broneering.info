import {expect, it} from 'vitest';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {checkArchitecture, runtimeImports} from '../scripts/architecture';

it('keeps the real browser graph free of server libraries and reverse UI dependencies', () => {
  expect(checkArchitecture().violations).toEqual([]);
});
it('follows runtime re-exports and lazy imports while allowing erased type imports', () => {
  expect(runtimeImports('sample.ts', `import type {A} from './a'; import {type B} from './b'; export type {C} from './c'; export {value} from './d'; const x = import('./e');`).imports).toEqual(['./d', './e']);
  expect(() => runtimeImports('sample.ts', 'import(variable)')).toThrow('computed module loading');
});
it('rejects indirect browser imports and server modules depending on UI', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'booking-architecture-'));
  try {
    mkdirSync(path.join(root, 'src/components'), {recursive: true});
    mkdirSync(path.join(root, 'src/lib'));
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({compilerOptions: {moduleResolution: 'bundler', module: 'esnext'}}));
    writeFileSync(path.join(root, 'src/components/view.tsx'), `'use client'; import '../lib/contracts';`);
    writeFileSync(path.join(root, 'src/lib/contracts.ts'), `export * from './db';`);
    writeFileSync(path.join(root, 'src/lib/db.ts'), `import '../components/view';`);
    const result = checkArchitecture(root);
    expect(result.violations.some(v => v.includes('server library in browser/shared graph'))).toBe(true);
    expect(result.violations.some(v => v.includes('must not depend on src/components'))).toBe(true);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
