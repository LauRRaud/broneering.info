import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '../../../../lib/auth';
import { isExactAuthHost, isExactAuthOrigin } from '../../../../lib/auth-host';
import { pool } from '../../../../lib/db';
import { validateInvitationForSignup } from '../../../../lib/invitations';
import { isAccountMailConfigured } from '../../../../lib/auth-mail';
import { AppError } from '../../../../lib/errors';
import { errorResponse, readJson } from '../../../../lib/http';

function rejectHost(): Response {
  return new Response('Not Found', { status: 404, headers: { 'cache-control': 'no-store' } });
}

async function rejectDisabled(request: Request): Promise<Response | null> {
  try {
    const current = await auth().api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
    if (!current?.user?.id) return null;
    const result = await pool().query('SELECT 1 FROM auth_user WHERE id=$1 AND disabled=true', [current.user.id]);
    return result.rowCount ? new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } }) : null;
  } catch { return new Response('Service Unavailable', { status: 503, headers: { 'cache-control': 'no-store' } }); }
}

async function dispatch(method: 'GET' | 'POST', request: Request): Promise<Response> {
  if (!isExactAuthHost(request)) return rejectHost();
  if (method === 'POST' && !isExactAuthOrigin(request.headers.get('origin'))) {
    return new Response('Forbidden', { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  try {
    const route = new URL(request.url).pathname;
    if (method === 'POST') {
      const body: unknown = await readJson(request.clone());
      if (['/api/auth/sign-up/email','/api/auth/request-password-reset','/api/auth/send-verification-email'].includes(route) && !isAccountMailConfigured()) {
        throw new AppError(503,'MAIL_UNAVAILABLE','E-kirjade saatmine ei ole veel seadistatud.');
      }
      if (route === '/api/auth/sign-up/email') {
        const token=request.headers.get('x-invitation-token')?.trim();
        const email=body && typeof body==='object' && 'email' in body ? body.email : undefined;
        if (!token || typeof email!=='string' || !(await validateInvitationForSignup(token,email))) {
          throw new AppError(403,'INVITATION_REQUIRED','Konto loomiseks on vaja kehtivat sama e-posti kutset.');
        }
      }
    }
    const disabled = await rejectDisabled(request);
    if (disabled) return disabled;
    const handler = toNextJsHandler(auth());
    const response=await(method === 'GET' ? handler.GET(request) : handler.POST(request));
    response.headers.set('Cache-Control','no-store');
    response.headers.set('X-Robots-Tag','noindex, nofollow');
    return response;
  } catch(error) { return errorResponse(error); }
}

export async function GET(request: Request): Promise<Response> { return dispatch('GET', request); }
export async function POST(request: Request): Promise<Response> { return dispatch('POST', request); }
