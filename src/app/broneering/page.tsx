import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {tenantForHost} from '@/lib/tenants';
import {AppError} from '@/lib/errors';
import ManageBooking from '@/components/manage-booking';
export const dynamic='force-dynamic';
export const metadata={title:'Broneeringu haldamine',robots:{index:false,follow:false}};
export default async function BookingPage(){
  try{const tenant=await tenantForHost((await headers()).get('host')??'','existing');return <ManageBooking company={{name:tenant.name,address:tenant.address,email:tenant.contact_email,phone:tenant.contact_phone}}/>;}
  catch(error){if(error instanceof AppError&&error.status===404)notFound();throw error;}
}
