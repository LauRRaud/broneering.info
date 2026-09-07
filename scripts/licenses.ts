import { readFile, writeFile } from 'node:fs/promises';
async function main() {
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  const rows=Object.entries(lock.packages as Record<string,{version?:string;license?:string;dev?:boolean}>).filter(([name])=>name.startsWith('node_modules/')).map(([path,data])=>({name:path.replace(/^node_modules\//,''),...data}));
  const direct=new Set([...Object.keys(pkg.dependencies),...Object.keys(pkg.devDependencies)]);
  const lines=['# Sõltuvuste register','','Genereeritud lukufailist käsuga `npm run licenses`. Pakettide litsentsimärgised pärinevad nende avaldatud metaandmetest; see register ei anna õigust litsentsitingimusi eirata. Tarkvara tootmises väljastamisel tuleb säilitada nõutud litsentsi- ja autoriõiguste teated. Oma projekti litsentsi siin ei määrata.','','| Pakett | Versioon | Litsents | Kasutus |','| --- | --- | --- | --- |'];
  for(const row of rows.sort((a,b)=>a.name.localeCompare(b.name))) lines.push(`| ${row.name} | ${row.version??'—'} | ${row.license??'Kontrollida paketi LICENSE-failist'} | ${direct.has(row.name)?'Otsene':'Transitiivne'}${row.dev?' / arendus':''} |`);
  lines.push('','PostgreSQL-i ja Node.js-i konteinerid on lukustatud Dockerfile’is/Compose-failides digestiga. PostgreSQL kasutab PostgreSQL License’i; Node.js sisaldab MIT litsentsiga põhiosa ja eraldi kolmandate osapoolte teateid. Konteinerite operatsioonisüsteemi pakettidel on oma litsentsid. Uuendamisel tuleb register ja testid uuesti käivitada.','');
  await writeFile('docs/DEPENDENCIES.md',lines.join('\n'));
  console.log(`Recorded ${rows.length} package entries`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
