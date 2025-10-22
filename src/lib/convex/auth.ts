import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { type DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { betterAuth } from "better-auth";
import { UsernameAlreadyTakenError } from "../errors";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: process.env.PUBLIC_SITE_URL,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex()],
  });
};

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("profile")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (existingUser) {
      return existingUser;
    }

    if (!authUser.email) {
      throw new Error("Better Auth user record is missing an email address");
    }

    // TODO: move theis check somewhere more centralized and proibably zod-based
    const preferredUsername =
      authUser.name?.trim() || authUser.email.split("@")[0]?.trim() || "";
    const sanitizedUsername = preferredUsername.replace(/[^a-zA-Z0-9_]/g, "_");

    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
      throw new Error(
        "Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.",
      );
    }

    const username = sanitizedUsername;

    const usernameConflict = await ctx.db
      .query("profile")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (usernameConflict) {
      throw new UsernameAlreadyTakenError(username);
    }

    const newUserId = await ctx.db.insert("profile", {
      email: authUser.email,
      username: username,
    });

    const newUser = await ctx.db.get(newUserId);
    if (!newUser) {
      throw new Error("Failed to create profile");
    }

    return newUser;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (!authUser) {
      return null;
    }

    const appUser = await ctx.db
      .query("profile")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!appUser) {
      return null;
    }

    // Return app profile
    return appUser;
  },
});
