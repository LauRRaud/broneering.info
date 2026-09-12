/** Only ordinary phone numbers can become a tel: link, never dial commands or URLs. */
export function publicPhoneHref(value:string):string|null {
  const phone=value.trim();
  if(phone.length>30||!/^\+?[0-9][0-9 ()-]*$/.test(phone))return null;
  const digits=phone.replace(/[^0-9]/g,'');
  if(digits.length<6||digits.length>15)return null;
  return `tel:${phone.startsWith('+')?'+':''}${digits}`;
}
