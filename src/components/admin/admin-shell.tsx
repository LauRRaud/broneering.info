'use client';

import type {ReactNode} from 'react';
import SitePreferences from '@/components/ui/site-preferences/site-preferences';
import Wordmark from '@/components/ui/wordmark/wordmark';
import type {AdminMembership} from '@/lib/admin-contracts';
import type {Translate} from '@/lib/i18n';
import styles from './admin-shell.module.css';

export type AdminSection='bookings'|'customers'|'services'|'team'|'settings';

const sections:Array<{id:AdminSection;label:string}>=[
  {id:'bookings',label:'Broneeringud'},
  {id:'customers',label:'Kliendid'},
  {id:'services',label:'Teenused'},
  {id:'team',label:'Meeskond'},
  {id:'settings',label:'Seaded'},
];

export default function AdminShell({t,section,onSectionChange,userName,memberships,selectedTenantId,onTenantChange,onSignOut,busy,children}:{
  t:Translate;
  section:AdminSection;
  onSectionChange:(section:AdminSection)=>void;
  userName:string;
  memberships:AdminMembership[];
  selectedTenantId:string;
  onTenantChange:(tenantId:string)=>void;
  onSignOut:()=>void;
  busy:boolean;
  children:ReactNode;
}){
  const selected=memberships.find(item=>item.tenantId===selectedTenantId)??memberships[0];
  const initials=userName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'A';
  return <div className={styles.app} data-admin-app>
    <header className={styles.header}>
      <div className={styles.identity}>
        <Wordmark href="/"/>
        {memberships.length>1?<label className={styles.companySelect}><span className={styles.srOnly}>{t('Vali enda kontekst')}</span><select value={selectedTenantId||selected?.tenantId||''} onChange={event=>onTenantChange(event.target.value)}>{memberships.map(item=><option key={item.tenantId} value={item.tenantId}>{item.tenantName}</option>)}</select></label>:<span className={styles.companyName}>{selected?.tenantName}</span>}
      </div>
      <nav className={styles.navigation} aria-label={t('Haldus')}>
        {sections.map(item=><button key={item.id} type="button" aria-current={section===item.id?'page':undefined} onClick={()=>onSectionChange(item.id)}>{t(item.label)}</button>)}
      </nav>
      <div className={styles.actions}>
        <span className={styles.status}><i aria-hidden="true"/> {t('Broneerimine aktiivne')}</span>
        <a href="/juhend" target="_blank" rel="noopener noreferrer">{t('Abi')}</a>
        <SitePreferences/>
        <details className={styles.profile}>
          <summary><span aria-hidden="true">{initials}</span><b>{userName}</b></summary>
          <button type="button" onClick={onSignOut} disabled={busy}>{t('Logi välja')}</button>
        </details>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className={styles.content}>{children}</main>
  </div>;
}
