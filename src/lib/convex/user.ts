import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      username: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("user").collect();
  },
});

export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      username: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      username: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

// Note: User creation is now handled by Better Auth
// The user table is synced from Better Auth users via syncCurrentUser mutation in auth.ts

export const getUserById = query({
  args: {
    userId: v.id("user"),
  },
  returns: v.union(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      username: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
