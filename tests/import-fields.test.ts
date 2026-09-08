import {it,expect} from 'vitest';
import {normalizeImportRow,importTemplate,importFields,validateImportMapping} from '../src/lib/import-fields';
import {parseImportCsv} from '../src/lib/import-csv';
import {randomUUID} from 'node:crypto';
it('distinguishes both DST fold occurrences and refuses nonexistent local times and missing offsets',()=>{
  const values=['old-1',randomUUID(),randomUUID(),'Test Person','','','2030-10-27T03:30:00+03:00','3500','60','0','0'];
  const mapping=Object.fromEntries(importFields.bookings.map((key,index)=>[key,index]));
  const normalize=(time:string)=>normalizeImportRow('bookings',values.map((v,i)=>i===6?time:v),mapping,'Europe/Tallinn','2030-01-01T00:00:00Z',0);
  expect(normalize('2030-10-27T03:30:00+03:00')).toMatchObject({data:{startAt:'2030-10-27T00:30:00.000Z'},errors:[]});
  expect(normalize('2030-10-27T03:30:00+02:00')).toMatchObject({data:{startAt:'2030-10-27T01:30:00.000Z'},errors:[]});
  expect(normalize('2030-03-31T03:30:00+02:00').errors).toEqual(['BOOKING_TIMEZONE']);
  expect(normalize('2030-10-27T03:30:00').errors).toEqual(['BOOKING_TIMEZONE']);
  expect(normalize('2029-12-31T12:00:00+02:00').errors).toEqual(['BOOKING_PAST']);
});
it('provides complete parseable templates with distinct required mappings',()=>{
  for(const kind of ['services','staff','customers','bookings'] as const){
    const csv=parseImportCsv(importTemplate(kind));
    expect(csv.headers).toEqual(importFields[kind]);expect(csv.rows[0].error).toBeNull();
    expect(()=>validateImportMapping(kind,csv.headers,Object.fromEntries(csv.headers.map((key,i)=>[key,i])))).not.toThrow();
  }
});
