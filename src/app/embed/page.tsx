import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import BookingFlow from '@/components/booking-flow';
import EmbedFrame from '@/components/embed-frame';
import {tenantForHost} from '@/lib/tenants';
import {catalogFor} from '@/lib/availability';
import {embedOrigins} from '@/lib/embed';
import {canonicalEmbedOrigin} from '@/lib/embed-contracts';
import {AppError} from '@/lib/errors';
export const dynamic='force-dynamic';
export const metadata={title:'Broneeri aeg',robots:{index:false,follow:false}};
export default async function EmbedPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  try {
    const tenant=await tenantForHost((await headers()).get('host')||'');
    const query=await searchParams;
    let parent='';
    try {parent=canonicalEmbedOrigin(typeof query.parent==='string'?query.parent:'',process.env.NODE_ENV!=='production');}catch{}
    if(!parent || !(await embedOrigins(tenant.id)).includes(parent))return <main><h1>Ava broneerimisleht</h1><p>Manustamine pole sellele kodulehele seadistatud.</p><a href="/" target="_blank" rel="noopener noreferrer">Ava broneerimisleht</a></main>;
    return <EmbedFrame parentOrigin={parent}><BookingFlow catalog={await catalogFor(tenant)}/></EmbedFrame>;
  }catch(error){if(error instanceof AppError && error.status===404)notFound();throw error;}
}
