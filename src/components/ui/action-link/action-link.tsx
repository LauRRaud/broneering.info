import type {ComponentPropsWithRef} from 'react';
import styles from './action-link.module.css';

type Props=ComponentPropsWithRef<'a'>&{variant?:'primary'|'secondary'};

export default function ActionLink({children,className='',variant='primary',...props}:Props){
  return <a {...props} className={`${styles.root} ${variant==='secondary'?styles.secondary:''} ${className}`}>{children}</a>;
}
