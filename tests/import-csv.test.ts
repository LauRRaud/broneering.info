import {describe, expect, it} from 'vitest';
import {CSV_MAX_BYTES, CSV_MAX_ROWS, parseImportCsv, readCsvUpload} from '../src/lib/import-csv';

describe('bounded import CSV input', () => {
  it('preserves quoted delimiters, newlines, escaped quotes, unicode and blank final cells', () => {
    const result = parseImportCsv('\uFEFFname;note;email\r\nÕie;"a; b\r\n""c""";\r\n', ';');
    expect(result.headers).toEqual(['name', 'note', 'email']);
    expect(result.rows).toEqual([{rowNumber: 2, values: ['Õie', 'a; b\r\n"c"', ''], error: null}]);
  });
  it('reports row widths without shifting cells or silently discarding empty rows', () => {
    expect(parseImportCsv('a,b\n1\n\n2,3,4').rows.map(r => [r.rowNumber, r.error])).toEqual([
      [2, 'CSV_ROW_WIDTH'], [3, 'CSV_ROW_WIDTH'], [4, 'CSV_ROW_WIDTH'],
    ]);
    expect(parseImportCsv('a,b\n,').rows[0].values).toEqual(['', '']);
  });
  it('rejects malformed quotes, duplicate headers, controls and empty data', () => {
    for (const value of ['', 'a,b\n', 'a,a\nx,y', 'a, \nx,y', 'a\n"open', 'a\nx"y', 'a\n"x"y', 'a\nx\0']) {
      expect(() => parseImportCsv(value)).toThrow();
    }
  });
  it('enforces field, column, row and byte bounds', () => {
    expect(() => parseImportCsv('a\n' + 'x'.repeat(16_385))).toThrow();
    expect(() => parseImportCsv(Array.from({length: 65}, (_, i) => `h${i}`).join(',') + '\nx')).toThrow();
    expect(parseImportCsv('a\n' + 'x\n'.repeat(CSV_MAX_ROWS)).rows).toHaveLength(CSV_MAX_ROWS);
    expect(() => parseImportCsv('a\n' + 'x\n'.repeat(CSV_MAX_ROWS + 1))).toThrow();
    expect(() => parseImportCsv('õ'.repeat(CSV_MAX_BYTES / 2 + 1))).toThrow();
  });
  it('rejects invalid UTF-8 and incorrect media types', async () => {
    const upload = (body: BodyInit, type = 'text/csv') => new Request('http://localhost', {method: 'POST', headers: {'Content-Type': type}, body});
    expect(await readCsvUpload(upload('name\nÕie', 'text/csv; charset=utf-8'))).toBe('name\nÕie');
    await expect(readCsvUpload(upload(new Uint8Array([0xc3, 0x28])))).rejects.toMatchObject({code: 'CSV_ENCODING'});
    await expect(readCsvUpload(upload('a\nb', 'application/json'))).rejects.toMatchObject({code: 'CSV_CONTENT_TYPE'});
    await expect(readCsvUpload(upload('x'.repeat(CSV_MAX_BYTES + 1)))).rejects.toMatchObject({code: 'CSV_TOO_LARGE'});
  });
});
