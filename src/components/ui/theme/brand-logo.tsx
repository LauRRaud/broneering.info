'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {useTheme} from './theme-surface';
import {needsLogoContrast,sampleLogo,type LogoSample} from './logo-contrast';
import styles from './brand-logo.module.css';

function LogoVariant({url,backgrounds,className,fallback}:{url:string;backgrounds:string[];className:string;fallback:string}){
  const [failed,setFailed]=useState(false),[sample,setSample]=useState<LogoSample>();
  const imageRef=useRef<HTMLImageElement>(null);
  function analyze(image:HTMLImageElement){
    try{
      const canvas=document.createElement('canvas'),scale=Math.min(1,240/image.naturalWidth,120/image.naturalHeight);
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;
      context.drawImage(image,0,0,canvas.width,canvas.height);
      setSample(sampleLogo(context.getImageData(0,0,canvas.width,canvas.height).data));
    }catch{/* Keep the original image when the browser cannot inspect its pixels. */}
  }
  useEffect(()=>{const image=imageRef.current;if(image?.complete&&image.naturalWidth)analyze(image);},[]);
  const monochrome=sample?needsLogoContrast(sample,backgrounds):false;
  return <span className={className}>{failed?fallback:<span className={styles.image} data-transparent={sample?.transparent||undefined} data-monochrome={monochrome||undefined} style={{'--logo-needs-monochrome':monochrome?1:0} as CSSProperties}>
    <img ref={imageRef} src={url} alt="" onLoad={event=>analyze(event.currentTarget)} onError={()=>setFailed(true)}/>
    <span className={styles.silhouette} style={{maskImage:'url('+JSON.stringify(url)+')'}}/>
  </span>}</span>;
}

export default function BrandLogo({fallback=''}:{fallback?:string}){
  const theme=useTheme();
  if(!theme.lightLogo&&!theme.darkLogo)return null;
  return <span className={styles.logo} aria-hidden="true">
    <LogoVariant key={'light:'+theme.lightLogo+theme.darkLogo} url={(theme.lightLogo??theme.darkLogo)!} backgrounds={[theme.config.light.background,theme.config.light.surface]} className={styles.light} fallback={fallback}/>
    <LogoVariant key={'dark:'+theme.darkLogo+theme.lightLogo} url={(theme.darkLogo??theme.lightLogo)!} backgrounds={[theme.config.dark.background,theme.config.dark.surface]} className={styles.dark} fallback={fallback}/>
  </span>;
}
