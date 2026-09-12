import type {Catalog} from '@/lib/contracts';
import styles from './selection.module.css';
import {useI18n} from '@/components/i18n-provider';

export default function BookingHeader({tenant}: {tenant: Catalog['tenant']}) {
  const {t}=useI18n();
  return <header>
    <h1>{tenant.name}</h1>
    {tenant.demo&&<small>{t('Demo — töötajad ja osa teenusekestusi on näidisandmed.')}</small>}
    {(tenant.address||tenant.description||tenant.bookingTerms)&&<details>
      <summary>{t('Ettevõtte info ja tingimused')}</summary>
      <p>{tenant.address}</p><p>{tenant.description}</p>
      {tenant.bookingTerms&&<p className={styles.terms}>{tenant.bookingTerms}</p>}
    </details>}
  </header>;
}
