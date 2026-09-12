import type {ComponentPropsWithRef} from 'react';
import styles from './text-link.module.css';

export default function TextLink({className='',...props}:ComponentPropsWithRef<'a'>){
  return <a {...props} className={`${styles.root} ${className}`}/>;
}
