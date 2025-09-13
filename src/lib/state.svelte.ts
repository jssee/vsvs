import { getContext, setContext } from "svelte";
import type { AuthState, User } from "./types/user";

const AUTH_CTX_KEY = "auth-ctx";

class User {
  constructor(initialData: User);
}

export function setAuthState(state: AuthState): void {
  const userState = new User(state);
  setContext(AUTH_CTX_KEY, state);
}

export function getAuthState(): AuthState {
  return getContext(AUTH_CTX_KEY);
}
