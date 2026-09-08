import {z} from 'zod';
export type ContactField='name'|'email'|'phone';
export type ContactErrors=Partial<Record<ContactField,string>>;
export function contactErrors(input:Record<ContactField,string>):ContactErrors{
  const errors:ContactErrors={};
  if(input.name.trim().length<2||input.name.trim().length>120)errors.name='Sisesta teenuse saaja nimi (2–120 märki).';
  if(!z.email().max(254).safeParse(input.email.trim()).success)errors.email='Sisesta kehtiv e-posti aadress.';
  if(input.phone.trim().length>30||!/^[+\d ()-]*$/.test(input.phone.trim()))errors.phone='Telefonis on lubatud numbrid, +, tühikud, sulud ja sidekriips (kuni 30 märki).';
  return errors;
}
