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

// Invitation System Errors

export class InviteCodeNotFoundError extends TaggedError<"InviteCodeNotFoundError"> {
  constructor(message = "Invalid invite code") {
    super(message);
  }
}

export class BattleFullError extends TaggedError<"BattleFullError"> {
  constructor(message = "Battle is full") {
    super(message);
  }
}

export class BattleInactiveError extends TaggedError<"BattleInactiveError"> {
  constructor(message = "Battle is no longer active") {
    super(message);
  }
}

export class AlreadyInBattleError extends TaggedError<"AlreadyInBattleError"> {
  constructor(message = "You are already in this battle") {
    super(message);
  }
}

export class InvalidEmailError extends TaggedError<"InvalidEmailError"> {
  constructor(message = "Invalid email address") {
    super(message);
  }
}

export class InvitationAlreadySentError extends TaggedError<"InvitationAlreadySentError"> {
  constructor(message = "Invitation already sent to this user") {
    super(message);
  }
}

export class NotAuthorizedError extends TaggedError<"NotAuthorizedError"> {
  constructor(message = "Not authorized to perform this action") {
    super(message);
  }
}

export class InvitationNotFoundError extends TaggedError<"InvitationNotFoundError"> {
  constructor(message = "Invitation not found") {
    super(message);
  }
}

export class BattleNotFoundError extends TaggedError<"BattleNotFoundError"> {
  constructor(message = "Battle not found") {
    super(message);
  }
}

export class UnauthenticatedError extends TaggedError<"UnauthenticatedError"> {
  constructor(message = "Authentication required") {
    super(message);
  }
}
