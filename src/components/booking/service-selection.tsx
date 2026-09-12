import type {Catalog, Service} from '@/lib/contracts';
import {useI18n} from '@/components/i18n-provider';
import {localeNames,localeTags} from '@/lib/locales';
import {localizedService} from '@/lib/service-translation-contracts';
import styles from './selection.module.css';

export function serviceCategories(catalog: Catalog) {
  return [...new Set(catalog.services.map(item => item.category))];
}

export function firstBookingStep(catalog: Catalog): 'category' | 'service' {
  return serviceCategories(catalog).length > 1 ? 'category' : 'service';
}

export function CategorySelection({categories,selected,disabled,onSelect}: {
  categories: string[]; selected: string | null; disabled: boolean; onSelect: (category: string) => void;
}) {
  const {t}=useI18n();
  return <ul className={styles.options} aria-label={t('Teenusegrupid')}>
    {categories.map(category=><li key={category}><button type="button" disabled={disabled} aria-pressed={selected===category} onClick={()=>onSelect(category)}>{category || t('Muud teenused')}</button></li>)}
  </ul>;
}

export function ServiceSelection({services,selected,disabled,exactPrice,search,onSearch,onSelect}: {
  services: Service[]; selected: string; disabled: boolean; exactPrice: boolean;
  search: string; onSearch: (search: string) => void; onSelect: (service: Service) => void;
}) {
  const {t,locale}=useI18n();
  const visible=services.map(service=>localizedService(service,locale)).filter(item=>`${item.name} ${item.description}`.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const money=(value:number)=>new Intl.NumberFormat(localeTags[locale],{style:'currency',currency:'EUR'}).format(value/100);
  return <>
    {services.length>8&&<label>{t('Otsi teenust ')}<input type="search" disabled={disabled} value={search} onChange={event=>onSearch(event.target.value)}/></label>}
    <ul className={styles.options} aria-label={t('Teenused')}>
      {visible.map(item=><li key={item.id}>
        <button lang={item.contentLanguage} type="button" disabled={disabled} aria-pressed={selected===item.id} onClick={()=>onSelect(item)}>{item.name}</button>
        <span className={styles.price}>{exactPrice?'':t('Alates ')}{item.durationFrom} {t('min · ')}{exactPrice?'':t('alates ')}{money(item.priceFrom)}</span>
        {item.translationMissing&&<p>{t('Tõlge pole veel kinnitatud. Algteksti keel: {language}',{language:localeNames[item.contentLanguage]})}</p>}
        {item.description&&<details><summary>{t('Teenuse lisainfo')}</summary><p lang={item.contentLanguage}>{item.description}</p></details>}
      </li>)}
      {!services.length&&<li>{t('Teenuseid ei ole veel lisatud.')}</li>}
      {!!services.length&&!visible.length&&<li>{t('Otsingule vastavaid teenuseid ei ole. Muuda otsingut või gruppi.')}</li>}
    </ul>
  </>;
}
