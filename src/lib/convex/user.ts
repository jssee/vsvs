import { genSaltSync, hashSync } from "bcrypt-ts";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Result } from "typescript-result";

import { EmailAlreadyInUseError, UsernameAlreadyTakenError } from "../errors";

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
    const users = await ctx.db.query("user").collect();
    // Remove password from public user data
    return users.map(({ password, ...userPublic }) => userPublic);
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
    const user = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      return null;
    }

    // Remove password from public user data
    const { password, ...userPublic } = user;
    return userPublic;
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
    const user = await ctx.db
      .query("user")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      return null;
    }

    const { password, ...userPublic } = user;
    return userPublic;
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    username: v.string(),
  },
  returns: v.id("user"),
  handler: async (ctx, args) => {
    const existingEmail = await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingEmail) {
      throw new EmailAlreadyInUseError(args.email);
    }

    const existingUsername = await ctx.db
      .query("user")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existingUsername) {
      throw new UsernameAlreadyTakenError(args.username);
    }

    const salt = genSaltSync(10);
    const hash = hashSync(args.password, salt);

    return await ctx.db.insert("user", {
      email: args.email,
      password: hash,
      username: args.username,
    });
  },
});

export const getUserPasswordHash = query({
  args: {
    userId: v.id("user"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user.password;
  },
});

export const getUserWithPasswordByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      password: v.string(),
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
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Remove password from public user data
    const { password, ...userPublic } = user;
    return userPublic;
  },
});
