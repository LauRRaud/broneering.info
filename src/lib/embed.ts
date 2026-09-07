import {withTenant} from './db';
import {audit,requireOwnerInTransaction,type Actor} from './access';
import {canonicalEmbedOrigin} from './embed-contracts';
import {AppError} from './errors';

export async function embedOrigins(tenantId:string):Promise<string[]> {
  return withTenant(tenantId,async client=>{
    const rows=await client.query<{origin:string}>('SELECT origin FROM tenant_embed_origins WHERE tenant_id=$1 ORDER BY origin',[tenantId]);
    return rows.rows.map(row=>canonicalEmbedOrigin(row.origin,process.env.NODE_ENV!=='production'));
  });
}
export async function saveEmbedOrigins(actor:Actor,tenantId:string,origins:string[]) {
  if(origins.length>10)throw new AppError(400,'TOO_MANY_ORIGINS','Lubatud on kuni 10 kodulehe aadressi.');
  let normalized:string[];
  try {normalized=[...new Set(origins.map(o=>canonicalEmbedOrigin(o,process.env.NODE_ENV!=='production')))];}
  catch {throw new AppError(400,'INVALID_EMBED_ORIGIN','Sisesta täpsed HTTPS-aadressid ilma teekondade ja metamärkideta.');}
  await withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    await client.query('DELETE FROM tenant_embed_origins WHERE tenant_id=$1',[tenantId]);
    for(const origin of normalized)await client.query('INSERT INTO tenant_embed_origins(tenant_id,origin) VALUES($1,$2)',[tenantId,origin]);
    await audit(client,tenantId,actor.id,'embedding.origins.updated',undefined,undefined,{origins:normalized});
  });
}
export async function embeddingSettings(actor:Actor,tenantId:string) {
  return withTenant(tenantId,async client=>{
    await requireOwnerInTransaction(actor,tenantId,client);
    const origins=await client.query<{origin:string}>('SELECT origin FROM tenant_embed_origins WHERE tenant_id=$1 ORDER BY origin',[tenantId]);
    const domains=await client.query<{hostname:string;ready:boolean}>('SELECT hostname,ready FROM tenant_domains WHERE tenant_id=$1 ORDER BY hostname',[tenantId]);
    return {origins:origins.rows.map(r=>r.origin),domains:domains.rows};
  });
}
