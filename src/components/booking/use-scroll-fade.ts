import {useEffect,useState,type RefObject} from 'react';

/** Shade only a service list that continues underneath the floating navigation. */
export function useScrollFade(content:RefObject<HTMLElement|null>,enabled:boolean,contentKey:string){
  const [overflowing,setOverflowing]=useState(false);
  useEffect(()=>{
    const node=content.current;if(!enabled||!node)return;
    const update=()=>setOverflowing(document.documentElement.scrollHeight>window.innerHeight+2&&node.getBoundingClientRect().bottom>window.innerHeight-88);
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(update);
    observer?.observe(node);window.addEventListener('resize',update);window.addEventListener('scroll',update,{passive:true});update();
    return()=>{observer?.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update);};
  },[content,enabled,contentKey]);
  return enabled&&overflowing;
}
