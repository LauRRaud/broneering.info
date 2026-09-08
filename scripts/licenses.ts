import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
async function noticeFiles(root:string,relative='',depth=0):Promise<string[]>{
 if(depth>12)throw new Error('License directory depth exceeded');
 const entries=await readdir(path.join(root,relative),{withFileTypes:true}),files:string[]=[];
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
  const name=path.join(relative,entry.name);
  if(entry.isFile()&&/^(licen[cs]e|notice|copying)([._-].*)?$/i.test(entry.name))files.push(name);
  else if(entry.isDirectory()&&entry.name!=='node_modules'&&entry.name!=='.git')files.push(...await noticeFiles(root,name,depth+1));
 }
 return files;
}
async function main() {
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  const rows=Object.entries(lock.packages as Record<string,{version?:string;license?:string;dev?:boolean}>).filter(([name])=>name.startsWith('node_modules/')).map(([path,data])=>({name:path.replace(/^node_modules\//,''),...data}));
  const direct=new Set([...Object.keys(pkg.dependencies),...Object.keys(pkg.devDependencies)]);
  const lines=['# Sõltuvuste register','','Genereeritud lukufailist käsuga `npm run licenses`. Pakettide litsentsimärgised pärinevad nende avaldatud metaandmetest; see register ei anna õigust litsentsitingimusi eirata. Tarkvara tootmises väljastamisel tuleb säilitada nõutud litsentsi- ja autoriõiguste teated. Oma projekti litsentsi siin ei määrata.','','| Pakett | Versioon | Litsents | Kasutus |','| --- | --- | --- | --- |'];
  for(const row of rows.sort((a,b)=>a.name.localeCompare(b.name))) lines.push(`| ${row.name} | ${row.version??'—'} | ${row.license??'Kontrollida paketi LICENSE-failist'} | ${direct.has(row.name)?'Otsene':'Transitiivne'}${row.dev?' / arendus':''} |`);
  lines.push('','PostgreSQL-i ja Node.js-i konteinerid on lukustatud Dockerfile’is/Compose-failides digestiga. PostgreSQL kasutab PostgreSQL License’i; Node.js sisaldab MIT litsentsiga põhiosa ja eraldi kolmandate osapoolte teateid. Konteinerite operatsioonisüsteemi pakettidel on oma litsentsid. Uuendamisel tuleb register ja testid uuesti käivitada.','');
  await writeFile('docs/DEPENDENCIES.md',lines.join('\n'));
  const notices=['THIRD-PARTY LICENSE AND COPYRIGHT NOTICES','',
   'Generated from installed packages matching package-lock.json by npm run licenses.',
   'Includes runtime and development packages, plus license/notice files bundled within them.',
   'Platform-specific packages absent from this installation and container OS packages require a separate deployment inventory.',''];
  const missing:string[]=[],absent:string[]=[];let files=0;
  for(const row of rows.sort((a,b)=>a.name.localeCompare(b.name))){
   const root=path.resolve('node_modules',row.name),base=path.resolve('node_modules')+path.sep;
   if(!root.startsWith(base))throw new Error('Invalid dependency path');
   let installed:{version?:string};
   try{installed=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));}
   catch(error){if((error as {code?:string}).code==='ENOENT'){absent.push(row.name);continue;}throw error;}
   if(installed.version!==row.version)throw new Error(`Installed version differs from lockfile: ${row.name}`);
   const found=await noticeFiles(root);
   if(!found.length){
    let embedded=false;
    for(const entry of await readdir(root))if(/^readme([._-].*)?$/i.test(entry)){
     const readme=await readFile(path.join(root,entry),'utf8');
     const section=readme.match(/^#{1,6}\s+licen[cs]e[^\n]*\n([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/im)?.[1];
     if(section&&/copyright/i.test(section)&&/permission is hereby granted/i.test(section)){
      notices.push('='.repeat(72),`${row.name}@${row.version} — ${entry} (license section)`,'='.repeat(72),'',section.trim(),'');files++;embedded=true;
     }
    }
    if(!embedded)missing.push(row.name);
   }
   for(const file of found){
    notices.push('='.repeat(72),`${row.name}@${row.version} — ${file.split(path.sep).join('/')}`,`Declared license: ${row.license??'unspecified'}`,'='.repeat(72),'',await readFile(path.join(root,file),'utf8'),'');files++;
   }
  }
  await writeFile('docs/THIRD-PARTY-NOTICES.txt',notices.join('\n'));
  const coverage=['# Litsentsitekstide katvus','',
   'See on paigaldatud pakettide failide loend, mitte õiguslik sobivusotsus. Register ei anna eritellimusel loodud koodile kolmandate osapoolte litsentsi.',
   '',`Lukufailis: ${rows.length} paketti. Selles paigalduses: ${rows.length-absent.length}. Kogutud LICENSE/NOTICE/COPYING faile: ${files}.`,
   '', '## Paigaldatud paketid ilma eraldi tuvastatud litsentsitekstita','',
   ...(missing.length?missing.map(name=>`- ${name}`):['Puuduvad.']),
   '', 'Need kirjed vajavad paketi avaldatud tingimuste ja README kontrolli enne levitamist; metaandmete litsentsisilt ei asenda litsentsiteksti.',
   '', '## Selle operatsioonisüsteemi paigaldusest puuduvad paketid','',
   ...absent.map(name=>`- ${name}`),'',
   'Linuxi konteineri paigalduses käivitatakse sama register uuesti. Konteineri operatsioonisüsteemi ja PostgreSQL-i teated kontrollitakse eraldi.',''];
  await writeFile('docs/LICENSE-COVERAGE.md',coverage.join('\n'));
  console.log(`Recorded ${rows.length} packages, ${files} notice files; ${missing.length} installed packages need license-text review; ${absent.length} absent on this platform`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
