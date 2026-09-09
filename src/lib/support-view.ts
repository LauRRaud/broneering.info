import {z} from 'zod';
import {DateTime} from 'luxon';
import {withTenant} from './db';
import {audit,requireSupportGrantInClient,type Actor,type SupportGrant} from './access';
import {AppError} from './errors';

const query=z.object({
  tenantId:z.uuid(),grantId:z.uuid(),view:z.enum(['calendar','customers']),
  day:z.iso.date().optional(),search:z.string().trim().max(120).default(''),
  page:z.coerce.number().int().min(0).max(10000).default(0),
}).strict();
type Booking={id:string;reference:string;serviceName:string;staffName:string;customerName:string;start:string;end:string;status:string};
type Customer={id:string;name:string;email:string|null;phone:string|null};
export type SupportViewState={grant:SupportGrant;tenant:{id:string;name:string;timezone:string};view:'calendar'|'customers';day:string;page:number;hasMore:boolean;bookings:Booking[];customers:Customer[]};

/** Deliberately separate from member state: no mutation, export, token, note or billing surface. */
export async function supportViewState(actor:Actor,raw:unknown):Promise<SupportViewState>{
  const parsed=query.safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_INPUT','Kontrolli tugivaate päringut.');
  const q=parsed.data;
  return withTenant(q.tenantId,async client=>{
    const grant=await requireSupportGrantInClient(actor,q.grantId,q.tenantId,client);
    const tenant=(await client.query(`SELECT id,name,timezone,data_access_until IS NULL OR data_access_until>clock_timestamp() AS allowed
      FROM tenants WHERE id=$1 FOR SHARE`,[q.tenantId])).rows[0];
    if(!tenant)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
    if(!tenant.allowed)throw new AppError(403,'DATA_ACCESS_ENDED','Ettevõtte ajutine andmeligipääs on lõppenud.');
    const date=q.day?DateTime.fromISO(q.day,{zone:tenant.timezone}):DateTime.now().setZone(tenant.timezone).startOf('day');
    if(!date.isValid)throw new AppError(400,'INVALID_INPUT','Vigane kuupäev.');
    let bookings:Booking[]=[],customers:Customer[]=[];
    if(q.view==='calendar'){
      bookings=(await client.query(`SELECT id,reference,service_name AS "serviceName",staff_name AS "staffName",
        customer_name AS "customerName",start_at AS start,end_at AS end,status FROM bookings
        WHERE tenant_id=$1 AND end_at>$2::timestamptz AND start_at<$3::timestamptz
        ORDER BY start_at,id LIMIT 51 OFFSET $4`,[q.tenantId,date.toISO(),date.plus({days:1}).toISO(),q.page*50])).rows
        .map(row=>({...row,start:new Date(row.start).toISOString(),end:new Date(row.end).toISOString()}));
    }else{
      customers=(await client.query(`SELECT id,name,email,phone FROM customers WHERE tenant_id=$1 AND merged_into_id IS NULL
        AND ($2='' OR strpos(lower(name),lower($2))>0 OR strpos(lower(coalesce(email,'')),lower($2))>0 OR strpos(lower(coalesce(phone,'')),lower($2))>0)
        ORDER BY name,id LIMIT 51 OFFSET $3`,[q.tenantId,q.search,q.page*50])).rows;
    }
    await audit(client,q.tenantId,actor.id,'support.view.read',undefined,q.grantId,
      {scope:'read_only',view:q.view,page:q.page,day:q.view==='calendar'?date.toISODate():undefined,rows:Math.min(50,bookings.length+customers.length)});
    // A slow/blocked read or audit write must not return data after the grant deadline.
    await requireSupportGrantInClient(actor,q.grantId,q.tenantId,client);
    return {grant,tenant:{id:tenant.id,name:tenant.name,timezone:tenant.timezone},view:q.view,day:date.toISODate()!,page:q.page,
      hasMore:bookings.length>50||customers.length>50,bookings:bookings.slice(0,50),customers:customers.slice(0,50)};
  });
}
