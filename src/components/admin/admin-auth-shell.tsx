import type {ReactNode} from 'react';
import Wordmark from '@/components/ui/wordmark/wordmark';
import SitePreferences from '@/components/ui/site-preferences/site-preferences';
import styles from './admin-auth-shell.module.css';

export default function AdminAuthShell({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}){
  return <main id="main-content" tabIndex={-1} className={styles.page} data-admin-auth>
    <header><Wordmark href="/"/><SitePreferences/></header>
    <div className={styles.layout}>
      <section className={styles.intro} aria-labelledby="auth-title">
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
        <span aria-hidden="true" className={styles.line}/>
      </section>
      <section className={styles.card}>{children}</section>
    </div>
  </main>;
}
