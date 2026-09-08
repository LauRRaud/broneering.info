import {DateTime} from 'luxon';
import {translator,formatMoney} from './i18n';
import type {Locale} from './locales';
import type {InvoiceView} from './invoices';
const escape=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
/** Self-contained, script-free printable invoice. Values come only from the saved snapshot. */
export function invoiceDocument(invoice:InvoiceView,locale:Locale,paymentLink?:string|null){
 const t=translator(locale),label=(key:string)=>escape(t(key)),money=(value:number)=>escape(formatMoney(value,locale));
 const party=(value:{name?:string;registrationCode?:string;address?:string;country?:string;vatNumber?:string;email?:string})=>`<p>${escape(value.name)}<br>${label('Registrikood')}: ${escape(value.registrationCode)}<br>${escape(value.address)}<br>${escape(value.country)}<br>${escape(value.vatNumber)}<br>${escape(value.email)}</p>`;
 const lastDay=DateTime.fromISO(invoice.periodEnd,{zone:'UTC'}).minus({days:1}).toISODate(),documentLabel=invoice.kind==='credit'?'Kreeditarve':'Arve';
 return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${label(documentLabel)} ${escape(invoice.number)}</title></head><body><main>
 <h1>${label(documentLabel)} ${escape(invoice.number)}</h1>${invoice.status==='void'?`<p>${label('Tühistatud')}: ${escape(invoice.voidReason)}</p>`:''}
 ${invoice.originalNumber?`<p>${label('Algarve')}: ${escape(invoice.originalNumber)}<br>${label('Paranduse põhjus')}: ${escape(invoice.correctionReason)}</p>`:''}
 ${invoice.replacedNumber?`<p>${label('Asendatud arve')}: ${escape(invoice.replacedNumber)}</p>`:''}
 <p>${label('Väljastamise kuupäev')}: ${escape(invoice.issuedOn??'—')}${invoice.kind==='invoice'?`<br>${label('Maksetähtaeg')}: ${escape(invoice.dueDate)}`:''}</p>
 <h2>${label('Arve väljastaja')}</h2>${party(invoice.issuer.issuer??{})}<h2>${label('Arve saaja')}</h2>${party(invoice.recipient)}
 <p>${label('Teenuse periood')}: ${escape(invoice.periodStart)} – ${escape(lastDay)}</p>
 <table><thead><tr><th scope="col">${label('Teenus')}</th><th scope="col">${label('Kogus')}</th><th scope="col">${label('Ühiku netohind')}</th><th scope="col">${label('Maksumäär')}</th><th scope="col">${label('Netosumma')}</th><th scope="col">${label('Maks')}</th><th scope="col">${label('Kokku')}</th></tr></thead><tbody>
 ${invoice.lines.map(line=>`<tr><td>${escape(line.description)}</td><td>${escape(line.quantity)}</td><td>${money(line.unitPrice)}</td><td>${escape(line.taxRateBasisPoints/100)}%</td><td>${money(line.subtotal)}</td><td>${money(line.tax)}</td><td>${money(line.total)}</td></tr>`).join('')}
 </tbody></table><p>${label('Netosumma')}: ${money(invoice.subtotal)}<br>${label('Maks')}: ${money(invoice.tax)}<br><strong>${label('Kokku')}: ${money(invoice.total)}</strong></p>
 <p>${escape(invoice.issuer.taxNote)}</p>${invoice.kind==='invoice'?`<p>IBAN: ${escape(invoice.issuer.iban)}<br>${label('Makse selgitus')}: ${escape(invoice.number)}</p>
 <p>${label('Laekunud')}: ${money(invoice.paidAmount)}<br>${label('Tasumata')}: ${money(invoice.status==='void'?0:Math.max(0,invoice.total-invoice.paidAmount))}</p>`:`<p>${label('Kreeditarve ei tee pangas tagasimakset.')}</p>`}
 ${paymentLink&&invoice.kind==='invoice'&&invoice.status==='issued'?`<p><a href="${escape(paymentLink)}">${label('Arve tasumine')}</a></p>`:''}
 </main></body></html>`;
}
