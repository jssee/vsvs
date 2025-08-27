/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as battles from "../battles.js";
import type * as crons from "../crons.js";
import type * as friend from "../friend.js";
import type * as invitations from "../invitations.js";
import type * as phase_transitions from "../phase_transitions.js";
import type * as players from "../players.js";
import type * as session from "../session.js";
import type * as sessions from "../sessions.js";
import type * as spotify from "../spotify.js";
import type * as spotify_actions from "../spotify_actions.js";
import type * as submissions from "../submissions.js";
import type * as user from "../user.js";
import type * as voting from "../voting.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  battles: typeof battles;
  crons: typeof crons;
  friend: typeof friend;
  invitations: typeof invitations;
  phase_transitions: typeof phase_transitions;
  players: typeof players;
  session: typeof session;
  sessions: typeof sessions;
  spotify: typeof spotify;
  spotify_actions: typeof spotify_actions;
  submissions: typeof submissions;
  user: typeof user;
  voting: typeof voting;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
