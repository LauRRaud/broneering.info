import {z} from 'zod';

export const colorLabels={background:'Lehe taust',surface:'Sisuala taust',text:'Põhitekst',heading:'Pealkirjad',link:'Lingid',border:'Piirjooned ja fookus',button:'Nupu taust',buttonText:'Nupu tekst',calendar:'Kalendri taust',calendarText:'Kalendri tekst',selected:'Valitud aja taust',selectedText:'Valitud aja tekst',icons:'Ikoonid',navigation:'Nooled ja navigeerimine',cardBorder:'Kaartide piirjooned',mutedText:'Abitekstid'} as const;
export type ColorKey=keyof typeof colorLabels;
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const paletteSchema=z.object({background:color,surface:color,text:color,heading:color,link:color,border:color,button:color,buttonText:color,calendar:color,calendarText:color,selected:color,selectedText:color,icons:color.optional(),navigation:color.optional(),cardBorder:color.optional(),mutedText:color.optional()}).strict();
export type Palette=z.infer<typeof paletteSchema>;
export function resolvedPalette(p:Palette){return {...p,icons:p.icons??p.heading,navigation:p.navigation??p.heading,cardBorder:p.cardBorder??p.border,mutedText:p.mutedText??p.text};}
export const fonts={editorial:'var(--font-cormorant), Georgia, serif',modern:'var(--font-manrope), system-ui, sans-serif',system:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',humanist:'"Trebuchet MS", Verdana, sans-serif',serif:'Georgia, "Times New Roman", serif'} as const;
export const themeSchema=z.object({brandDisplay:z.enum(['name','logo']).optional(),font:z.enum(['system','humanist','serif','editorial','modern']),headingFont:z.enum(['system','humanist','serif','editorial','modern']).optional(),light:paletteSchema,dark:paletteSchema}).strict();
export type ThemeConfig=z.infer<typeof themeSchema>;
export const defaultTheme:ThemeConfig={brandDisplay:'name',font:'system',light:{background:'#ffffff',surface:'#ffffff',text:'#000000',heading:'#000000',link:'#0000ee',border:'#767676',button:'#efefef',buttonText:'#000000',calendar:'#ffffff',calendarText:'#000000',selected:'#000000',selectedText:'#ffffff'},dark:{background:'#121212',surface:'#121212',text:'#eeeeee',heading:'#ffffff',link:'#aaccff',border:'#a0a0a0',button:'#2a2a2a',buttonText:'#ffffff',calendar:'#121212',calendarText:'#eeeeee',selected:'#ffffff',selectedText:'#000000'}};
export type PublicTheme={config:ThemeConfig;lightLogo?:string;darkLogo?:string};
export type ThemeDraft=PublicTheme & {version:number;revision:number};
export type ThemeState={draft:ThemeDraft|null;published:ThemeDraft|null;history:{version:number;publishedAt:string}[]};
export type ThemeMode='system'|'light'|'dark';
export function contrastRatio(a:string,b:string){
  const luminance=(hex:string)=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;};
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
export type ContrastIssue={mode:'light'|'dark';foreground:ColorKey;background:ColorKey;ratio:number;minimum:number};
export function contrastIssues(config:ThemeConfig):ContrastIssue[]{
  const checks:[ColorKey,ColorKey,number][]=[];
  for(const bg of ['background','surface'] as const){for(const fg of ['text','heading','link'] as const)checks.push([fg,bg,4.5]);checks.push(['border',bg,3],['selected',bg,3]);}
  for(const bg of ['background','surface'] as const){checks.push(['mutedText',bg,4.5],['navigation',bg,3],['icons',bg,3]);}
  checks.push(['buttonText','button',4.5],['calendarText','calendar',4.5],['selectedText','selected',4.5],['selected','calendar',3],['border','calendar',3]);
  return (['light','dark'] as const).flatMap(mode=>checks.flatMap(([foreground,background,minimum])=>{const ratio=contrastRatio(resolvedPalette(config[mode])[foreground],resolvedPalette(config[mode])[background]);return ratio<minimum?[{mode,foreground,background,ratio,minimum}]:[];}));
}
