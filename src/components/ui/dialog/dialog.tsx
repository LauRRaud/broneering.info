import type {ComponentPropsWithRef} from 'react';
import styles from './dialog.module.css';

export default function Dialog({className='',...props}:ComponentPropsWithRef<'dialog'>){
  return <dialog {...props} className={`${styles.root} ${className}`}/>;
}
