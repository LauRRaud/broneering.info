import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {withTenant} from './db';
import {type Actor,audit,requirePlatformInClient} from './access';
import {tokenHash,randomBookingToken,sealBookingReply,openBookingReply} from './booking-secrets';
import {authBaseUrl} from './auth-host';
import {AppError} from './errors';
import type {PoolClient} from 'pg';

const schema=z.object({
  requestKey:z.uuid(),name:z.string().trim().min(2).max(200),address:z.string().trim().min(2).max(500),
  slug:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9-]{1,48}[a-z0-9]$/).refine(v=>!['haldus','app','api','admin','cdn','www','mail'].includes(v)),
  ownerEmail:z.email().trim().toLowerCase().max(320),
}).strict();
export type ProvisionReply={tenantId:string;hostname:string;invitationId:string;activationUrl:string;expiresAt:string};

/** A private activation link is returned to the authenticated platform administrator.
 * No outbound message is sent as part of this database transaction. */
export async function provisionCompany(actor:Actor,raw:unknown):Promise<ProvisionReply>{
  const parsed=schema.safeParse(raw);
  if(!parsed.success)throw new AppError(400,'INVALID_COMPANY','Kontrolli ettevõtte nime, aadressi, alamdomeeni ja omaniku e-posti.');
  const input=parsed.data,tenantId=randomUUID();
  const hash=tokenHash(JSON.stringify(input)),context=`company:${actor.id}:${input.requestKey}`;
  try{return await withTenant(tenantId,async client=>{
    await requirePlatformInClient(actor,client);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[context]);
    const previous=await client.query('SELECT payload_hash,encrypted_reply FROM company_provision_requests WHERE actor_user_id=$1 AND request_key=$2',[actor.id,input.requestKey]);
    if(previous.rowCount){
      if(previous.rows[0].payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');
      return openBookingReply<ProvisionReply>(previous.rows[0].encrypted_reply,context);
    }
    const hostname=input.slug+(new URL(authBaseUrl).hostname.endsWith('.localhost')?'.localhost':'.broneering.info');
    await client.query("INSERT INTO tenants(id,slug,name,address,demo,public_state) VALUES($1,$2,$3,$4,true,'draft')",[tenantId,input.slug,input.name,input.address]);
    await client.query('INSERT INTO tenant_domains(hostname,tenant_id,ready) VALUES($1,$2,false)',[hostname,tenantId]);
    const token=randomBookingToken();
    const invitation=await client.query("INSERT INTO invitations(tenant_id,email,role,bootstrap,token_hash,expires_at) VALUES($1,$2,'owner',true,$3,now()+interval '48 hours') RETURNING id,expires_at",[tenantId,input.ownerEmail,tokenHash(token)]);
    const reply:ProvisionReply={tenantId,hostname,invitationId:invitation.rows[0].id,activationUrl:`${authBaseUrl}/?invitation=${encodeURIComponent(token)}`,expiresAt:new Date(invitation.rows[0].expires_at).toISOString()};
    await client.query('INSERT INTO company_provision_requests(actor_user_id,request_key,tenant_id,payload_hash,encrypted_reply) VALUES($1,$2,$3,$4,$5)',[actor.id,input.requestKey,tenantId,hash,sealBookingReply(reply,context)]);
    await audit(client,tenantId,actor.id,'company.created',undefined,tenantId,{state:'draft'});
    await audit(client,tenantId,actor.id,'owner.bootstrap_invited',undefined,reply.invitationId);
    return reply;
  });}catch(error){
    if((error as {code?:string})?.code==='23505')throw new AppError(409,'DOMAIN_RESERVED','See alamdomeen on juba kasutusel või reserveeritud.');
    throw error;
  }
}

async function bootstrapState(client:PoolClient,tenantId:string){
  const tenant=(await client.query('SELECT id,name,slug,public_state FROM tenants WHERE id=$1',[tenantId])).rows[0];
  if(!tenant)throw new AppError(404,'TENANT_NOT_FOUND','Ettevõtet ei leitud.');
  const owner=(await client.query("SELECT 1 FROM memberships WHERE tenant_id=$1 AND role='owner' LIMIT 1",[tenantId])).rowCount;
  const invitation=(await client.query('SELECT id,email,expires_at,accepted_at,cancelled_at FROM invitations WHERE tenant_id=$1 AND bootstrap ORDER BY created_at DESC,id DESC LIMIT 1',[tenantId])).rows[0];
  const accepted=(await client.query('SELECT 1 FROM invitations WHERE tenant_id=$1 AND bootstrap AND accepted_at IS NOT NULL LIMIT 1',[tenantId])).rowCount;
  const eligible=tenant.public_state==='draft'&&!owner&&!accepted&&!!invitation;
  return {tenantId:tenant.id,name:tenant.name,eligible,invitation:eligible?{id:invitation.id,email:invitation.email,expiresAt:invitation.expires_at.toISOString(),cancelled:invitation.cancelled_at!==null}:null};
}
export async function ownerInvitationState(actor:Actor,tenantId:string){
  if(!z.uuid().safeParse(tenantId).success)throw new AppError(400,'INVALID_TENANT','Vigane ettevõtte tunnus.');
  return withTenant(tenantId,async client=>{await requirePlatformInClient(actor,client);return bootstrapState(client,tenantId);});
}
const renewalSchema=z.object({tenantId:z.uuid(),invitationId:z.uuid(),requestKey:z.uuid(),reason:z.string().trim().min(10).max(500),confirmed:z.literal(true)}).strict();
export async function renewOwnerInvitation(actor:Actor,raw:unknown):Promise<ProvisionReply>{
  const parsed=renewalSchema.safeParse(raw);if(!parsed.success)throw new AppError(400,'INVALID_INVITATION_RENEWAL','Kontrolli kutse taastamise andmeid ja kinnitust.');const d=parsed.data;
  const hash=tokenHash(JSON.stringify({action:'renew-owner',...d})),context=`owner-renew:${actor.id}:${d.requestKey}`;
  return withTenant(d.tenantId,async client=>{
    await requirePlatformInClient(actor,client);
    // Share the provisioning idempotency lock because both actions use the same key table.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`company:${actor.id}:${d.requestKey}`]);
    await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[d.tenantId]);
    const state=await bootstrapState(client,d.tenantId);
    if(!state.eligible)throw new AppError(409,'OWNER_ALREADY_ESTABLISHED','Esimese omaniku kutset saab taastada ainult seni, kuni omanik pole liitunud.');
    const previous=(await client.query('SELECT payload_hash,encrypted_reply FROM company_provision_requests WHERE actor_user_id=$1 AND request_key=$2',[actor.id,d.requestKey])).rows[0];
    if(previous){
      if(previous.payload_hash!==hash)throw new AppError(409,'IDEMPOTENCY_MISMATCH','Sama päringu tunnusega saadeti erinevad andmed.');
      const reply=openBookingReply<ProvisionReply>(previous.encrypted_reply,context);
      if(reply.invitationId!==state.invitation?.id||state.invitation.cancelled||Date.parse(state.invitation.expiresAt)<=Date.now())throw new AppError(410,'INVITATION_SUPERSEDED','See kutse on aegunud või asendatud. Laadi kehtiv kutseinfo.');
      return reply;
    }
    if(state.invitation!.id!==d.invitationId)throw new AppError(409,'VERSION_CONFLICT','Kutse on vahepeal muutunud. Laadi kehtiv kutseinfo.');
    await client.query('UPDATE invitations SET cancelled_at=clock_timestamp() WHERE tenant_id=$1 AND bootstrap AND accepted_at IS NULL AND cancelled_at IS NULL',[d.tenantId]);
    const token=randomBookingToken();
    const invitation=(await client.query("INSERT INTO invitations(tenant_id,email,role,bootstrap,token_hash,expires_at) VALUES($1,$2,'owner',true,$3,clock_timestamp()+interval '48 hours') RETURNING id,expires_at",[d.tenantId,state.invitation!.email,tokenHash(token)])).rows[0];
    const domain=(await client.query('SELECT hostname FROM tenant_domains WHERE tenant_id=$1 ORDER BY ready DESC,hostname LIMIT 1',[d.tenantId])).rows[0];
    const reply:ProvisionReply={tenantId:d.tenantId,hostname:domain?.hostname??'',invitationId:invitation.id,activationUrl:`${authBaseUrl}/?invitation=${encodeURIComponent(token)}`,expiresAt:invitation.expires_at.toISOString()};
    await client.query('INSERT INTO company_provision_requests(actor_user_id,request_key,tenant_id,payload_hash,encrypted_reply) VALUES($1,$2,$3,$4,$5)',[actor.id,d.requestKey,d.tenantId,hash,sealBookingReply(reply,context)]);
    await audit(client,d.tenantId,actor.id,'owner.bootstrap_renewed',undefined,invitation.id,{previousInvitationId:d.invitationId,reason:d.reason});
    return reply;
  });
}
