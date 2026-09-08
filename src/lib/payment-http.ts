import {makeCommerceConfig} from './makecommerce';
import {receivePaymentEvent} from './payment-events';
import {AppError} from './errors';
export async function acceptProviderCallback(request:Request){
 const config=makeCommerceConfig(),url=new URL(request.url);
 if(request.headers.get('host')!==new URL(config.origin).host)throw new AppError(404,'NOT_FOUND','Lehte ei leitud.');
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new AppError(415,'PAYMENT_FORMAT_INVALID','Makse teate vorming on vigane.');
 const reader=request.body?.getReader();if(!reader)throw new AppError(400,'EMPTY_BODY','Päringu sisu puudub.');
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>65536){await reader.cancel();throw new AppError(413,'BODY_TOO_LARGE','Päring on liiga suur.');}chunks.push(next.value);}
 const form=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
 if(form.getAll('json').length!==1||form.getAll('mac').length!==1||url.searchParams.getAll('tenantId').length!==1||url.searchParams.getAll('attemptId').length!==1)throw new AppError(400,'PAYMENT_FORMAT_INVALID','Makse teate vorming on vigane.');
 await receivePaymentEvent(url.searchParams.get('tenantId')!,url.searchParams.get('attemptId')!,form.get('json')!,form.get('mac')!);
 return config;
}
