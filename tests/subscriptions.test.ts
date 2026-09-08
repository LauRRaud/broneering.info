import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createSubscription,subscriptionState} from '../src/lib/subscriptions';
import type {Actor} from '../src/lib/access';
const db=new pg.Client({connectionString:process.env.MIGRATION_DATABASE_URL});
const tenantId=randomUUID(),otherTenant=randomUUID();
const admin:Actor={id:randomUUID(),name:'Billing platform',email:randomUUID()+'@example.invalid',emailVerified:true,twoFactorEnabled:true,isPlatformAdmin:true};
const owner:Actor={...admin,id:randomUUID(),email:randomUUID()+'@example.invalid',isPlatformAdmin:false};
const staff:Actor={...owner,id:randomUUID(),email:randomUUID()+'@example.invalid'};
beforeAll(async()=>{
 await db.connect();
 for(const id of [tenantId,otherTenant])await db.query("INSERT INTO tenants(id,slug,name,address) VALUES($1,$2,'Billing test','Test address')",[id,'billing-'+id]);
 for(const user of [admin,owner,staff])await db.query('INSERT INTO auth_user(id,name,email,email_verified,two_factor_enabled,is_platform_admin) VALUES($1,$2,$3,true,true,$4)',[user.id,user.name,user.email,user.isPlatformAdmin]);
 await db.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'receptionist')",[tenantId,owner.id,staff.id]);
});
afterAll(async()=>{
 for(const table of ['billing_commands','subscriptions','access_audit_log','memberships'])await db.query('DELETE FROM '+table+' WHERE tenant_id=ANY($1::uuid[])',[[tenantId,otherTenant]]);
 await db.query('DELETE FROM tenants WHERE id=ANY($1::uuid[])',[[tenantId,otherTenant]]);
 await db.query('DELETE FROM auth_user WHERE id=ANY($1::text[])',[[admin.id,owner.id,staff.id]]);await db.end();
});
const input=()=>({tenantId,requestKey:randomUUID(),start:'2090-01-31',billingName:'Billing recipient',billingEmail:'billing@example.invalid',confirmed:true});
it('creates one pending monthly subscription on simultaneous replay and exposes only authorized reads',async()=>{
 const d=input();const [a,b]=await Promise.all([createSubscription(admin,d),createSubscription(admin,d)]);
 expect(a).toEqual(b);expect(a.subscription).toMatchObject({status:'pending',periodStart:'2090-01-31',periodEnd:'2090-02-28',anchorDay:31,paidThrough:null,plan:{monthlyPrice:3500,staffLimit:null,terms:{paymentTermDays:7,graceDays:0,trialDays:0}}});
 expect(await subscriptionState(owner,tenantId)).toEqual(a);
 await expect(subscriptionState(staff,tenantId)).rejects.toMatchObject({status:403});
 await expect(subscriptionState(owner,otherTenant)).rejects.toMatchObject({status:403});
 await expect(subscriptionState(owner,tenantId,true)).rejects.toMatchObject({status:403});
 await expect(createSubscription(admin,{...d,billingName:'Changed'})).rejects.toMatchObject({code:'IDEMPOTENCY_MISMATCH'});
 await expect(createSubscription(admin,input())).rejects.toMatchObject({code:'SUBSCRIPTION_EXISTS'});
 expect((await db.query("SELECT count(*)::int n FROM access_audit_log WHERE tenant_id=$1 AND action='subscription.created'",[tenantId])).rows[0].n).toBe(1);
 await db.query('UPDATE auth_user SET is_platform_admin=false WHERE id=$1',[admin.id]);
 await expect(createSubscription(admin,d)).rejects.toMatchObject({status:403});
 await db.query('UPDATE auth_user SET is_platform_admin=true WHERE id=$1',[admin.id]);
});
it('rejects unauthorized creation, invalid dates, past periods and trials in the database',async()=>{
 await expect(createSubscription(owner,{...input(),tenantId:otherTenant})).rejects.toMatchObject({status:403});
 await expect(createSubscription(admin,{...input(),tenantId:otherTenant,start:'2025-01-01'})).rejects.toMatchObject({code:'INVALID_PERIOD_START'});
 await expect(createSubscription(admin,{...input(),tenantId:otherTenant,start:'2090-02-31'})).rejects.toMatchObject({status:400});
 await expect(db.query("UPDATE subscriptions SET status='trial',trial_ends_at='2090-03-01' WHERE tenant_id=$1",[tenantId])).rejects.toMatchObject({code:'23514'});
 expect((await db.query('SELECT count(*)::int n FROM subscriptions WHERE tenant_id=$1',[otherTenant])).rows[0].n).toBe(0);
});
