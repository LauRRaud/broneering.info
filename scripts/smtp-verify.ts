import {smtpConfigured,smtpTransport} from '../src/lib/auth-mail';
async function main(){
  if(!smtpConfigured())throw new Error('SMTP configuration is incomplete');
  await smtpTransport().verify();
  console.log('SMTP connection, TLS and authentication succeeded; no email was sent.');
}
main().catch(()=>{console.error('SMTP verification failed. Check private configuration and mail-server logs.');process.exitCode=1;});
