import type { Doc, Id } from "$lib/server/convex/_generated/dataModel";

export type UserPublic = {
  _id: Id<"user">;
  _creationTime: number;
  email: string;
  username: string;
};

export type UserWithPassword = Doc<"user">;

export type SessionWithUser = {
  session: Doc<"session">;
  user: UserPublic;
};

export type SessionValidationResult =
  | SessionWithUser
  | { session: null; user: null };
