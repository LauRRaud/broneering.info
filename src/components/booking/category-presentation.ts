import type {IconName} from '@/components/ui/icon/icon';
export function categoryPresentation(name:string):{icon:IconName;description:string}{
  const value=name.toLocaleLowerCase('et');
  if(/juuks|juukse/.test(value))return {icon:'scissors',description:'Lõikused, värvimine ja soengud'};
  if(/massaa|heaolu/.test(value))return {icon:'lotus',description:'Lõõgastus ja heaolu'};
  if(/rips/.test(value))return {icon:'lashes',description:'Ripsmepikendused ja hooldus'};
  if(/küün|manik|pedik/.test(value))return {icon:'hand',description:'Maniküür, pediküür ja küünehooldus'};
  return {icon:'spark',description:''};
}
