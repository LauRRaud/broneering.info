import type {ComponentPropsWithRef} from 'react';
import styles from './scroll-region.module.css';

export default function ScrollRegion({className='',...props}:ComponentPropsWithRef<'div'>){
  return <div {...props} className={`${styles.root} ${className}`}/>;
}
