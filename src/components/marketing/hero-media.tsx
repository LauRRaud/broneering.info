import Image from 'next/image';
import styles from './hero-media.module.css';
type HeroImage={src:string;alt:string;width:number;height:number};
// The owner supplies the hero image. Do not generate a substitute product mockup.
export default function HeroMedia({image}:{image?:HeroImage}){
  return <div className={styles.root} data-empty={!image||undefined} aria-hidden={!image||undefined}>
    {image&&<Image {...image} className={styles.image} sizes="(max-width: 800px) 100vw, 50vw" preload/>}
  </div>;
}
