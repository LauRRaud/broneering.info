'use client';
import type {Staff} from '@/lib/contracts';
import {useI18n} from '@/components/i18n-provider';
import StaffCard from './staff-card';
import styles from './staff-contacts.module.css';
export default function StaffContacts({staff}:{staff:Staff[]}){
  const {t}=useI18n();
  if(!staff.length)return null;
  return <details className={styles.root}><summary>{t('Töötajad ja kontaktid')}</summary><ul>{staff.map(person=><li key={person.id}><StaffCard staff={person}/></li>)}</ul></details>;
}
