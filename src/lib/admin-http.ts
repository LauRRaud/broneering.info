import { authBaseUrl, isExactAuthHost } from './auth-host';
import { getIdentity } from './auth';
import { AppError } from './errors';
import { errorResponse } from './http';
import type { Actor } from './access';

export function assertAdminHost(request: Request, write = false) {
  if (!isExactAuthHost(request)) throw new AppError(404, 'NOT_FOUND', 'Lehte ei leitud.');
  if (write && request.headers.get('origin') !== authBaseUrl) {
    throw new AppError(403, 'ORIGIN_REJECTED', 'Toiming peab toimuma halduskeskkonnas.');
  }
}

export async function adminActor(request: Request): Promise<Actor> {
  const actor = await getIdentity(request.headers);
  if (!actor) throw new AppError(401, 'UNAUTHENTICATED', 'Logi enne jätkamist sisse.');
  if (!actor.emailVerified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Kinnita oma e-posti aadress.');
  return actor;
}

export function adminJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: {
    'Cache-Control': 'no-store',
    Vary: 'Host, Cookie, X-Booking-Language',
    'X-Robots-Tag': 'noindex, nofollow',
  } });
}

export function adminError(error: unknown,request?:Request) {
  const response = errorResponse(error,request);
  response.headers.set('Vary', 'Host, Cookie, X-Booking-Language');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
