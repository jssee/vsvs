import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { type DataModel } from "./_generated/dataModel";
import { query, mutation, internalMutation } from "./_generated/server";
import { betterAuth } from "better-auth";
import { UsernameAlreadyTakenError } from "../errors";
import { v } from "convex/values";

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

export const syncUserByEmail = internalMutation({
  args: { email: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("profile")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      return existingUser;
    }

    const usernameConflict = await ctx.db
      .query("profile")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (usernameConflict) {
      throw new UsernameAlreadyTakenError(args.username);
    }

    const newUserId = await ctx.db.insert("profile", {
      email: args.email,
      username: args.username,
    });

    const newUser = await ctx.db.get(newUserId);
    if (!newUser) {
      throw new Error("Failed to create profile");
    }

    return newUser;
  },
});

export const syncCurrentUser = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<any> => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (!authUser) {
      throw new Error("Not authenticated");
    }

    if (!authUser.email) {
      throw new Error("Better Auth user record is missing an email address");
    }

    if (!authUser.name) {
      throw new Error("Username is required");
    }

    const user: any = await ctx.runMutation(internal.auth.syncUserByEmail, {
      email: authUser.email,
      username: authUser.name,
    });

    return user;
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
