import {AppError} from './errors';

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 10_000;
const MAX_COLUMNS = 64;
const MAX_FIELD = 16_384;
function invalid(code: string) { return new AppError(400, code, 'CSV-faili vorming on vigane.'); }

/** Bounded UTF-8 input; do not trust Content-Length or silently replace invalid bytes. */
export async function readCsvUpload(request: Request): Promise<string> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/csv') {
    throw new AppError(415, 'CSV_CONTENT_TYPE', 'Fail peab olema CSV-vormingus.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw invalid('CSV_EMPTY');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CSV_MAX_BYTES) {
        await reader.cancel();
        throw new AppError(413, 'CSV_TOO_LARGE', 'CSV-fail on liiga suur.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)); }
  catch { throw invalid('CSV_ENCODING'); }
}

/** Explicit delimiter, quoted multiline cells and doubled quotes; no delimiter guessing. */
export function parseImportCsv(input: string, delimiter: ',' | ';' = ',') {
  if (delimiter !== ',' && delimiter !== ';') throw invalid('CSV_DELIMITER');
  if (Buffer.byteLength(input, 'utf8') > CSV_MAX_BYTES) throw new AppError(413, 'CSV_TOO_LARGE', 'CSV-fail on liiga suur.');
  const text = input.replace(/^\uFEFF/, '');
  if (!text.length) throw invalid('CSV_EMPTY');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) throw invalid('CSV_CONTROL_CHARACTER');
  const records: string[][] = [];
  let row: string[] = [], field = '', state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';
  const cell = () => {
    row.push(field);
    if (row.length > MAX_COLUMNS) throw invalid('CSV_COLUMNS');
    field = ''; state = 'start';
  };
  const record = () => {
    cell(); records.push(row); row = [];
    if (records.length > CSV_MAX_ROWS + 1) throw invalid('CSV_ROWS');
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else state = 'closed';
      } else field += char;
    } else if (char === delimiter) cell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record();
    } else if (char === '"' && state === 'start') state = 'quoted';
    else {
      if (char === '"' || state === 'closed') throw invalid('CSV_QUOTES');
      state = 'plain'; field += char;
    }
    if (field.length > MAX_FIELD) throw invalid('CSV_FIELD_TOO_LONG');
  }
  if (state === 'quoted') throw invalid('CSV_QUOTES');
  if (state !== 'start' || row.length || field.length) record();
  const headers = records.shift()!.map(value => value.trim());
  if (headers.some(value => !value || value.length > 128) || new Set(headers).size !== headers.length) throw invalid('CSV_HEADERS');
  if (!records.length) throw invalid('CSV_NO_ROWS');
  return {headers, rows: records.map((values, index) => ({
    rowNumber: index + 2, values, error: values.length === headers.length ? null : 'CSV_ROW_WIDTH',
  }))};
}
