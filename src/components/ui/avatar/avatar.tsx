'use client';
import {useState} from 'react';
import styles from './avatar.module.css';

export function nameInitials(name:string){
  const words=name.match(/[\p{L}\p{N}]+/gu)??[];
  if(!words.length)return '?';
  const first=words[0]!,last=words[words.length-1]!;
  return (words.length===1?Array.from(first).slice(0,2).join(''):Array.from(first)[0]+Array.from(last)[0]).toUpperCase();
}

/** Decorative identity marker. The consuming component must show the full name. */
export default function Avatar({name,src,singleInitial=false}:{name:string;src?:string;singleInitial?:boolean}){
  const [failedSrc,setFailedSrc]=useState<string>();
  return <span className={styles.avatar} aria-hidden="true">
    {src&&src!==failedSrc?<img src={src} alt="" width={48} height={48} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedSrc(src)}/>:singleInitial?Array.from(nameInitials(name))[0]:nameInitials(name)}
  </span>;
}
