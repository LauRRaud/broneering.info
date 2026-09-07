import {NextRequest,NextResponse} from 'next/server';
import {tenantForHost} from './lib/tenants';
import {embedOrigins} from './lib/embed';
import {AppError} from './lib/errors';

export async function proxy(request:NextRequest) {
  const response=NextResponse.next();
  let ancestors="'none'";
  try {
    const tenant=await tenantForHost(request.headers.get('host')||'');
    const origins=await embedOrigins(tenant.id);
    if(origins.length)ancestors=origins.join(' ');
  }catch(error){
    if(!(error instanceof AppError && (error.status===404||error.status===400))){
      return new NextResponse('Manustatud vaade pole praegu kättesaadav.',{status:503,headers:{'Cache-Control':'no-store','Content-Security-Policy':"frame-ancestors 'none'"}});
    }
  }
  response.headers.set('Content-Security-Policy',`frame-ancestors ${ancestors}; object-src 'none'; base-uri 'self'`);
  response.headers.set('Cache-Control','no-store');
  response.headers.set('Vary','Host');
  return response;
}
export const config={matcher:['/embed']};
