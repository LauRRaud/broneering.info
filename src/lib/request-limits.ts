import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {pool} from './db';
import {AppError} from './errors';

/** Nginx replaces this header with the socket peer address before proxying. */
export function trustedClientIp(request:Request) {
  const ip=process.env.NODE_ENV==='production'?request.headers.get('x-real-ip')??'':request.headers.get('x-real-ip')??'127.0.0.1';
  if(!isIP(ip))throw new AppError(503,'CLIENT_IP_MISSING','Teenus on hetkel hõivatud.');
  return ip;
}

/** Scopes must come from a resolved tenant or authenticated user, not raw headers. */
export async function limitTenant(key:string,maximum:number) {
  if (!key || !Number.isInteger(maximum) || maximum<1 || maximum>10000) throw new Error('Invalid request limit');
  let allowed:boolean;
  try {
    const result=await pool().query<{allowed:boolean}>('SELECT consume_request_limit($1,$2) AS allowed',[createHash('sha256').update(key).digest('hex'),maximum]);
    allowed=result.rows[0]?.allowed===true;
  }catch{
    throw new AppError(503,'BUSY','Teenus on hetkel hõivatud.');
  }
  if(!allowed)throw new AppError(429,'RATE_LIMIT','Päringuid on korraga liiga palju. Proovi minuti pärast.');
}
