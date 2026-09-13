import Button from '@/components/ui/button/button';
import type {Catalog, Service} from '@/lib/contracts';
import {useI18n} from '@/components/i18n-provider';
import {localeNames,localeTags} from '@/lib/locales';
import {localizedService} from '@/lib/service-translation-contracts';
import ServiceInfo from './service-info';
import {categoryPresentation} from './category-presentation';
import CategoryIllustration from './category-illustration';
import styles from './service-selection.module.css';

export function servicePath(service:Service):string[]{return service.categoryPath?.length?service.categoryPath:[service.category];}
export function servicesAtPath(services:Service[],path:string[]){return services.filter(service=>{const parts=servicePath(service);return parts.length===path.length&&path.every((part,index)=>parts[index]===part);});}
export function serviceCategories(catalog:Catalog,path:string[]=[]){return [...new Set(catalog.services.map(servicePath).filter(parts=>parts.length>path.length&&path.every((part,index)=>parts[index]===part)).map(parts=>parts[path.length]))];}
export function descendSingleCategory(catalog:Catalog,start:string[]=[]){const path=[...start];let choices=serviceCategories(catalog,path);while(choices.length===1&&!servicesAtPath(catalog.services,path).length){path.push(choices[0]);choices=serviceCategories(catalog,path);}return path;}
export function initialCategoryPath(catalog:Catalog){return descendSingleCategory(catalog);}
export function firstBookingStep(catalog:Catalog):'category'|'service'{return serviceCategories(catalog,initialCategoryPath(catalog)).length?'category':'service';}

const beautyCategoryOrder=['juuksur','massaaž','ripsmed','küünehooldus'];
export function orderedCategories(categories:string[]){
  return categories.map((category,index)=>({category,index})).sort((a,b)=>{
    const aRank=beautyCategoryOrder.indexOf(a.category.trim().toLocaleLowerCase('et'));
    const bRank=beautyCategoryOrder.indexOf(b.category.trim().toLocaleLowerCase('et'));
    return (aRank<0?beautyCategoryOrder.length:aRank)-(bRank<0?beautyCategoryOrder.length:bRank)||a.index-b.index;
  }).map(item=>item.category);
}

// Display related services together while retaining each real service identifier.
function servicePresentation(service:Service){
  const named=service.name.match(/^(.*?)\s+—\s+(.+)$/);
  if(named)return {name:named[1].trim(),variant:named[2].trim(),durationVariant:false};
  const match=service.name.match(/^(.*?),\s*(\d+(?:[.,]\d+)?)\s*(h|min|ч|мин)\s*$/i);
  if(!match)return {name:service.name,variant:service.name,durationVariant:false};
  const unit=match[3].toLowerCase(),minutes=Number(match[2].replace(',','.'))*(unit==='h'||unit==='ч'?60:1);
  return Math.abs(minutes-service.durationFrom)<.01?{name:match[1].trim(),variant:`${match[2]} ${match[3]}`,durationVariant:true}:{name:service.name,variant:service.name,durationVariant:false};
}
export function serviceVariantName(service:Service){return servicePresentation(service).name;}
export function CategorySelection({categories,selected,disabled,onSelect}:{categories:string[];selected:string|null;disabled:boolean;onSelect:(category:string)=>void}){
  const {t}=useI18n();
  return <ul className={styles.categories} aria-label={t('Teenusegrupid')}>{orderedCategories(categories).map(category=>{
    const label=category?t(category):t('Muud teenused');
    const presentation=categoryPresentation(category);
    return <li key={category}><Button className={styles.category} type="button" aria-label={label} disabled={disabled} aria-pressed={selected===category} onClick={()=>onSelect(category)}>
      <span className={styles.categoryArt}><CategoryIllustration name={presentation.icon}/></span>
      <span className={styles.categoryCopy}><strong>{category.trim().toLocaleLowerCase('et')==='küünehooldus'?t('Küüned'):label}</strong>{presentation.description&&<span className={styles.categoryDescription}>{t(presentation.description)}</span>}</span>
    </Button></li>;
  })}</ul>;
}
export function ServiceSelection({services,selected,disabled,exactPrice,search,onSearch,onSelect}:{services:Service[];selected:string;disabled:boolean;exactPrice:boolean;search:string;onSearch:(search:string)=>void;onSelect:(service:Service)=>void}){
  const {t,locale}=useI18n();
  const visible=services.map(service=>localizedService(service,locale)).filter(item=>`${item.name} ${item.description}`.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const groups=new Map<string,typeof visible>();
  for(const item of visible){const key=JSON.stringify([servicePath(item),serviceVariantName(item),item.contentLanguage,item.translationMissing]);groups.set(key,[...(groups.get(key)??[]),item]);}
  const money=(value:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR',maximumFractionDigits:value%100?2:0}).format(value/100);
  const duration=(value:number)=>value%30===0&&value>=60?new Intl.NumberFormat(localeTags[locale]).format(value/60)+' '+t('h'):value+' '+t('min');
  return <>
    <ul className={styles.services} aria-label={t('Teenused')}>{[...groups].map(([key,items])=>{
      const first=items[0],multiple=items.length>1;
      return <li key={key} className={styles.service} data-multiple={multiple||undefined}>{multiple&&<h3 lang={first.contentLanguage}>{serviceVariantName(first)}</h3>}
        <ul className={styles.variants}>{items.sort((a,b)=>b.durationFrom-a.durationFrom||a.name.localeCompare(b.name,locale)).map(item=>{
          const notice=item.translationMissing?t('Tõlge pole veel kinnitatud. Algteksti keel: {language}',{language:localeNames[item.contentLanguage]}):undefined;
          const showInfo=servicePath(item)[0]?.trim().toLocaleLowerCase('et')!=='juuksur';
          const presentation=servicePresentation(item),durationInName=multiple&&presentation.durationVariant;
          return <li key={item.id} className={styles.variantRow}><Button className={styles.variant} aria-label={item.name} lang={item.contentLanguage} type="button" disabled={disabled} aria-pressed={selected===item.id} onClick={()=>onSelect(item)}>
            <span className={styles.variantName}>{multiple?presentation.variant:presentation.durationVariant?presentation.name:item.name}</span><span className={styles.variantMeta}>{!durationInName&&<span className={styles.duration}>{exactPrice||item.durationFrom===item.durationTo?'':t('Alates ')}{duration(item.durationFrom)}</span>}<strong>{exactPrice||item.priceFrom===item.priceTo?'':t('alates ')}{money(item.priceFrom)}</strong></span>
          </Button>{showInfo&&<ServiceInfo name={item.name} description={item.description} language={item.contentLanguage} translationNotice={notice}/>}</li>;
        })}</ul>
      </li>;
    })}{!services.length&&<li>{t('Teenuseid ei ole veel lisatud.')}</li>}{!!services.length&&!visible.length&&<li>{t('Otsingule vastavaid teenuseid ei ole. Muuda otsingut või gruppi.')}</li>}</ul>
  </>;
}
