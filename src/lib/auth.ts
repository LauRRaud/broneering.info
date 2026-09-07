import { randomBytes } from 'node:crypto';
import { Kysely, PostgresDialect } from 'kysely';
import { APIError, betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { pool } from './db';
import { validateInvitationForSignup } from './invitations';
import { assertAuthConfiguration, authBaseUrl, authIsProduction } from './auth-host';
import { sendAccountMail } from './auth-mail';

let instance: ReturnType<typeof betterAuth> | undefined;

export function auth(): ReturnType<typeof betterAuth> {
  assertAuthConfiguration();
  if (instance) return instance;
  const secret = process.env.AUTH_SECRET?.trim() || randomBytes(32).toString('base64url');
  const database = new Kysely({ dialect: new PostgresDialect({ pool: pool() }) });
  instance = betterAuth({
    database: { db: database, type: 'postgres', transaction: true },
    baseURL: authBaseUrl,
    basePath: '/api/auth',
    secret,
    logger: { disabled: true },
    trustedOrigins: [authBaseUrl],
    advanced: { useSecureCookies: authIsProduction },
    user: {
      modelName: 'auth_user',
      fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
      additionalFields: {
        isPlatformAdmin: { type: 'boolean', fieldName: 'is_platform_admin', required: true, defaultValue: false, input: false },
        disabled: { type: 'boolean', fieldName: 'disabled', required: true, defaultValue: false, input: false },
      },
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    session: {
      modelName: 'auth_session',
      fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at', ipAddress: 'ip_address', userAgent: 'user_agent', userId: 'user_id' },
      additionalFields: { mfaVerifiedAt: { type: 'date', fieldName: 'mfa_verified_at', required: false, input: false } },
      cookieCache: { enabled: false },
    },
    account: {
      modelName: 'auth_account',
      fields: { accountId: 'account_id', providerId: 'provider_id', userId: 'user_id', accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token', accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
    },
    verification: {
      modelName: 'auth_verification',
      fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
      storeInDatabase: true,
      storeIdentifier: { default: 'hashed' },
    },
    rateLimit: { enabled: true, storage: 'database', modelName: 'auth_rate_limit', fields: { lastRequest: 'last_request' } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendAccountMail({
        to: user.email,
        subject: 'broneering.info parooli taastamine',
        text: `Uue parooli määramiseks ava link: ${url}\n\nKui sa parooli taastamist ei taotlenud, võid seda kirja ignoreerida.`,
      }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => sendAccountMail({
        to: user.email,
        subject: 'Kinnita oma broneering.info e-post',
        text: `E-posti kinnitamiseks ava link: ${url}\n\nKui sa seda kontot ei loonud, võid seda kirja ignoreerida.`,
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (!context) throw APIError.from('FORBIDDEN', { code: 'INVITATION_REQUIRED', message: 'Konto loomiseks on vaja kutset.' });
            const token = context.request?.headers.get('x-invitation-token')?.trim();
            if (!token || !(await validateInvitationForSignup(token, user.email))) {
              throw APIError.from('FORBIDDEN', { code: 'INVITATION_REQUIRED', message: 'A valid invitation is required' });
            }
          },
        },
        update: {
          after: async (user, context) => {
            // A newly enrolled factor invalidates every earlier assurance.
            if (context?.path === '/two-factor/verify-totp' && user.twoFactorEnabled === true && user.id) {
              await context.context.internalAdapter.deleteUserSessions(user.id);
            }
          },
        },
      },
      session: {
        create: {
          before: async (session, context) => {
            const row = await pool().query<{ disabled: boolean }>('SELECT disabled FROM auth_user WHERE id=$1', [session.userId]);
            if (!row.rows[0] || row.rows[0].disabled) return false;
            if (context?.path?.startsWith('/two-factor/verify')) return { data: { mfaVerifiedAt: new Date() } };
          },
        },
      },
      account: {
        create: {
          before: async (account) => {
            const row = await pool().query<{ disabled: boolean }>('SELECT disabled FROM auth_user WHERE id=$1', [account.userId]);
            if (row.rows[0]?.disabled) return false;
          },
        },
        update: {
          before: async (account) => {
            const row = await pool().query<{ disabled: boolean }>('SELECT disabled FROM auth_user WHERE id=$1', [account.userId]);
            if (row.rows[0]?.disabled) return false;
          },
        },
      },
    },
    plugins: [twoFactor({
      issuer: 'Broneering.info',
      twoFactorTable: 'auth_two_factor',
      skipVerificationOnEnable: false,
      accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 },
      schema: {
        user: { fields: { twoFactorEnabled: 'two_factor_enabled' } },
        twoFactor: { fields: { userId: 'user_id', backupCodes: 'backup_codes', failedVerificationCount: 'failed_verification_count', lockedUntil: 'locked_until' } },
      },
    })],
  }) as unknown as ReturnType<typeof betterAuth>;
  return instance!;
}

export type Identity = { id: string; email: string; name: string; emailVerified: boolean; twoFactorEnabled: boolean; isPlatformAdmin: boolean };

/** Always resolves the live database session and disabled flag; no cookie cache is trusted. */
export async function getIdentity(headers: Headers): Promise<Identity | null> {
  const current = await auth().api.getSession({ headers, query: { disableCookieCache: true } });
  if (!current?.user?.id) return null;
  const result = await pool().query<{
    id: string; email: string; name: string; email_verified: boolean; two_factor_enabled: boolean | null; is_platform_admin: boolean; disabled: boolean;
  }>('SELECT id,email,name,email_verified,two_factor_enabled,is_platform_admin,disabled FROM auth_user WHERE id = $1', [current.user.id]);
  const user = result.rows[0];
  if (!user || user.disabled || !user.email_verified) return null;
  const sessionRecord = current.session as unknown as Record<string, unknown>;
  if (user.two_factor_enabled === true && !sessionRecord.mfaVerifiedAt) return null;
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.email_verified, twoFactorEnabled: user.two_factor_enabled === true, isPlatformAdmin: user.is_platform_admin === true };
}
