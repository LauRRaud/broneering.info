import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/widget/v1.js',import.meta.url);
let source=readFileSync(path,'utf8');
const keys=[...source.matchAll(/\bt\('([^']+)'\)/g)].map(m=>m[1]);
const languages=Object.fromEntries(['et','en','ru'].map(locale=>{
  const dictionary=JSON.parse(readFileSync(new URL(`../src/locales/${locale}.json`,import.meta.url),'utf8'));
  return [locale,Object.fromEntries(keys.map(key=>{if(!dictionary[key])throw Error(`Missing ${locale}: ${key}`);return [key,dictionary[key]];}))];
}));
source=source.replace(/\/\* LANGUAGES_START \*\/[\s\S]*?\/\* LANGUAGES_END \*\//,`/* LANGUAGES_START */\n  const languages=${JSON.stringify(languages)};\n  /* LANGUAGES_END */`);
writeFileSync(path,source);

