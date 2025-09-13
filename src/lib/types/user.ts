import type { Doc } from "$lib/convex/_generated/dataModel";

export type User = Omit<Doc<"user">, "password">;

export type AuthContext = {
  session: Doc<"session">;
  user: User;
};

export type AuthState = AuthContext | { [K in keyof AuthContext]: null };
