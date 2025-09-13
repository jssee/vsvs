import { Doc } from "$lib/convex/_generated/dataModel";
import { User } from "$lib/types/user";
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: User | null;
      session: Doc<"session"> | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
