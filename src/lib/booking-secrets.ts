import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes} from 'node:crypto';

export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const randomBookingToken=()=>randomBytes(32).toString('base64url');
function key(){
  const secret=process.env.AUTH_SECRET;
  if(!secret||secret.length<32)throw new Error('Booking secret configuration is missing');
  return createHmac('sha256',secret).update('broneering.info/booking-replies/v1').digest();
}
// An encrypted copy allows a lost response to be replayed without storing a bearer token in plaintext.
export function sealBookingReply(value:unknown,context:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(part=>part.toString('base64url')).join('.');
}
export function openBookingReply<T>(value:string,context:string):T{
  const parts=value.split('.');if(parts.length!==3)throw new Error('Invalid encrypted reply');
  const [iv,tag,data]=parts.map(part=>Buffer.from(part,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',key(),iv);decipher.setAAD(Buffer.from(context));decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8')) as T;
}
