import type {ComponentPropsWithRef} from 'react';
import TextLink from '@/components/ui/text-link/text-link';
import styles from './action-link.module.css';

type Props=ComponentPropsWithRef<'a'>&{variant?:'primary'|'secondary'};

export default function ActionLink({children,className='',variant='primary',...props}:Props){
  return <TextLink {...props} className={`${styles.root} ${variant==='secondary'?styles.secondary:''} ${className}`}>{children}</TextLink>;
}
