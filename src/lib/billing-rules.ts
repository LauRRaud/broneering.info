import {DateTime} from 'luxon';

/** Amounts are euro cents; rates are hundredths of one percent. */
export const STANDARD_PLAN = Object.freeze({
  id: 'e3a9a986-fc1f-4d22-b548-99e18f6a7929', version: 1, code: 'standard',
  monthlyPrice: 3500, currency: 'EUR', staffLimit: null, trialDays: 0,
  taxIncluded: true, paymentTermDays: 7, graceDays: 0,
});

function integer(value: number, min: number, max: number, name: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`Invalid ${name}`);
}

function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Invalid billing date');
  const parsed = DateTime.fromISO(value, {zone: 'UTC'});
  if (!parsed.isValid || parsed.toISODate() !== value) throw new RangeError('Invalid billing date');
  return parsed;
}

/** Half-open calendar period. Persist anchorDay once, never derive it from February's end. */
export function monthlyPeriod(start: string, anchorDay: number = date(start).day) {
  integer(anchorDay, 1, 31, 'anchor day');
  const first = date(start);
  if (first.day !== Math.min(anchorDay, first.daysInMonth!)) throw new RangeError('Period start differs from anchor');
  const next = first.startOf('month').plus({months: 1});
  const end = next.set({day: Math.min(anchorDay, next.daysInMonth!)}).toISODate();
  if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new RangeError('Billing date out of range');
  return {start, end, anchorDay};
}

/** Explicit configured tax rate, no inferred registration or statutory rate. Round half up. */
export function includedTax(total: number, rateBasisPoints: number) {
  integer(total, 1, 100_000_000, 'total');
  integer(rateBasisPoints, 0, 10_000, 'tax rate');
  const denominator = BigInt(10_000 + rateBasisPoints);
  const numerator = BigInt(total) * 10_000n;
  const subtotal = Number((numerator * 2n + denominator) / (denominator * 2n));
  return {subtotal, tax: total - subtotal, total, currency: 'EUR' as const};
}

/** Issuance date must be taken in the company's billing calendar, not the server zone. */
export function invoiceDueDate(issuedOn: string) {
  const result = date(issuedOn).plus({days: STANDARD_PLAN.paymentTermDays}).toISODate();
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new RangeError('Billing date out of range');
  return result;
}

/** Due day and all agreed grace days are inclusive, in the company's local calendar. */
export function bookingRestrictionDate(dueDate: string, graceDays: number) {
  integer(graceDays, 0, 365, 'grace days');
  const result = date(dueDate).plus({days: graceDays + 1}).toISODate();
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new RangeError('Billing date out of range');
  return result;
}
