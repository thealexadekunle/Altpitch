"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/** baseURL defaults to same-origin when omitted, which is correct here — the app and its auth
 * API share one domain. */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
