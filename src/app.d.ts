import { Doc } from "$lib/server/convex/_generated/dataModel";
import { UserPublic } from "$lib/types/user";
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: UserPublic | null;
      session: Doc<"session"> | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
