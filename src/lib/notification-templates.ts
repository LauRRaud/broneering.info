import {translator,formatMoney} from './i18n';
import {localeTags,type Locale} from './locales';
import type {BookingRow} from './booking-records';
import type {NotificationMail} from './notification-mail';
export function notificationMessage(input:{id:string;kind:string;language:Locale;to:string;company:boolean;booking:BookingRow;tenant:{name:string;address:string;timezone:string;contact_email:string;contact_phone:string};managementUrl?:string}):NotificationMail{
  const t=translator(input.language),b=input.booking;
  const kind=input.kind.replace(/^company\./,'');
  const title=t(kind==='booking.cancelled'?'Broneering on tühistatud':kind==='booking.changed'?'Broneeringut on muudetud':kind==='booking.reminder'?'Broneeringu meeldetuletus':'Broneering on kinnitatud');
  const when=new Intl.DateTimeFormat(localeTags[input.language],{dateStyle:'full',timeStyle:'short',timeZone:input.tenant.timezone}).format(b.start_at);
  const lines=[title,'',input.tenant.name,input.tenant.address,`${t('Broneeringu number')}: ${b.reference}`,`${t('Teenus')}: ${b.service_name}`,`${t('Töötaja')}: ${b.staff_name}`,`${t('Aeg')}: ${when} (${input.tenant.timezone})`,`${t('Kestus')}: ${b.duration} min`,`${t('Hind')}: ${formatMoney(b.price,input.language)}`];
  if(input.company)lines.push(`${t('Nimi')}: ${b.customer_name}`);
  if(input.managementUrl&&!input.company)lines.push('',t('Broneeringu vaatamiseks või muutmiseks ava turvaline link:'),input.managementUrl);
  lines.push('',t('Küsimuste korral võta ettevõttega ühendust.'),[input.tenant.contact_email,input.tenant.contact_phone].filter(Boolean).join(' · '));
  return {to:input.to,...(input.tenant.contact_email?{replyTo:input.tenant.contact_email}:{}),subject:`${title} · ${b.reference}`,text:lines.join('\n'),messageId:`<booking-${input.id}@broneering.info>`};
}
