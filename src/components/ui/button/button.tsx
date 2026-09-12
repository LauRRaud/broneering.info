import type {ComponentPropsWithRef} from 'react';
import styles from './button.module.css';

type Props=ComponentPropsWithRef<'button'>&{variant?:'default'|'primary'};

export default function Button({className='',variant='default',...props}:Props){
  return <button {...props} className={`${styles.root} ${variant==='primary'?styles.primary:''} ${className}`}/>;
}
