import type {Locale} from './locales';
import {z} from 'zod';
const identity={tenantId:z.uuid(),id:z.uuid().optional(),version:z.number().int().positive().optional()};
const price=z.number().int().min(0).max(100000000), duration=z.number().int().min(5).max(720), buffer=z.number().int().min(0).max(240);
export const serviceManagementSchemas={
 'save-group':z.object({...identity,parentId:z.uuid().nullable().default(null),name:z.string().trim().min(1).max(100),active:z.boolean()}).strict(),
 'save-service':z.object({...identity,sourceLanguage:z.enum(['et','en','ru']).optional(),groupId:z.uuid(),name:z.string().trim().min(1).max(150),description:z.string().trim().max(1000),defaultPrice:price,defaultDuration:duration,bufferBefore:buffer,bufferAfter:buffer,active:z.boolean(),online:z.boolean()}).strict(),
 'save-staff':z.object({...identity,name:z.string().trim().min(1).max(120),title:z.string().trim().max(150),bio:z.string().trim().max(1000),photoUrl:z.string().max(2000).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}),active:z.boolean(),online:z.boolean()}).strict(),
 'save-assignment':z.object({tenantId:z.uuid(),staffId:z.uuid(),serviceId:z.uuid(),version:z.number().int().nonnegative(),price:price.nullable(),duration:duration.nullable(),bufferBefore:buffer.nullable(),bufferAfter:buffer.nullable(),active:z.boolean()}).strict(),
 'save-pricing':z.object({tenantId:z.uuid(),serviceId:z.uuid(),staffId:z.uuid().optional(),version:z.number().int().positive(),price:price.nullable(),duration:duration.nullable()}).strict(),
};
export type ServiceManagementAction=keyof typeof serviceManagementSchemas;
export type ManagedGroup={id:string;parentId:string|null;name:string;path:string;active:boolean;version:number};
export type ManagedService={sourceLanguage?:Locale;id:string;groupId:string|null;name:string;description:string;defaultPrice:number;defaultDuration:number;bufferBefore:number;bufferAfter:number;active:boolean;online:boolean;version:number};
export type ManagedStaff={id:string;name:string;title:string;bio:string;photoUrl:string;active:boolean;online:boolean;version:number};
export type ManagedAssignment={staffId:string;serviceId:string;price:number|null;duration:number|null;bufferBefore:number|null;bufferAfter:number|null;active:boolean;version:number};
export type ServiceManagementState={groups:ManagedGroup[];services:ManagedService[];staff:ManagedStaff[];assignments:ManagedAssignment[];canEditStructure:boolean};
