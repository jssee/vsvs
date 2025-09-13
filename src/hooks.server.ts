import {
  validateSessionToken,
  setSessionTokenCookie,
  deleteSessionTokenCookie,
} from "$lib/server/auth";
import { AUTH_CONFIG } from "$lib/server/auth/config";

import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME) ?? null;
  if (token === null) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const result = await validateSessionToken(token);
  if (result.isOk()) {
    const { session, user } = result.value;
    if (session !== null) {
      setSessionTokenCookie(event, token, session.expiresAt);
    } else {
      deleteSessionTokenCookie(event);
    }
    event.locals.session = session;
    event.locals.user = user;
  } else {
    // On error, clear auth state and cookie
    deleteSessionTokenCookie(event);
    event.locals.session = null;
    event.locals.user = null;
  }
  return resolve(event);
};
