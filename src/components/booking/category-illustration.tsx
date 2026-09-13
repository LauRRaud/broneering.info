import {useId} from 'react';
import type {IconName} from '@/components/ui/icon/icon';

// The actual ink bounds, excluding the sheet's uneven whitespace and stray pixels.
const artwork:Partial<Record<IconName,{position:[number,number];bounds:[number,number,number,number]}>>={
  scissors:{position:[0,0],bounds:[82,111,481,478]},
  lotus:{position:[1,0],bounds:[43,183,493,329]},
  lashes:{position:[0,1],bounds:[124,144,445,287]},
  hand:{position:[1,1],bounds:[81,56,390,484]},
};

/** Theme-colored line art from a single shared illustration sheet. */
export default function CategoryIllustration({name}:{name:IconName}){
  const id=useId(),drawing=artwork[name];
  if(!drawing)return null;
  const {position,bounds:[x,y,width,height]}=drawing,side=Math.max(width,height)*1.15;
  return <svg width="120" height="120" viewBox={`${x+(width-side)/2} ${y+(height-side)/2} ${side} ${side}`} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={id+'-clip'}><rect x={x} y={y} width={width} height={height}/></clipPath>
      <mask id={id+'-mask'} maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600" style={{maskType:'alpha'}}>
        <image href="/illustrations/beauty-categories.webp" x={-position[0]*600} y={-position[1]*600} width="1200" height="1200"/>
      </mask>
    </defs>
    <rect width="600" height="600" fill="currentColor" mask={'url(#'+id+'-mask)'} clipPath={'url(#'+id+'-clip)'}/>
  </svg>;
}
