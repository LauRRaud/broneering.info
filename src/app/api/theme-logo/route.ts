import {tenantForHost} from '@/lib/tenants';
import {themeLogo} from '@/lib/themes';
import {errorResponse} from '@/lib/http';
export async function GET(request:Request){try{const tenant=await tenantForHost(request.headers.get('host')??''),q=new URL(request.url).searchParams;return await themeLogo(tenant.id,Number(q.get('version')),q.get('slot')??'');}catch(e){return errorResponse(e,request);}}
