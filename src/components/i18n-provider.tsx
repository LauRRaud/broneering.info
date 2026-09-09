"use client";

import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {translator,type Translate} from '@/lib/i18n';
import {languageCookie,localeNames,locales,type Locale} from '@/lib/locales';
type LanguageContext={locale:Locale;t:Translate;explicit:boolean;setLocale:(locale:Locale,persist?:boolean)=>void};
const Context=createContext<LanguageContext>({locale:'et',t:translator('et'),explicit:false,setLocale:()=>{}});
export function I18nProvider({initialLocale,explicit:initialExplicit=false,isAdmin,children}:{initialLocale:Locale;explicit?:boolean;isAdmin:boolean;children:ReactNode}){

  const [locale,setLanguage]=useState(initialLocale),[explicit,setExplicit]=useState(initialExplicit);
  const value=useMemo(()=>({locale,t:translator(locale),explicit,setLocale:(next:Locale,persist=true)=>{
    setLanguage(next);
    if(persist){setExplicit(true);try{document.cookie=`${languageCookie(isAdmin)}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;}catch{/* Embedded pages remain usable without cookies. */}}
  }}),[locale,explicit,isAdmin]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n(){return useContext(Context);}
export function LanguageSwitcher(){
const {locale,t,setLocale}=useI18n();return <div className="language-switcher"><label htmlFor="interface-language">{t("Keel")} </label><select id="interface-language" value={locale} onChange={e=>{setLocale(e.target.value as Locale);if(!document.querySelector('[data-live-language]'))window.location.reload();}}>{locales.map(language=><option key={language} value={language} lang={language}>{localeNames[language]}</option>)}</select></div>;}
export function SkipLink(){
const {t}=useI18n();return <a className="skip-link" href="#main-content" tabIndex={0}>{t("Liigu põhisisu juurde")}</a>;}
