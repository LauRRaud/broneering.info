type Pixel={r:number;g:number;b:number;alpha:number};
export type LogoSample={transparent:boolean;pixels:Pixel[]};
const luminance=(r:number,g:number,b:number)=>{
  const linear=(value:number)=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
  return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);
};

/** Ignore the transparent margin and faint antialiasing when judging the artwork. */
export function sampleLogo(data:Uint8ClampedArray):LogoSample{
  const pixels:Pixel[]=[];let transparent=0;
  for(let i=0;i<data.length;i+=4){
    const alpha=data[i+3]/255;
    if(alpha<.1)transparent++;
    if(alpha>=.65)pixels.push({r:data[i],g:data[i+1],b:data[i+2],alpha});
  }
  return {transparent:transparent>data.length/4*.1,pixels};
}

export function needsLogoContrast(sample:LogoSample,backgrounds:string[]){
  if(!sample.transparent||!sample.pixels.length)return false;
  return backgrounds.some(hex=>{
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),background=luminance(r,g,b);
    let lowContrast=0,total=0;
    for(const pixel of sample.pixels){
      const a=pixel.alpha,foreground=luminance(pixel.r*a+r*(1-a),pixel.g*a+g*(1-a),pixel.b*a+b*(1-a));
      const ratio=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
      total+=a;if(ratio<3)lowContrast+=a;
    }
    return lowContrast/total>.15;
  });
}
