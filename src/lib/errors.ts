/**
 * An abstract base class for creating tagged error types.
 *
 * This class extends the built-in Error class and adds a tagged union
 * pattern, allowing each error to have a unique tag type. The tag helps in
 * identifying and categorizing different types of errors
 * for structured error handling.
 *
 * @template Kind - The type of the tag used for identifying the error.
 * @abstract
 * @extends {Error}
 */
export abstract class KindOfError<const Kind extends string> extends Error {
  readonly kind: Kind;

  /**
   * Creates a new TaggedError instance.
   *
   * @param message - The error message.
   * @param options - Additional options for the error.
   */
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.kind = this.name as Kind;

    if (options.cause && options.cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }
}

export class AuthSessionCreationError extends KindOfError<"AuthSessionCreationError"> {
  readonly sessionId: string;
  readonly userId: string;
  readonly expiresAt: number;

  constructor(
    sessionId: string,
    userId: string,
    expiresAt: number,
    options: ErrorOptions = {},
  ) {
    super(
      `Failed to create sessions:\n sessionId=${sessionId}, userId=${userId}, expiresAt=${expiresAt}`,
      options,
    );
    this.sessionId = sessionId;
    this.userId = userId;
    this.expiresAt = expiresAt;
  }
}

export class AuthSessionLookupError extends Error {
  readonly kind = "auth-session-lookup" as const;
  constructor(message = "Failed to look up session") {
    super(message);
  }
}

export class AuthSessionDeletionError extends Error {
  readonly kind = "auth-session-delete" as const;
  constructor(message = "Failed to delete session") {
    super(message);
  }
}

export class AuthSessionExpiryUpdateError extends Error {
  readonly kind = "auth-session-expiry-update" as const;
  constructor(message = "Failed to update session expiry") {
    super(message);
  }
}

export class AuthSessionInvalidationError extends Error {
  readonly kind = "auth-session-invalidate" as const;
  constructor(message = "Failed to invalidate session") {
    super(message);
  }
}

export class AuthUserSessionsInvalidationError extends Error {
  readonly kind = "auth-user-invalidate-all-sessions" as const;
  constructor(message = "Failed to invalidate all user sessions") {
    super(message);
  }
}
