import {mkdir,open,chmod} from 'node:fs/promises';
import path from 'node:path';
import {smtpTransport} from './auth-mail';
import {bookingMailMode,bookingMailConfigured} from './notification-config';
export type NotificationMail={to:string;replyTo?:string;subject:string;text:string;messageId:string;attachments?:{filename:string;content:string;contentType:string}[]};
export async function sendNotificationMail(mail:NotificationMail):Promise<'sent'|'capture'>{
  if(!bookingMailConfigured())throw Object.assign(new Error('Notification transport unavailable'),{code:'MAIL_UNAVAILABLE'});
  return sendConfiguredMail(mail,bookingMailMode()==='smtp'?'smtp':'capture',process.env.BOOKING_MAIL_CAPTURE_DIR||path.join(process.cwd(),'output','booking-mail'));
}
export async function sendConfiguredMail(mail:NotificationMail,mode:'smtp'|'capture',captureDir:string):Promise<'sent'|'capture'>{
  if(mode==='capture'&&process.env.NODE_ENV==='production')throw new Error('Mail capture unavailable in production');
  if(/[\r\n]/.test(mail.to+(mail.replyTo??'')+mail.subject+mail.messageId))throw Object.assign(new Error('Invalid mail header'),{code:'INVALID_MAIL'});
  if(mode==='smtp'){
    const result=await smtpTransport().sendMail({...mail,from:process.env.SMTP_FROM!.trim()});
    if(!result.accepted?.length||result.rejected?.length)throw Object.assign(new Error('Recipient not accepted'),{code:'RECIPIENT_REJECTED',responseCode:550});
    return 'sent';
  }
  const root=path.resolve(captureDir);
  const relative=path.relative(process.cwd(),root).split(path.sep)[0]?.toLowerCase();
  if(['public','src','.next'].includes(relative))throw new Error('Mail capture directory must be private');
  await mkdir(root,{recursive:true,mode:0o700});await chmod(root,0o700);
  // Deterministic Message-ID prevents duplicate capture files after a lost commit.
  const file=path.join(root,mail.messageId.replace(/[^a-zA-Z0-9.-]/g,'_')+'.json');
  try{const handle=await open(file,'wx',0o600);try{await handle.writeFile(JSON.stringify(mail,null,2));}finally{await handle.close();}}
  catch(error){if((error as {code?:string}).code!=='EEXIST')throw error;}
  return 'capture';
}
