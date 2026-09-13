/** Omit an Estonian postal code from the locality in the compact summary. */
export function bookingAddress(address:string){
  const parts=address.trim().split(/,\s*/);
  if(parts.length<2)return address.trim();
  const last=parts.length-1;
  parts[last]=parts[last].replace(/^(?:EE-)?\d{5}\s+(?=\p{L})/u,'').replace(/\s+(?:EE-)?\d{5}$/u,'');
  return parts.join(', ');
}
