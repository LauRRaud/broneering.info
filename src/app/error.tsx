'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main><h1>Lehte ei saanud laadida</h1><p>Ühendus teenusega katkes. Palun proovi uuesti.</p><button onClick={reset}>Proovi uuesti</button></main>;
}
