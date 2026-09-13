import TextLink from '@/components/ui/text-link/text-link';
import Icon from '@/components/ui/icon/icon';
import styles from './wordmark.module.css';
export default function Wordmark({href='/',label='Ajasta'}:{href?:string;label?:string}){
  return <TextLink href={href} className={styles.root} aria-label={label}>ajasta<Icon name="clock" size={28}/></TextLink>;
}
