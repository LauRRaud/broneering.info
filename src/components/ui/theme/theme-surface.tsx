'use client';
import {createContext,useContext,type CSSProperties,type ReactNode} from 'react';
import {defaultTheme,fonts,resolvedPalette,type PublicTheme,type ThemeMode} from '@/lib/theme-contracts';
import {useAppearance} from './theme-provider';
import {cursorImage} from '../cursor/cursor-image';
import tokens from '@/styles/theme.module.css';
import styles from './theme-surface.module.css';
const ThemeContext=createContext<PublicTheme>({config:defaultTheme});
export function ThemeSurface({theme={config:defaultTheme},children,mode,highContrast,className=''}:{theme?:PublicTheme;children:ReactNode;mode?:ThemeMode;highContrast?:boolean;className?:string}){
  const appearance=useAppearance(),variables:Record<string,string>={'--theme-font':fonts[theme.config.font],'--theme-heading-font':fonts[theme.config.headingFont??'serif']};
  for(const palette of ['light','dark'] as const)for(const [key,color] of Object.entries(resolvedPalette(theme.config[palette])))variables[`--${palette}-${key}`]=color;
  for(const mode of ['light','dark'] as const){const p=resolvedPalette(theme.config[mode]);variables['--'+mode+'-cursor-rest']=cursorImage(p.cursor,p.cursorOutline)+', auto';variables['--'+mode+'-cursor-action']=cursorImage(p.cursorHover,p.cursorOutline)+', pointer';}
  return <ThemeContext.Provider value={theme}><div data-theme-mode={mode??appearance.mode} data-theme-contrast={(highContrast??appearance.highContrast)?'high':'standard'} className={`${tokens.theme} ${styles.surface} ${className}`} style={variables as CSSProperties}>{children}</div></ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
