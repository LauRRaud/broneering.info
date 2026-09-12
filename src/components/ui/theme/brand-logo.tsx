'use client';
import {useState} from 'react';
import {useTheme} from './theme-surface';
import styles from './brand-logo.module.css';

export default function BrandLogo({fallback=''}:{fallback?:string}){
  const theme=useTheme(),[failed,setFailed]=useState<string[]>([]);
  if(!theme.lightLogo&&!theme.darkLogo)return null;
  const variant=(url:string|undefined,className:string)=><span className={className}>{url&&!failed.includes(url)?<img src={url} alt="" onError={()=>setFailed(values=>values.includes(url)?values:[...values,url])}/>:fallback}</span>;
  return <span className={styles.logo} aria-hidden="true">
    {variant(theme.lightLogo??theme.darkLogo,styles.light)}
    {variant(theme.darkLogo??theme.lightLogo,styles.dark)}
  </span>;
}
