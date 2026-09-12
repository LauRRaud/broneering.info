import {useEmbedClose} from '@/components/embed-frame';
import {useI18n} from '@/components/i18n-provider';
import Icon from '@/components/ui/icon/icon';
import BrandIdentity from '@/components/ui/theme/brand-identity';
import type {Catalog} from '@/lib/contracts';
import styles from './booking-header.module.css';
import BookingPreferences from './booking-preferences';
export default function BookingHeader({tenant}: {tenant: Catalog['tenant']}) {
  const close=useEmbedClose(),{t}=useI18n();
  return <header className={styles.header}><div className={styles.bar}><BrandIdentity name={tenant.name}/><div className={styles.controls}><BookingPreferences/>{close&&<button className={styles.close} type="button" onClick={close} aria-label={t('Sulge broneerimisaken')}><Icon name="close" size={21}/></button>}</div></div></header>;
}
