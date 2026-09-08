import {adminActor,adminError,adminJson,assertAdminHost} from '@/lib/admin-http';
import {saveBookingPolicy} from '@/lib/booking-management';
import {limitTenant,readJson} from '@/lib/http';
export async function POST(request:Request){
  try{assertAdminHost(request,true);const actor=await adminActor(request);limitTenant(`booking-policy:${actor.id}`,30);await saveBookingPolicy(actor,await readJson(request));return adminJson({ok:true});}
  catch(error){return adminError(error);}
}
