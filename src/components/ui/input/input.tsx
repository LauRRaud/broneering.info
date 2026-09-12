import type {ComponentPropsWithRef} from 'react';
import styles from './input.module.css';

export default function Input({className='',...props}:ComponentPropsWithRef<'input'>){
  return <input {...props} className={`${styles.root} ${className}`}/>;
}
