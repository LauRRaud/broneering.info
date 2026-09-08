import {z} from 'zod';
export const notificationSettingsSchema=z.object({action:z.literal('settings'),tenantId:z.uuid(),version:z.number().int().positive(),notificationEmail:z.union([z.literal(''),z.email().max(254)]),reminderMinutes:z.number().int().min(5).max(43200).nullable()}).strict();
export const notificationCommand=z.discriminatedUnion('action',[
  notificationSettingsSchema,
  z.object({action:z.literal('retry'),tenantId:z.uuid(),id:z.uuid(),version:z.number().int().positive(),reason:z.string().trim().min(3).max(500)}).strict(),
  z.object({action:z.literal('feedback'),tenantId:z.uuid(),id:z.uuid(),version:z.number().int().positive(),deliveryStatus:z.enum(['delivered','bounced']),reason:z.string().trim().min(3).max(500)}).strict(),
]);
export type NotificationState={
  settings:{version:number;notificationEmail:string;reminderMinutes:number|null};
  mode:'disabled'|'smtp'|'capture';configured:boolean;demo:boolean;
  jobs:Array<{id:string;reference:string;kind:string;recipientKind:string;status:string;version:number;attempts:number;retryBudget:number;nextAttemptAt:string;lastErrorCode:string|null;sentAt:string|null;deliveryStatus:string;capturedAt:string|null}>;
  hasMore:boolean;
};
