import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { type DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { betterAuth } from "better-auth";
import { UsernameAlreadyTakenError } from "../errors";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: process.env.PUBLIC_SITE_URL,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
    // Sync users to app's user table after sign-up
    onAfterSignUp: async () => {
      // Trigger sync after signup
      // The actual sync happens when getCurrentUser is first called
      // This callback is mainly for logging/tracking
    },
  });
};

// Mutation to sync the current Better Auth user to app's user table
// Should be called after sign-up/sign-in to ensure user exists in app table
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const betterAuthUser = await authComponent.getAuthUser(ctx);

    if (!betterAuthUser) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", betterAuthUser.email))
      .unique();

    if (existingUser) {
      // User already synced
      const { password: _password, ...userPublic } = existingUser;
      return userPublic;
    }

    // Create new app user from Better Auth user
    if (!betterAuthUser.email) {
      throw new Error("Better Auth user record is missing an email address");
    }

    const preferredUsername =
      betterAuthUser.name?.trim() ||
      betterAuthUser.email.split("@")[0]?.trim() ||
      "";

    const sanitizedUsername = preferredUsername.replace(/[^a-zA-Z0-9_]/g, "_");

    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
      throw new Error(
        "Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.",
      );
    }

    const username = sanitizedUsername;

    const usernameConflict = await ctx.db
      .query("user")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (usernameConflict) {
      throw new UsernameAlreadyTakenError(username);
    }

    const newUserId = await ctx.db.insert("user", {
      email: betterAuthUser.email,
      password: "managed-by-better-auth", // Better Auth handles authentication
      username: username,
    });

    const newUser = await ctx.db.get(newUserId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    const { password: _password, ...userPublic } = newUser;
    return userPublic;
  },
});

// Gets the current Better Auth user and returns the corresponding app user
// Returns the app user (from "user" table) for use in the rest of the app
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get Better Auth user
    const betterAuthUser = await authComponent.getAuthUser(ctx);

    if (!betterAuthUser) {
      return null;
    }

    // Find corresponding user in our app's user table by email
    const appUser = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", betterAuthUser.email))
      .unique();

    if (!appUser) {
      // User needs to be synced - this shouldn't normally happen
      // as sync should occur after sign-up, but return null for now
      return null;
    }

    // Return app user (without password)
    const { password: _password, ...userPublic } = appUser;
    return userPublic;
  },
});
