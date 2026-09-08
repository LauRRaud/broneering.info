/** Only explicit booking-engine rejections resolve an idempotent command.
 * Admission failures and unreadable/unknown replies say nothing about an earlier
 * committed request whose response was lost. Both browser flows keep its key.
 */
export function isDefinitiveBookingRejection(status:number,code:unknown):boolean{
 if(status<400||status>=500||status===429||typeof code!=='string')return false;
 return ['INVALID_INPUT','RULES_CHANGED','STAFF_UNAVAILABLE','SLOT_UNAVAILABLE','OFFER_CHANGED',
  'VERSION_CONFLICT','BOOKING_NOT_ACTIVE','BOOKING_CANCELLED','TOO_EARLY',
  'CUTOFF_PASSED','SERVICE_CHANGED'].includes(code);
}
