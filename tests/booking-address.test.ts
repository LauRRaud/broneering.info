import {expect,it} from 'vitest';
import {bookingAddress} from '../src/components/booking/booking-address';
it('keeps the street and locality while omitting a postal code from the booking summary',()=>{
 expect(bookingAddress('Teenuste 2, Tabasalu 76901')).toBe('Teenuste 2, Tabasalu');
 expect(bookingAddress('Teenuste 2, 76901 Tabasalu')).toBe('Teenuste 2, Tabasalu');
 expect(bookingAddress('Teenuste 2, EE-76901 Tabasalu')).toBe('Teenuste 2, Tabasalu');
});
it('preserves street numbers and addresses without an Estonian postal code',()=>{
 for(const address of ['Pikk 12345','Teenuste 2, Tabasalu','Tallinn','10 Downing Street, London SW1A 2AA'])expect(bookingAddress(address)).toBe(address);
});
