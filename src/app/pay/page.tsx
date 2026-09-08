import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {authHost} from '@/lib/auth-host';
import InvoicePayment from '@/components/invoice-payment';
export const dynamic='force-dynamic';
export const metadata={title:'Arve tasumine · broneering.info',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function InvoicePaymentPage(){const h=await headers();if(h.get('host')?.toLowerCase()!==authHost)notFound();return <InvoicePayment/>;}
