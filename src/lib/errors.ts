/**
 * An abstract base class for creating tagged error types.
 *
 * This class extends the built-in Error class and adds a tagged union
 * pattern, allowing each error to have a unique tag type. The tag helps in
 * identifying and categorizing different types of errors
 * for structured error handling.
 *
 * @template Tag - The type of the tag used for identifying the error.
 * @abstract
 * @extends {Error}
 */
export abstract class TaggedError<const Tag extends string> extends Error {
  readonly tag: Tag;

  /**
   * Creates a new TaggedError instance.
   *
   * @param message - The error message.
   * @param options - Additional options for the error.
   */
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.tag = this.name as Tag;

    if (options.cause && options.cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }
}

export class AuthSessionCreationError extends TaggedError<"AuthSessionCreationError"> {
  constructor(options: ErrorOptions = {}) {
    super("Failed to create sessions", options);
  }
}

export class BattleCreationError extends TaggedError<"BattleCreationError"> {
  readonly userId: string;
  readonly name: string;
  readonly visibility: "public" | "private";
  readonly maxPlayers: number;
  readonly doubleSubmissions: boolean;

  constructor(
    params: {
      userId: string;
      name: string;
      visibility: "public" | "private";
      maxPlayers: number;
      doubleSubmissions: boolean;
    },
    options: ErrorOptions = {},
  ) {
    super(
      `Failed to create battle: name="${params.name}", visibility=${params.visibility}, maxPlayers=${params.maxPlayers}, doubleSubmissions=${params.doubleSubmissions}`,
      options,
    );
    this.userId = params.userId;
    this.name = params.name;
    this.visibility = params.visibility;
    this.maxPlayers = params.maxPlayers;
    this.doubleSubmissions = params.doubleSubmissions;
  }
}

export class EmailAlreadyInUseError extends TaggedError<"EmailAlreadyInUseError"> {
  readonly email: string;
  constructor(email: string, options: ErrorOptions = {}) {
    super(`Email already in use: ${email}`, options);
    this.email = email;
  }
}

export class UsernameAlreadyTakenError extends TaggedError<"UsernameAlreadyTakenError"> {
  readonly username: string;
  constructor(username: string, options: ErrorOptions = {}) {
    super(`Username already taken: ${username}`, options);
    this.username = username;
  }
}
