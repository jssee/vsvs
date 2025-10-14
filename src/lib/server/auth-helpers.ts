import { redirect } from "@sveltejs/kit";
import { createConvexHttpClient } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { api } from "$lib/convex/_generated/api";
import type { RequestEvent } from "@sveltejs/kit";
import { getStaticAuth } from "@convex-dev/better-auth";
import { createCookieGetter } from "better-auth/cookies";
import { JWT_COOKIE_NAME } from "@convex-dev/better-auth/plugins";
import { createAuth } from "$lib/convex/auth";

function clearAuthCookies(event: RequestEvent) {
  const { options } = getStaticAuth(createAuth);
  const createCookie = createCookieGetter(options);
  const sessionCookie = createCookie(JWT_COOKIE_NAME);

  const path = sessionCookie.attributes.path ?? "/";
  const sameSiteAttribute = sessionCookie.attributes.sameSite;
  let normalizedSameSite: "strict" | "lax" | "none" | undefined;
  if (typeof sameSiteAttribute === "string") {
    const lowered = sameSiteAttribute.toLowerCase();
    if (lowered === "strict" || lowered === "lax" || lowered === "none") {
      normalizedSameSite = lowered;
    }
  } else if (sameSiteAttribute === true) {
    normalizedSameSite = "strict";
  }

  const baseOptions = {
    domain: sessionCookie.attributes.domain,
    path,
    sameSite: normalizedSameSite,
    httpOnly: sessionCookie.attributes.httpOnly,
  };

  const insecureName = sessionCookie.name.replace("__Secure-", "");
  const secureName = sessionCookie.name.startsWith("__Secure-")
    ? sessionCookie.name
    : `__Secure-${sessionCookie.name}`;

  event.cookies.delete(insecureName, {
    ...baseOptions,
    secure: false,
  });

  event.cookies.delete(secureName, {
    ...baseOptions,
    secure: true,
  });
}

function isUnauthorizedError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && (error as { status?: number }).status === 401) {
      return true;
    }
    if ("code" in error && (error as { code?: number }).code === 401) {
      return true;
    }
    if ("response" in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status === 401) {
        return true;
      }
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
      : "";

  return message.toLowerCase().includes("unauthorized") || message.includes("401");
}

function isUsernameTakenError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return message.includes("Username already taken");
}

/**
 * Gets the authenticated Convex client and current user from the request event.
 * Automatically syncs user from Better Auth to app's user table if needed.
 * Redirects to /signin if not authenticated.
 */
export async function requireAuth(event: RequestEvent) {
  if (!event.locals.token) {
    redirect(302, "/signin");
  }

  const client = createConvexHttpClient({ token: event.locals.token });

  // Try to get user, and sync if needed
  let user;
  try {
    user = await client.query(api.auth.getCurrentUser, {});
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearAuthCookies(event);
      event.locals.token = undefined;
      redirect(302, "/signin");
    }
    throw error;
  }

  if (!user) {
    // User doesn't exist in app table yet - sync from Better Auth
    try {
      user = await client.mutation(api.auth.syncCurrentUser, {});
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearAuthCookies(event);
        event.locals.token = undefined;
        redirect(302, "/signin");
      }
      if (isUsernameTakenError(error)) {
        clearAuthCookies(event);
        event.locals.token = undefined;
        throw error;
      }
      console.error("Failed to sync user:", error);
      redirect(302, "/signin");
    }
  }

  if (!user) {
    redirect(302, "/signin");
  }

  return { client, user };
}

/**
 * Gets the authenticated Convex client and current user if available,
 * but doesn't redirect if not authenticated.
 * Automatically syncs user from Better Auth to app's user table if needed.
 */
export async function getAuth(event: RequestEvent) {
  if (!event.locals.token) {
    return { client: null, user: null };
  }

  const client = createConvexHttpClient({ token: event.locals.token });

  // Try to get user, and sync if needed
  let user;
  try {
    user = await client.query(api.auth.getCurrentUser, {});
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearAuthCookies(event);
      event.locals.token = undefined;
      return { client: null, user: null };
    }
    throw error;
  }

  if (!user) {
    // User doesn't exist in app table yet - sync from Better Auth
    try {
      user = await client.mutation(api.auth.syncCurrentUser, {});
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearAuthCookies(event);
        event.locals.token = undefined;
        return { client: null, user: null };
      }
      if (isUsernameTakenError(error)) {
        clearAuthCookies(event);
        event.locals.token = undefined;
        return { client: null, user: null };
      }
      console.error("Failed to sync user:", error);
      return { client, user: null };
    }
  }

  return { client, user };
}
