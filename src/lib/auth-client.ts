'use client';

import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

/** Browser client for the admin-origin auth API. */
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
