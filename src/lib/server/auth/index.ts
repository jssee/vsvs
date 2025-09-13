import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { error, type RequestEvent } from "@sveltejs/kit";
import { compareSync } from "bcrypt-ts";
import { Result } from "typescript-result";

import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import { AUTH_CONFIG, COOKIE_OPTIONS } from "$lib/server/auth/config";
import { getConvexClient } from "$lib/convex-client";
import type { AuthState } from "$lib/types/user";
import { AuthSessionCreationError } from "$lib/errors";

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(token: string, userId: Id<"user">) {
  return Result.try(
    async () => {
      const convex = getConvexClient();
      const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token)),
      );
      const expiresAt = Date.now() + AUTH_CONFIG.SESSION_DURATION_MS;

      await convex.mutation(api.session.createSession, {
        sessionId,
        userId,
        expiresAt,
      });

      return { sessionId, userId, expiresAt };
    },
    (error) => new AuthSessionCreationError(sessionId, userId, expiresAt),
  );
}

export async function validateSessionToken(token: string) {
  return Result.try(async () => {
    const convex = getConvexClient();
    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );
    const result = await convex.query(api.session.getSessionWithUser, {
      sessionId,
    });

    if (!result) {
      return { session: null, user: null } as AuthState;
    }

    const { user, session } = result;
    if (Date.now() >= session.expiresAt) {
      await convex.mutation(api.session.deleteSession, {
        sessionId: session.sessionId,
      });
      return { session: null, user: null } as AuthState;
    }

    if (
      Date.now() >=
      session.expiresAt - AUTH_CONFIG.SESSION_RENEWAL_THRESHOLD_MS
    ) {
      const newExpiresAt = Date.now() + AUTH_CONFIG.SESSION_DURATION_MS;
      await convex.mutation(api.session.updateSessionExpiry, {
        sessionId: session.sessionId,
        expiresAt: newExpiresAt,
      });
      session.expiresAt = newExpiresAt;
    }

    return { session, user } as AuthState;
  });
}

export async function invalidateSession(sessionId: string) {
  return Result.wrap(async () => {
    const convex = getConvexClient();
    await convex.mutation(api.session.deleteSession, { sessionId });
  });
}

export async function invalidateAllSessions(userId: Id<"user">) {
  return Result.wrap(async () => {
    const convex = getConvexClient();
    await convex.mutation(api.session.deleteUserSessions, { userId });
  });
}

export function setSessionTokenCookie(
  event: RequestEvent,
  token: string,
  expiresAt: number,
): void {
  event.cookies.set(AUTH_CONFIG.SESSION_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    expires: new Date(expiresAt),
  });
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
  event.cookies.set(AUTH_CONFIG.SESSION_COOKIE_NAME, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export function verifyPasswordHash(hash: string, password: string) {
  return compareSync(password, hash);
}
