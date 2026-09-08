import {z} from 'zod';
import type {BookingResult,Offer} from './contracts';
const reason=z.string().trim().max(500).default('');
const identity={bookingId:z.uuid(),version:z.number().int().positive()};
const offer={serviceId:z.uuid(),staffId:z.uuid(),start:z.iso.datetime({offset:true}),expectedPrice:z.number().int().nonnegative(),expectedDuration:z.number().int().min(5).max(720),expectedRulesVersion:z.number().int().positive()};
export const publicBookingCommandSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('cancel'),version:identity.version,reason}).strict(),
  z.object({action:z.literal('reschedule'),version:identity.version,...offer}).strict(),
]);
export const adminBookingCommandSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('cancel'),tenantId:z.uuid(),...identity,reason,overrideDeadline:z.boolean().default(false)}).strict(),
  z.object({action:z.literal('reschedule'),tenantId:z.uuid(),...identity,...offer,reason,overrideDeadline:z.boolean().default(false)}).strict(),
  z.object({action:z.literal('status'),tenantId:z.uuid(),...identity,status:z.enum(['confirmed','completed','no_show']),reason:z.string().trim().min(3).max(500)}).strict(),
  z.object({action:z.literal('issue-link'),tenantId:z.uuid(),...identity}).strict(),
  z.object({action:z.literal('revoke-link'),tenantId:z.uuid(),...identity,reason:z.string().trim().min(3).max(500)}).strict(),
  z.object({action:z.literal('manual-create'),tenantId:z.uuid(),...offer,name:z.string().trim().min(2).max(120),email:z.email().trim().max(254).nullable(),phone:z.string().trim().max(30).regex(/^[+\d ()-]*$/).optional()}).strict(),
]);
export const bookingPolicySchema=z.object({tenantId:z.uuid(),version:z.number().int().positive(),contactEmail:z.union([z.literal(''),z.email().max(254)]),contactPhone:z.string().trim().max(30).regex(/^[+\d ()-]*$/),linkHours:z.number().int().min(0).max(8760).nullable()}).strict().refine(d=>d.linkHours===null||!!(d.contactEmail||d.contactPhone));
export type PublicBookingCommand=z.infer<typeof publicBookingCommandSchema>;
export type AdminBookingCommand=z.infer<typeof adminBookingCommandSchema>;
export type BookingPolicy={version:number;contactEmail:string;contactPhone:string;linkHours:number|null;canEdit:boolean};
export type BookingDetail=BookingResult&{version:number;serviceId:string;staffId:string;name:string;email:string|null;phone:string|null;attentionReason:string|null;source:'online'|'manual';deadline:string|null;canChange:boolean;notice:string};
export type ManagedBookingState={booking:BookingDetail;linkId:string;expiresAt:string;tenant:{name:string;address:string;timezone:string;contactEmail:string;contactPhone:string;demo:boolean};today:string;maxDate:string;rulesVersion:number;cancellationHours:number};
export type BookingHistoryItem={action:string;reason:string;at:string;actorName:string|null;before:Record<string,unknown>|null;after:Record<string,unknown>};
export type AdminBookingsState={bookings:BookingDetail[];hasMore:boolean;policy:BookingPolicy;timezone:string;today:string;maxDate:string;rulesVersion:number;cancellationHours:number;canOverride:boolean;publicHostname:string|null;staff:Array<{id:string;name:string}>;services:Array<{id:string;name:string;online:boolean}>;assignments:Array<{staffId:string;serviceId:string}>};
export type BookingAvailability={offers:Offer[];serviceName?:string;rulesVersion:number;cancellationHours:number};
