export const AUTH_CONFIG = {
  SESSION_DURATION_MS: 1000 * 60 * 60 * 24 * 30, // 30 days
  SESSION_RENEWAL_THRESHOLD_MS: 1000 * 60 * 60 * 24 * 15, // 15 days
  PASSWORD_SALT_ROUNDS: 10,
  SESSION_COOKIE_NAME: "session",
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
} as const;
