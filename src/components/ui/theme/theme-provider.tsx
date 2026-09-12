'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
import type {ThemeMode} from '@/lib/theme-contracts';
const AppearanceContext=createContext({mode:'system' as ThemeMode,highContrast:false,setMode:(_mode:ThemeMode)=>{},setHighContrast:(_high:boolean)=>{}});
export function ThemeProvider({children,initialMode='system',initialContrast=false}:{children:ReactNode;initialMode?:ThemeMode;initialContrast?:boolean}){
  const [mode,setMode]=useState(initialMode),[highContrast,setHighContrast]=useState(initialContrast);
  function persist(key:string,value:string){try{document.cookie=`${key}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;}catch{/* A blocked third-party cookie must not block embedded appearance controls. */}}
  return <AppearanceContext.Provider value={{mode,highContrast,setMode:value=>{setMode(value);setHighContrast(false);persist('ajasta-appearance',value);persist('ajasta-contrast','standard');},setHighContrast:value=>{setHighContrast(value);persist('ajasta-contrast',value?'high':'standard');}}}>{children}</AppearanceContext.Provider>;
}
export const useAppearance=()=>useContext(AppearanceContext);
