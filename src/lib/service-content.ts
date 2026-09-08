import type {PoolClient} from 'pg';
import type {Locale} from './locales';
export async function serviceNameFor(client:PoolClient,tenantId:string,serviceId:string,language:Locale){
  const result=await client.query<{name:string}>(`SELECT COALESCE(tr.published_name,s.name) AS name FROM services s
    LEFT JOIN service_translations tr ON tr.tenant_id=s.tenant_id AND tr.service_id=s.id AND tr.language=$3
      AND tr.language<>s.source_language AND tr.published_source_version=s.content_version
    WHERE s.tenant_id=$1 AND s.id=$2`,[tenantId,serviceId,language]);
  return result.rows[0]?.name;
}
