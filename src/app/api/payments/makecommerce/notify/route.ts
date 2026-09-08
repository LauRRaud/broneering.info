import {acceptProviderCallback} from '@/lib/payment-http';
import {errorResponse,json} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){try{await acceptProviderCallback(request);return json({accepted:true},202);}catch(error){return errorResponse(error,request);}}
