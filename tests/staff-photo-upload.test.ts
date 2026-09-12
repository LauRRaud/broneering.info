import {it,expect} from 'vitest';
import sharp from 'sharp';
import {normalizeStaffPhoto,readPhotoUpload,PHOTO_MAX_BYTES,photoResponse} from '../src/lib/staff-photos';

it('rejects SVG and invalid binary content even when the caller labels it as an image',async()=>{
  await expect(normalizeStaffPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'))).rejects.toMatchObject({code:'INVALID_PHOTO'});
  await expect(normalizeStaffPhoto(Buffer.from('not an image'))).rejects.toMatchObject({code:'INVALID_PHOTO'});
  await expect(readPhotoUpload(new Request('http://localhost',{method:'PUT',headers:{'Content-Type':'image/svg+xml'},body:'<svg/>'}))).rejects.toMatchObject({code:'INVALID_PHOTO'});
});
it('limits streamed body size without trusting Content-Length',async()=>{
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(PHOTO_MAX_BYTES+1));},cancel(){cancelled=true;}});
  const request={headers:new Headers({'content-type':'image/jpeg'}),body:stream} as Request;
  await expect(readPhotoUpload(request)).rejects.toMatchObject({code:'INVALID_PHOTO'});
  expect(cancelled).toBe(true);
});
it('accepts raw PNG upload and returns only a normalized, non-cacheable JPEG',async()=>{
  const source=await sharp({create:{width:20,height:30,channels:4,background:'#ff000080'}}).png().toBuffer();
  const input=await readPhotoUpload(new Request('http://localhost',{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(source)}));
  const output=await normalizeStaffPhoto(input),response=photoResponse(output);
  expect((await sharp(output).metadata()).format).toBe('jpeg');
  expect(response.headers.get('content-type')).toBe('image/jpeg');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});
