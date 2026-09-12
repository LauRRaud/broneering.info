import Button from '@/components/ui/button/button';
import Icon from '@/components/ui/icon/icon';
import {useI18n} from '@/components/i18n-provider';
import styles from './booking-progress.module.css';
export default function BookingProgress({current,labels,completed,selectable,canGoBack,disabled,onBack,onSelect}:{current:number;labels:string[];completed:boolean[];selectable:boolean[];canGoBack:boolean;disabled:boolean;onBack:()=>void;onSelect:(index:number)=>void}){
  const {t}=useI18n();
  return <nav className={styles.root} aria-label={t('Broneerimise edenemine')}><div className={styles.track}>
    {canGoBack&&<><Button className={styles.back} type="button" aria-label={t('Tagasi')} disabled={disabled} onClick={onBack}><Icon name="chevron" size={22}/></Button><span className={styles.divider} aria-hidden="true"/></>}
    <ol className={styles.steps}>{labels.map((label,index)=>{
      const isCurrent=index===current,canSelect=selectable[index]&&!isCurrent;
      const content=<><span className={styles.marker} aria-hidden="true"/><span className={styles.current} aria-hidden="true">{label}</span><span className={styles.sr}>{label}</span></>;
      return <li key={index} aria-current={isCurrent?'step':undefined} data-complete={completed[index]} data-selectable={canSelect}>
        {canSelect?<Button className={styles.stepControl} type="button" aria-label={t('Mine sammu {step}',{step:label})} disabled={disabled} onClick={()=>onSelect(index)}>{content}</Button>:<span className={styles.stepControl}>{content}</span>}
        {!isCurrent&&<span className={styles.tooltip} aria-hidden="true">{label}</span>}
      </li>;
    })}</ol>
    </div><p className={styles.sr}>{t('Samm {current} / {total}',{current:current+1,total:labels.length})}</p></nav>;
}
