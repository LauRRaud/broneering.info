import type {ComponentPropsWithRef} from 'react';
import styles from './heading.module.css';

export default function Heading({as:Tag='h2',className='',...props}:ComponentPropsWithRef<'h2'> & {as?:'h1'|'h2'|'h3'|'h4'|'h5'|'h6'}){
  return <Tag {...props} className={`${styles.root} ${className}`}/>;
}
