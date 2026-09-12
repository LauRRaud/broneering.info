// Transcribed from the owner's four screenshots on 2026-09-12. Prices are cents.
export type DemoService={key:string;path:string[];name:string;price:number;duration:number;durationSource:'screenshot'|'demo'};
const rows:DemoService[]=[];
function add(key:string,path:string[],name:string,price:number,duration:number,durationSource:DemoService['durationSource']='demo'){
 rows.push({key,path,name,price:price*100,duration,durationSource});
}
const lengths=['Ülipikad juuksed','Pikad juuksed','Poolpikad juuksed','Lühikesed juuksed'];
for(const [key,title,prices,times] of [
 ['highlights','Salgutamine + lõikus + föönisoeng',[110,90,80,70],[210,180,150,120]],
 ['roots-highlights','Põhi + salk + föön',[120,100,90,80],[240,210,180,150]],
 ['colour','Värvimine + lõikus + föönisoeng',[100,90,80,70],[180,150,120,105]],
] as const){
 lengths.forEach((length,index)=>add(`${key}-${index}`,['Juuksur',title],`${title} — ${length.toLocaleLowerCase('et')}`,prices[index],times[index]));
}
for(const [key,name,price,duration] of [
 ['women-cut','Naiste lõikus',35,45],['men-cut','Meeste lõikus',25,30],['clipper','Masinalõikus',15,20],
 ['ends','Juuste otste tasandamine',20,30],['fringe','Tuka lõikus',10,15],['blowdry','Pesu + föönisoeng',25,45],
 ['updo','Ülespandud soeng',35,60],['half-updo','Osaliselt ülespandud soeng',35,45],
] as const)add(key,['Juuksur','Lõikused ja soengud'],name,price,duration);
for(const [key,name,price,duration] of [
 ['mega','Megamõnnatamine, 2 h',80,120],['classic90','Klassikaline massaaž, 1,5 h',60,90],
 ['classic60','Klassikaline massaaž, 1 h',45,60],['aroma','Aroomimassaaž, 1,5 h',55,90],
 ['reflex','Reflektoorne jalabaateraapia, 1,5 h',40,90],['back','Selg / turi / kael, 30 min',30,30],
 ['children','Laste massaaž, 30 min',25,30],['legs','Jalad, 30 min',20,30],
] as const)add(key,['Massaaž'],name,price,duration,'screenshot');
for(const [key,title,install,maintenance] of [
 ['classic-lashes','Klassikalised ripsmepikendused',35,30],['hybrid-lashes','Hübriidripsmepikendused',45,40],
] as const){
 add(`${key}-install`,['Ripsmed',title],`${title} — paigaldus / teise tehniku hooldus`,install,120);
 add(`${key}-maintenance`,['Ripsmed',title],`${title} — hooldus`,maintenance,90);
}
add('pedicure-gel',['Küünehooldus','Pediküür'],'Spa-pediküür + geellakk',35,75);
add('pedicure',['Küünehooldus','Pediküür'],'Spa-pediküür geellakita',30,60);
export const iluteguDemoServices:readonly DemoService[]=rows;
export const iluteguDemoNotice='Ilutegu hinnakirja näidisdemo. Töötajad ja töögraafikud on väljamõeldud. Massaažide kestused pärinevad hinnakirjast; teiste teenuste kestused on ajutised näidisajad. Siin ei tehta Ilutegu pärisbroneeringuid.';
