'use client';
import Heading from '@/components/ui/heading/heading';
import BrandLogo from './brand-logo';
import {useTheme} from './theme-surface';
import styles from './brand-identity.module.css';

export default function BrandIdentity({name,as='h1'}:{name:string;as?:'h1'|'h2'|'h3'|'h4'}){
  const theme=useTheme();
  // Older saved themes with a logo continue to display that logo.
  const logo=theme.config.brandDisplay!=='name'&&!!(theme.lightLogo||theme.darkLogo);
  return <Heading as={as} className={styles.identity}>
    <span className={logo?styles.accessibleName:undefined}>{name}</span>
    {logo&&<BrandLogo fallback={name}/>}
  </Heading>;
}
