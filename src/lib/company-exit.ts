import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,requireOwnerInTransaction,audit} from './access';
import {AppError} from './errors';
import type {PoolClient} from 'pg';
const identity={tenantId:z.uuid(),version:z.number().int().positive()};
const schema=z.discriminatedUnion('action',[
 z.object({...identity,action:z.literal('schedule'),bookingStopsAt:z.iso.datetime({offset:true}),serviceEndsAt:z.iso.datetime({offset:true}),dataAccessUntil:z.iso.datetime({offset:true}),deletionNotBefore:z.iso.datetime({offset:true}),agreement:z.string().trim().min(10).max(1000),confirmed:z.literal(true)}).strict(),
 z.object({...identity,action:z.literal('cancel')}).strict(),
]);
export type CompanyExitState={version:number;scheduled:boolean;bookingStopsAt:string|null;serviceEndsAt:string|null;dataAccessUntil:string|null;deletionNotBefore:string|null;agreement:string|null;bookingsStopped:boolean;serviceEnded:boolean;accessExpired:boolean;futureBookings:number};
async function state(client:PoolClient,tenantId:string):Promise<CompanyExitState>{
 const row=(await client.query(`SELECT exit_version,booking_stops_at,service_ends_at,data_access_until,deletion_not_before,exit_agreement,
 COALESCE(booking_stops_at<=clock_timestamp(),false) AS stopped,COALESCE(service_ends_at<=clock_timestamp(),false) AS ended,COALESCE(data_access_until<=clock_timestamp(),false) AS expired FROM tenants WHERE id=$1`,[tenantId])).rows[0];
 const future=row.expired?0:(await client.query("SELECT count(*)::int n FROM bookings WHERE tenant_id=$1 AND status='confirmed' AND end_at>clock_timestamp()",[tenantId])).rows[0].n;
 return {version:row.exit_version,scheduled:row.service_ends_at!==null,bookingStopsAt:row.booking_stops_at?.toISOString()??null,serviceEndsAt:row.service_ends_at?.toISOString()??null,dataAccessUntil:row.data_access_until?.toISOString()??null,deletionNotBefore:row.deletion_not_before?.toISOString()??null,agreement:row.exit_agreement,bookingsStopped:row.stopped,serviceEnded:row.ended,accessExpired:row.expired,futureBookings:future};
}
export async function companyExitState(actor:Actor,tenantId:string){
 if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
 return withTenant(tenantId,async client=>{await requireOwnerInTransaction(actor,tenantId,client,true);return state(client,tenantId);});
}
export async function changeCompanyExit(actor:Actor,raw:unknown){
 const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_EXIT','Kontrolli lahkumiskava tähtaegu ja kokkuleppe kinnitust.');const d=parsed.data;
 return withTenant(d.tenantId,async client=>{
  await requireOwnerInTransaction(actor,d.tenantId,client);
  const before=await state(client,d.tenantId);
  if(before.version!==d.version)throw new AppError(409,'VERSION_CONFLICT','Seaded muutusid vahepeal. Laadi värske seis.');
  if(d.action==='schedule'){
   if(before.serviceEnded)throw new AppError(409,'SERVICE_ENDED','Tellimus on lõppenud. Taasavamiseks võta ühendust platvormi haldajaga.');
   const stops=Date.parse(d.bookingStopsAt),ends=Date.parse(d.serviceEndsAt),access=Date.parse(d.dataAccessUntil),deletion=Date.parse(d.deletionNotBefore);
   if(stops>ends||ends>access||access>deletion||access<=Date.now()||ends<Date.now())throw new AppError(400,'INVALID_EXIT_DATES','Tähtajad peavad järgima järjekorda: broneerimise peatus, tellimuse lõpp, andmeligipääsu lõpp ja varaseim kustutamine.');
   await client.query(`UPDATE tenants SET booking_stops_at=$2,service_ends_at=$3,data_access_until=$4,deletion_not_before=$5,exit_agreement=$6,exit_approved_by=$7,exit_approved_at=clock_timestamp(),exit_version=exit_version+1 WHERE id=$1`,[d.tenantId,d.bookingStopsAt,d.serviceEndsAt,d.dataAccessUntil,d.deletionNotBefore,d.agreement,actor.id]);
   await client.query('UPDATE subscriptions SET ends_at=$2,version=version+1 WHERE tenant_id=$1',[d.tenantId,d.serviceEndsAt]);
   await audit(client,d.tenantId,actor.id,'company.exit.scheduled',undefined,d.tenantId,{bookingStopsAt:d.bookingStopsAt,serviceEndsAt:d.serviceEndsAt,dataAccessUntil:d.dataAccessUntil,deletionNotBefore:d.deletionNotBefore});
  }else{
   if(!before.scheduled)throw new AppError(409,'EXIT_NOT_SCHEDULED','Ettevõttel ei ole lahkumiskava.');
   if(before.serviceEnded)throw new AppError(409,'SERVICE_ENDED','Tellimus on lõppenud. Taasavamiseks võta ühendust platvormi haldajaga.');
   await client.query(`UPDATE tenants SET public_state=CASE WHEN booking_stops_at<=clock_timestamp() AND public_state='published' THEN 'paused' ELSE public_state END,booking_stops_at=NULL,service_ends_at=NULL,data_access_until=NULL,deletion_not_before=NULL,exit_agreement=NULL,exit_approved_by=NULL,exit_approved_at=NULL,exit_version=exit_version+1,lifecycle_version=lifecycle_version+1 WHERE id=$1`,[d.tenantId]);
   await client.query('UPDATE subscriptions SET ends_at=NULL,version=version+1 WHERE tenant_id=$1',[d.tenantId]);
   await audit(client,d.tenantId,actor.id,'company.exit.cancelled',undefined,d.tenantId);
  }
  return state(client,d.tenantId);
 });
}
