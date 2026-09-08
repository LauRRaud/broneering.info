import {afterEach,it,expect,vi} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
import {makeCommerceConfig,makeCommerceAvailability,providerCents,verifyProviderMessage,createProviderTransaction,getProviderTransaction,chargeProviderToken,type MakeCommerceConfig} from '../src/lib/makecommerce';
const id=randomUUID(),attemptId=randomUUID(),c:MakeCommerceConfig={mode:'test',shopId:randomUUID(),secret:'test-only-secret-not-real',publishableKey:'test-only-public',origin:'https://billing.example.invalid',apiOrigin:'https://api.test.maksekeskus.ee',paymentOrigin:'https://payment.test.maksekeskus.ee',scriptUrl:'https://static.cc-test.maksekeskus.ee/checkout/dist/checkout.min.js'};
const input={tenantId:randomUUID(),amount:3500,reference:'INVOICE-1',attemptId,email:'owner@example.invalid',ip:'192.0.2.1',locale:'et' as const,recurring:false};
const response={id,status:'CREATED',amount:'35.00',currency:'EUR',reference:input.reference,merchant_data:attemptId,payment_methods:{other:[{name:'redirect',url:c.paymentOrigin+'/pay.html?trx='+id}]}};
const payment={message_type:'payment_return',message_time:'2026-09-08T12:00:00+0000',shop:c.shopId,transaction:id,status:'COMPLETED',amount:'35.00',currency:'EUR',reference:input.reference,merchant_data:attemptId};
const sign=(value:unknown)=>{const json=JSON.stringify(value);return {json,mac:createHash('sha512').update(json).update(c.secret).digest('hex').toUpperCase()};};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('requires explicit complete HTTPS configuration and exposes no keys in availability',()=>{
 vi.stubEnv('MAKECOMMERCE_MODE','disabled');expect(makeCommerceAvailability()).toEqual({enabled:false,mode:null});expect(()=>makeCommerceConfig()).toThrow();
 for(const [key,value] of Object.entries({MAKECOMMERCE_MODE:'test',MAKECOMMERCE_SHOP_ID:c.shopId,MAKECOMMERCE_SECRET_KEY:c.secret,MAKECOMMERCE_PUBLISHABLE_KEY:c.publishableKey,MAKECOMMERCE_BASE_URL:c.origin}))vi.stubEnv(key,value);
 expect(makeCommerceConfig()).toEqual(c);expect(makeCommerceAvailability()).toEqual({enabled:true,mode:'test'});
 for(const origin of ['http://localhost:3107','https://user:pass@billing.example.invalid','https://billing.example.invalid/callback','https://billing.example.invalid?x=1']){vi.stubEnv('MAKECOMMERCE_BASE_URL',origin);expect(()=>makeCommerceConfig()).toThrow();}
});
it('validates the exact signed bytes and shop before accepting a completed payment',()=>{
 const signed=sign(payment);expect(verifyProviderMessage(signed.json,signed.mac,c)).toMatchObject({amount:3500,status:'COMPLETED'});
 for(const [json,mac] of [[signed.json+' ',signed.mac],[signed.json,'0'.repeat(128)],[signed.json,'a'],[signed.json,'z'.repeat(128)]])expect(()=>verifyProviderMessage(json,mac,c)).toThrow();
 for(const value of [{...payment,shop:randomUUID()},{...payment,message_time:'invalid'},{...payment,currency:'USD'},{...payment,status:'SUCCESS'}]){const bad=sign(value);expect(()=>verifyProviderMessage(bad.json,bad.mac,c)).toThrow();}
 const malformed='{invalid';expect(()=>verifyProviderMessage(malformed,createHash('sha512').update(malformed).update(c.secret).digest('hex'),c)).toThrow();
});
it('accepts a signed token separately from money and rejects malformed tokens and fractional cents',()=>{
 const token={message_type:'token_return',message_time:payment.message_time,transaction:{id,status:'COMPLETED',reference:input.reference},token:{id:randomUUID(),multiuse:true,valid_until:'2028-06-30'}};
 const signed=sign(token);expect(verifyProviderMessage(signed.json,signed.mac,c)).toEqual(token);
 for(const amount of ['35.001','-1','1e3','NaN',null,undefined,1000000.01])expect(()=>providerCents(amount)).toThrow();
 expect(providerCents(35)).toBe(3500);expect(providerCents('0.01')).toBe(1);
 const bad=sign({...token,token:{...token.token,valid_until:'2028-02-31'}});expect(()=>verifyProviderMessage(bad.json,bad.mac,c)).toThrow();
});
it('creates an exact invoice transaction using server credentials and fixed callbacks',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json(response,{status:201}));vi.stubGlobal('fetch',fetcher);
 expect(await createProviderTransaction(input,c)).toMatchObject({id,amount:3500,redirectUrl:response.payment_methods.other[0].url});
 const [url,options]=fetcher.mock.calls[0];expect(url).toBe(c.apiOrigin+'/v1/transactions');expect(options.redirect).toBe('error');
 const body=JSON.parse(options.body);expect(body.transaction).toMatchObject({amount:'35.00',currency:'EUR',reference:input.reference,merchant_data:attemptId,recurring_required:false});
 expect(body.transaction.transaction_url.notification_url.url).toBe(c.origin+'/api/payments/makecommerce/notify?'+new URLSearchParams({tenantId:input.tenantId,attemptId}));expect(body.customer.ip).toBe(input.ip);
 expect(options.headers.Authorization).toBe('Basic '+Buffer.from(c.shopId+':'+c.secret).toString('base64'));expect(options.body).not.toContain(c.secret);
});
it('rejects changed money and unsafe redirects and never retries an uncertain provider call',async()=>{
 for(const result of [{...response,amount:'34.99'},{...response,payment_methods:{other:[{name:'redirect',url:'https://attacker.example/pay?trx='+id}]}},{...response,payment_methods:{other:[{name:'redirect',url:c.paymentOrigin+'/pay?trx='+randomUUID()}]}}]){
  const fetcher=vi.fn().mockResolvedValue(Response.json(result));vi.stubGlobal('fetch',fetcher);await expect(createProviderTransaction(input,c)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 }
 const fetcher=vi.fn().mockRejectedValue(new Error('transport secret data'));vi.stubGlobal('fetch',fetcher);await expect(createProviderTransaction(input,c)).rejects.toMatchObject({outcome:'unknown'});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('reads only the expected transaction and reports definitive declines without raw provider data',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json(response)).mockResolvedValueOnce(Response.json({transaction:{id,status:'COMPLETED'}})).mockResolvedValueOnce(Response.json({code:1034,message:'private provider detail'},{status:400}));vi.stubGlobal('fetch',fetcher);
 expect((await getProviderTransaction(id,c)).id).toBe(id);const token=randomUUID();expect(await chargeProviderToken(id,token,c)).toBe('COMPLETED');expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({token});
 await expect(chargeProviderToken(id,token,c)).rejects.toMatchObject({outcome:'rejected',providerCode:1034,message:'Maksepakkuja ei kinnitanud makset.'});
});
