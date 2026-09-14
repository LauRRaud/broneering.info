import Button from '@/components/ui/button/button';
import Icon from '@/components/ui/icon/icon';
import {useI18n} from '@/components/i18n-provider';
import {useRef,useState} from 'react';
import styles from './booking-progress.module.css';
export default function BookingProgress({current,labels,completed,selectable,canGoBack,disabled,onBack,onSelect}:{current:number;labels:string[];completed:boolean[];selectable:boolean[];canGoBack:boolean;disabled:boolean;onBack:()=>void;onSelect:(index:number)=>void}){
  const {t}=useI18n();
  const root=useRef<HTMLElement>(null);
  const [tooltip,setTooltip]=useState<{label:string;left:number;top:number}|null>(null);
  const showTooltip=(element:HTMLElement,label:string)=>{
    const rootRect=root.current?.getBoundingClientRect();
    const rect=element.getBoundingClientRect();
    if(!rootRect)return;
    setTooltip({label,left:rect.left+rect.width/2-rootRect.left,top:rect.top-rootRect.top});
  };
  return <nav ref={root} className={styles.root} aria-label={t('Broneerimise edenemine')}><div className={styles.track}>
    {canGoBack&&<><Button className={styles.back} type="button" aria-label={t('Tagasi')} disabled={disabled} onClick={onBack}><Icon name="chevron" size={22}/></Button><span className={styles.divider} aria-hidden="true"/></>}
    <ol className={styles.steps}>{labels.map((label,index)=>{
      const isCurrent=index===current,canSelect=selectable[index]&&!isCurrent;
      const content=<><span className={styles.marker} aria-hidden="true">{completed[index]&&!isCurrent&&<Icon name="check" size={22} strokeWidth={2}/>}</span><span className={styles.current} aria-hidden="true">{label}</span><span className={styles.sr}>{label}</span></>;
      return <li key={index} aria-current={isCurrent?'step':undefined} data-complete={completed[index]} data-selectable={canSelect} onPointerEnter={isCurrent?undefined:event=>showTooltip(event.currentTarget,label)} onPointerLeave={isCurrent?undefined:()=>setTooltip(null)} onFocus={isCurrent?undefined:event=>showTooltip(event.currentTarget,label)} onBlur={isCurrent?undefined:()=>setTooltip(null)}>
        {canSelect?<Button className={styles.stepControl} type="button" aria-label={t('Mine sammu {step}',{step:label})} disabled={disabled} onClick={()=>onSelect(index)}>{content}</Button>:<span className={styles.stepControl}>{content}</span>}
      </li>;
    })}</ol>
    </div>{tooltip&&<span className={styles.tooltip} aria-hidden="true" style={{insetInlineStart:tooltip.left,insetBlockStart:tooltip.top}}>{tooltip.label}</span>}<p className={styles.sr}>{t('Samm {current} / {total}',{current:current+1,total:labels.length})}</p></nav>;
}
