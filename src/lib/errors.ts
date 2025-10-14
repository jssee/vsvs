// Authentication Errors

export class AuthSessionCreationError extends Error {
  readonly type = "AuthSessionCreationError";
}

export class EmailAlreadyInUseError extends Error {
  readonly type = "EmailAlreadyInUseError";
  readonly email: string;
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.email = email;
  }
}

export class UsernameAlreadyTakenError extends Error {
  readonly type = "UsernameAlreadyTakenError";
  readonly username: string;
  constructor(username: string) {
    super(`Username already taken: ${username}`);
    this.username = username;
  }
}

// Invitation System Errors

export class InviteCodeNotFoundError extends Error {
  readonly type = "InviteCodeNotFoundError";
}

export class BattleFullError extends Error {
  readonly type = "BattleFullError";
}

export class BattleInactiveError extends Error {
  readonly type = "BattleInactiveError";
}

export class AlreadyInBattleError extends Error {
  readonly type = "AlreadyInBattleError";
}

export class InvalidEmailError extends Error {
  readonly type = "InvalidEmailError";
}

export class InvitationAlreadySentError extends Error {
  readonly type = "InvitationAlreadySentError";
}

export class NotAuthorizedError extends Error {
  readonly type = "NotAuthorizedError";
}

export class InvitationNotFoundError extends Error {
  readonly type = "InvitationNotFoundError";
}

export class BattleNotFoundError extends Error {
  readonly type = "BattleNotFoundError";
}

export class UnauthenticatedError extends Error {
  readonly type = "UnauthenticatedError";
}
