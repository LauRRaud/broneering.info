import {it,expect} from 'vitest';
import {isDefinitiveBookingRejection} from '../src/lib/booking-mutation-outcome';
it('preserves uncertain commands across admission failures, malformed and unknown replies',()=>{
 for(const [status,code] of [[429,'RATE_LIMIT'],[429,'SLOT_UNAVAILABLE'],[401,'UNAUTHENTICATED'],[403,'ORIGIN_REJECTED'],[400,undefined],[404,'NOT_FOUND'],[400,'INVALID_JSON'],[409,'IDEMPOTENCY_CONFLICT'],[503,'SLOT_UNAVAILABLE'],[200,'SLOT_UNAVAILABLE']] as const)expect(isDefinitiveBookingRejection(status,code)).toBe(false);
});
it('permits choosing a fresh offer only after an explicit booking rejection',()=>{
 for(const code of ['SLOT_UNAVAILABLE','OFFER_CHANGED','RULES_CHANGED','STAFF_UNAVAILABLE','VERSION_CONFLICT'])expect(isDefinitiveBookingRejection(409,code)).toBe(true);
 expect(isDefinitiveBookingRejection(403,'CUTOFF_PASSED')).toBe(true);
});
