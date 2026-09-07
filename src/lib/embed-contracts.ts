/** v1 messages deliberately contain layout only: never booking IDs or customer data. */
export type EmbedMessage = {type:'broneering:init'|'broneering:ready'|'broneering:resize'|'broneering:close';version:1;channel:string;height?:number};
export function validEmbedMessage(data:unknown,type:EmbedMessage['type']): data is EmbedMessage {
  if(!data || typeof data!=='object' || Array.isArray(data))return false;
  const value=data as Record<string,unknown>;
  const control=type==='broneering:init'||type==='broneering:close';
  const keys=control?['type','version','channel']:['type','version','channel','height'];
  return Object.keys(value).length===keys.length && Object.keys(value).every(k=>keys.includes(k)) &&
    value.type===type && value.version===1 && typeof value.channel==='string' && /^[a-f0-9]{32}$/.test(value.channel) &&
    (control||(Number.isInteger(value.height)&&Number(value.height)>=100&&Number(value.height)<=20000));
}

export function canonicalEmbedOrigin(value:string,allowLocal=false):string {
  if(value.length>300)throw new Error('Veebiaadress on liiga pikk.');
  const url=new URL(value.trim());
  const local=url.hostname==='localhost'||url.hostname==='127.0.0.1'||url.hostname.endsWith('.localhost');
  if((url.protocol!=='https:' && !(allowLocal && local && url.protocol==='http:')) || url.username || url.password ||
    url.pathname!=='/' || url.search || url.hash || url.hostname.includes('*') || url.hostname.endsWith('.')) {
    throw new Error('Sisesta täpne HTTPS-kodulehe aadress ilma teekonna ja metamärkideta.');
  }
  return url.origin;
}

function html(value:string){return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
export function installationCode(bookingUrl:string,scriptUrl:string,parentOrigin:string) {
  const target=new URL('/embed',bookingUrl);target.searchParams.set('parent',parentOrigin);
  return {
    link:`<a href="${html(bookingUrl)}">Broneeri aeg</a>`,
    inline:`<iframe src="${html(target.toString())}" data-booking-frame title="Aja broneerimine" width="100%" height="700" loading="lazy" referrerpolicy="no-referrer"></iframe>\n<p><a href="${html(bookingUrl)}">Ava broneerimisleht</a></p>\n<script src="${html(scriptUrl)}" defer></script>`,
    modal:`<a href="${html(bookingUrl)}" data-booking-modal>Broneeri aeg</a>\n<script src="${html(scriptUrl)}" defer></script>`,
  };
}
