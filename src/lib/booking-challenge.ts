import {AppError} from './errors';
import {z} from 'zod';

const verificationUrl='https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function bookingChallengeSiteKey(){
  return process.env.TURNSTILE_SITE_KEY?.trim()||undefined;
}

export async function verifyBookingChallenge(request:Request,requestKey:string){
  const secret=process.env.TURNSTILE_SECRET_KEY?.trim();
  if(!secret||!bookingChallengeSiteKey()){
    if(process.env.NODE_ENV!=='production')return;
    throw new AppError(503,'CHALLENGE_UNAVAILABLE','Broneeringu turvakontroll pole hetkel kättesaadav.');
  }
  if(!z.uuid().safeParse(requestKey).success)throw new AppError(400,'INVALID_REQUEST_KEY','Broneeringu päringutunnus puudub või on vigane.');
  const token=request.headers.get('cf-turnstile-response')?.trim()??'';
  if(!token||token.length>2048)throw new AppError(403,'CHALLENGE_REQUIRED','Palun kinnita, et sa ei ole robot.');
  let result:{success?:boolean;hostname?:string;action?:string};
  try{
    const response=await fetch(verificationUrl,{method:'POST',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret,response:token,idempotency_key:requestKey})});
    if(!response.ok)throw new Error('challenge provider unavailable');
    result=await response.json();
  }catch{
    throw new AppError(503,'CHALLENGE_UNAVAILABLE','Broneeringu turvakontroll pole hetkel kättesaadav.');
  }
  const hostname=request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if(!result.success||result.action!=='booking'||!hostname||result.hostname?.toLowerCase()!==hostname)throw new AppError(403,'CHALLENGE_REJECTED','Turvakontroll ebaõnnestus. Palun proovi uuesti.');
}
