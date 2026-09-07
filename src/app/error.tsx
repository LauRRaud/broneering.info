'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{maxWidth:640,margin:'12vh auto',padding:32}}><h1>Lehte ei saanud laadida</h1><p>Ühendus teenusega katkes. Palun proovi uuesti.</p><button onClick={reset}>Proovi uuesti</button></main>;}
