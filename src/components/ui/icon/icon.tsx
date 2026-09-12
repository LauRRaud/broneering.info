import type {SVGProps} from 'react';

// Original monoline artwork, shared by the controls and standalone SVG exports.
export const iconPaths={
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  monitor:'M3 4h18v13H3V4ZM8 21h8m-4-4v4',sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',moon:'M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z',contrast:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 3v18m0-4h7m-7-5h9m-9-5h7',
  arrowLeft:'M19 12H5m7-7-7 7 7 7',chevron:'m9 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',check:'m5 12 4 4L19 6',
  clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  info:'M12 11v6M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',infoMark:'M12 10v7M12 6.5h.01',
  person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 21v-3a7 7 0 0 1 14 0v3',
  people:'M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M4 21v-3a7 7 0 0 1 14 0v3M18 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5v2',
  pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 11h18',
  edit:'m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z',tag:'M3 3h8l10 10-8 8L3 11V3ZM7 7h.01',
  store:'M3 9 5 3h14l2 6M3 9v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9H3Zm2 5v7h14v-7M9 21v-5h6v5',
  search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  scissors:'M23 17a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM23 47a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM21 22 53 54M21 42 53 10M32.5 32h.01',
  lotus:'M32 43C17 32 18 20 32 7c14 13 15 25 0 36ZM22 20c-5-4-10-6-15-6 0 19 10 32 25 35M42 20c5-4 10-6 15-6 0 19-10 32-25 35M11 38l-7 4c7 12 17 15 28 7 11 8 21 5 28-7l-7-4',
  lashes:'M5 35c15-19 39-19 54 0-15 18-39 18-54 0ZM40 35a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9 29 5 23M19 23l-3-8M32 20V10M45 23l3-8M55 29l4-6',
  hand:'M19 58c1-5 0-9-3-14l-7-11c-3-5 2-8 5-4l7 8V16c0-5 7-5 7 0v17V10c0-5 7-5 7 0v23V14c0-5 7-5 7 0v21V22c0-5 7-5 7 0v19c0 8-8 12-8 17M23 21v-5a1.5 1.5 0 0 1 3 0v5ZM30 15v-5a1.5 1.5 0 0 1 3 0v5ZM37 19v-5a1.5 1.5 0 0 1 3 0v5ZM44 27v-5a1.5 1.5 0 0 1 3 0v5Z',
  spark:'M12 2c0 7 3 10 10 10-7 0-10 3-10 10 0-7-3-10-10-10 7 0 10-3 10-10Z',
} as const;
export type IconName=keyof typeof iconPaths;
export default function Icon({name,size=24,...props}:SVGProps<SVGSVGElement>&{name:IconName;size?:number}){
  const category=['scissors','lotus','lashes','hand'].includes(name);
  return <svg width={size} height={size} viewBox={category?"0 0 64 64":"0 0 24 24"} fill="none" stroke="currentColor" strokeWidth={category?1.7:1.35} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={iconPaths[name]} transform={name==='hand'?'rotate(25 32 32)':undefined}/></svg>;
}
