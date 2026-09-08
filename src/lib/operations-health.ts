import {readdir} from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

export async function probeDatabase():Promise<boolean>{
  if(!process.env.DATABASE_URL)return false;
  const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:3000,query_timeout:3000,statement_timeout:3000});
  // The probe owns its connection, so timeout cleanup cannot exhaust the app pool.
  client.on('error',()=>{});
  try{
    const required=(await readdir(path.join(process.cwd(),'db/migrations'))).filter(name=>/^\d+_.+\.sql$/.test(name));
    if(!required.length)return false;
    await client.connect();
    const role=(await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if(!role || role.rolsuper!==false || role.rolbypassrls!==false)return false;
    const applied=new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(row=>row.name));
    return required.every(name=>applied.has(name));
  }catch{return false;}finally{await client.end().catch(()=>{});}
}

export async function readinessResponse(probe:()=>Promise<boolean>=probeDatabase):Promise<Response>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const ready=await Promise.race([Promise.resolve().then(probe),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),5000);})]);
    return Response.json({status:ready?'ready':'unavailable'},{status:ready?200:503,headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
  finally{clearTimeout(timer);}
}
