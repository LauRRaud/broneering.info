import {acceptProviderCallback} from '@/lib/payment-http';
import {errorResponse} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){try{const c=await acceptProviderCallback(request);return new Response(null,{status:303,headers:{Location:c.origin+'/?payment=processing','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(error){return errorResponse(error,request);}}
