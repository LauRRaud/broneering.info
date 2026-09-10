import {afterEach,expect,it,vi} from 'vitest';
import {verifyBookingChallenge} from '../src/lib/booking-challenge';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const request=(token='token')=>new Request('https://salon.example/api/bookings',{headers:{host:'salon.example','cf-turnstile-response':token}});

it('requires challenge configuration in production',async()=>{
  vi.stubEnv('NODE_ENV','production');
  await expect(verifyBookingChallenge(request(),'00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({status:503,code:'CHALLENGE_UNAVAILABLE'});
});

it('accepts only successful booking challenges for the request host',async()=>{
  vi.stubEnv('TURNSTILE_SECRET_KEY','secret');
  vi.stubEnv('TURNSTILE_SITE_KEY','site-key');
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({success:true,hostname:'salon.example',action:'booking'}),{status:200}));
  const key='00000000-0000-4000-8000-000000000000';
  await expect(verifyBookingChallenge(request(),key)).resolves.toBeUndefined();
  expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('idempotency_key='+key);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({success:true,hostname:'evil.example',action:'booking'}),{status:200}));
  await expect(verifyBookingChallenge(request(),key)).rejects.toMatchObject({status:403,code:'CHALLENGE_REJECTED'});
});
