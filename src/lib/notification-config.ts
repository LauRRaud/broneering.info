import {smtpConfigured} from './auth-mail';
export function bookingMailMode():'disabled'|'smtp'|'capture'{
  const value=process.env.BOOKING_MAIL_MODE??'disabled';
  if(!['disabled','smtp','capture'].includes(value))throw new Error('Invalid BOOKING_MAIL_MODE');
  return value as 'disabled'|'smtp'|'capture';
}
export function bookingMailConfigured(){
  const mode=bookingMailMode();
  return mode==='smtp'?smtpConfigured():mode==='capture'&&process.env.NODE_ENV!=='production';
}
