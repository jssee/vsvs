export abstract class TaggedError<const Tag extends string> extends Error {
  readonly tag: Tag;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.tag = this.name as Tag;
  }
}

export class AuthSessionCreationError extends TaggedError<"AuthSessionCreationError"> {
  constructor() {
    super("Failed to create sessions");
  }
}

export class EmailAlreadyInUseError extends TaggedError<"EmailAlreadyInUseError"> {
  readonly email: string;
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.email = email;
  }
}

export class UsernameAlreadyTakenError extends TaggedError<"UsernameAlreadyTakenError"> {
  readonly username: string;
  constructor(username: string) {
    super(`Username already taken: ${username}`);
    this.username = username;
  }
}
