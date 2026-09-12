import type {ComponentPropsWithRef} from 'react';
import styles from './calendar-surface.module.css';

export default function CalendarSurface({className='',...props}:ComponentPropsWithRef<'div'>){
  return <div {...props} className={`${styles.root} ${className}`}/>;
}
