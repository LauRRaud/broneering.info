import {describe, expect, it} from 'vitest';
import {bookingRestrictionDate, includedTax, invoiceDueDate, monthlyPeriod, STANDARD_PLAN} from '../src/lib/billing-rules';

describe('monthly subscription rules', () => {
  it('keeps the agreed final price, unlimited staff and no trial', () => {
    expect(STANDARD_PLAN).toMatchObject({monthlyPrice:3500,currency:'EUR',staffLimit:null,trialDays:0,taxIncluded:true,paymentTermDays:7,graceDays:0});
  });
  it('restores the original day after short months and leap years', () => {
    let period=monthlyPeriod('2026-01-31');
    expect(period.end).toBe('2026-02-28');
    period=monthlyPeriod(period.end,period.anchorDay);
    expect(period.end).toBe('2026-03-31');
    expect(monthlyPeriod('2028-01-30').end).toBe('2028-02-29');
    expect(monthlyPeriod('2028-02-29',30).end).toBe('2028-03-30');
    expect(monthlyPeriod('2026-12-15').end).toBe('2027-01-15');
  });
  it('rejects invalid dates and a period inconsistent with its stored anchor', () => {
    for (const input of ['2026-02-29','2026-2-01','2026-01-01T00:00:00Z','bad']) expect(()=>monthlyPeriod(input)).toThrow();
    expect(()=>monthlyPeriod('2026-03-28',31)).toThrow();
    expect(()=>monthlyPeriod('2026-01-01',1.5)).toThrow();
  });
  it('splits gross cents without increasing the final price or losing rounding cents', () => {
    expect(includedTax(3500,0)).toMatchObject({subtotal:3500,tax:0,total:3500});
    // Illustrative configured rates; these tests assert no applicable tax policy.
    expect(includedTax(3500,2000)).toMatchObject({subtotal:2917,tax:583,total:3500});
    expect(includedTax(3500,2400)).toMatchObject({subtotal:2823,tax:677,total:3500});
    expect(includedTax(1,10000)).toMatchObject({subtotal:1,tax:0,total:1});
    for(let total=1;total<5000;total+=7) {
      const split=includedTax(total,2400);
      expect(split.subtotal+split.tax).toBe(total);
      expect(Number.isInteger(split.tax)).toBe(true);
    }
    expect(()=>includedTax(35.5,0)).toThrow();
    expect(()=>includedTax(3500,-1)).toThrow();
    expect(()=>includedTax(3500,10001)).toThrow();
  });
  it('starts restrictions only after the due day and explicitly agreed grace days', () => {
    expect(bookingRestrictionDate('2026-12-31',0)).toBe('2027-01-01');
    expect(bookingRestrictionDate('2028-02-28',1)).toBe('2028-03-01');
    expect(bookingRestrictionDate('2026-09-08',7)).toBe('2026-09-16');
    expect(()=>bookingRestrictionDate('2026-09-08',-1)).toThrow();
  });
  it('allows seven days from issue, with no grace after the payment deadline', () => {
    const due=invoiceDueDate('2026-09-08');
    expect(due).toBe('2026-09-15');
    expect(bookingRestrictionDate(due,STANDARD_PLAN.graceDays)).toBe('2026-09-16');
    expect(invoiceDueDate('2026-12-28')).toBe('2027-01-04');
    expect(invoiceDueDate('2028-02-23')).toBe('2028-03-01');
  });
});
