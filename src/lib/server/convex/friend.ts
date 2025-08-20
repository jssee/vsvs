import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendFriendRequest = mutation({
  args: {
    requesterId: v.id("user"),
    recipientId: v.id("user"),
  },
  returns: v.id("friendship"),
  handler: async (ctx, args) => {
    if (args.requesterId === args.recipientId) {
      throw new Error("Cannot send friend request to yourself");
    }

    const requester = await ctx.db.get(args.requesterId);
    const recipient = await ctx.db.get(args.recipientId);

    if (!requester || !recipient) {
      throw new Error("One or both users not found");
    }

    const existingFriendship = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q
          .eq("requesterId", args.requesterId)
          .eq("recipientId", args.recipientId),
      )
      .unique();

    const reverseFriendship = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q
          .eq("requesterId", args.recipientId)
          .eq("recipientId", args.requesterId),
      )
      .unique();

    if (existingFriendship) {
      throw new Error("Friend request already sent");
    }

    if (reverseFriendship) {
      if (reverseFriendship.status === "accepted") {
        throw new Error("Already friends");
      }
      if (reverseFriendship.status === "pending") {
        throw new Error("You have a pending friend request from this user");
      }
    }

    return await ctx.db.insert("friendship", {
      requesterId: args.requesterId,
      recipientId: args.recipientId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendship"),
    userId: v.id("user"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.recipientId !== args.userId) {
      throw new Error("Not authorized to accept this friend request");
    }

    if (friendship.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    return null;
  },
});

export const rejectFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendship"),
    userId: v.id("user"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.recipientId !== args.userId) {
      throw new Error("Not authorized to reject this friend request");
    }

    if (friendship.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    await ctx.db.delete(args.friendshipId);
    return null;
  },
});

export const removeFriend = mutation({
  args: {
    userId: v.id("user"),
    friendId: v.id("user"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.userId === args.friendId) {
      throw new Error("Cannot remove yourself as a friend");
    }

    const friendship1 = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q.eq("requesterId", args.userId).eq("recipientId", args.friendId),
      )
      .unique();

    const friendship2 = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q.eq("requesterId", args.friendId).eq("recipientId", args.userId),
      )
      .unique();

    const friendship = friendship1 || friendship2;

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    if (friendship.status !== "accepted") {
      throw new Error("Not currently friends");
    }

    await ctx.db.delete(friendship._id);
    return null;
  },
});

export const getFriends = query({
  args: {
    userId: v.id("user"),
  },
  returns: v.array(
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      email: v.string(),
      friendshipId: v.id("friendship"),
      friendedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const sentRequests = await ctx.db
      .query("friendship")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const receivedRequests = await ctx.db
      .query("friendship")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friends = [];

    for (const friendship of sentRequests) {
      const friend = await ctx.db.get(friendship.recipientId);
      if (friend) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...friendPublic } = friend;
        friends.push({
          ...friendPublic,
          friendshipId: friendship._id,
          friendedAt: friendship.acceptedAt || friendship.createdAt,
        });
      }
    }

    for (const friendship of receivedRequests) {
      const friend = await ctx.db.get(friendship.requesterId);
      if (friend) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...friendPublic } = friend;
        friends.push({
          ...friendPublic,
          friendshipId: friendship._id,
          friendedAt: friendship.acceptedAt || friendship.createdAt,
        });
      }
    }

    return friends;
  },
});

export const getPendingFriendRequests = query({
  args: {
    userId: v.id("user"),
  },
  returns: v.object({
    incoming: v.array(
      v.object({
        friendshipId: v.id("friendship"),
        createdAt: v.number(),
        requester: v.object({
          _id: v.id("user"),
          _creationTime: v.number(),
          email: v.string(),
        }),
      }),
    ),
    outgoing: v.array(
      v.object({
        friendshipId: v.id("friendship"),
        createdAt: v.number(),
        recipient: v.object({
          _id: v.id("user"),
          _creationTime: v.number(),
          email: v.string(),
        }),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const incomingRequests = await ctx.db
      .query("friendship")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const outgoingRequests = await ctx.db
      .query("friendship")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const incoming = [];
    for (const friendship of incomingRequests) {
      const requester = await ctx.db.get(friendship.requesterId);
      if (requester) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...requesterPublic } = requester;
        incoming.push({
          friendshipId: friendship._id,
          createdAt: friendship.createdAt,
          requester: requesterPublic,
        });
      }
    }

    const outgoing = [];
    for (const friendship of outgoingRequests) {
      const recipient = await ctx.db.get(friendship.recipientId);
      if (recipient) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...recipientPublic } = recipient;
        outgoing.push({
          friendshipId: friendship._id,
          createdAt: friendship.createdAt,
          recipient: recipientPublic,
        });
      }
    }

    return { incoming, outgoing };
  },
});

export const checkFriendshipStatus = query({
  args: {
    userId1: v.id("user"),
    userId2: v.id("user"),
  },
  returns: v.union(
    v.object({
      status: v.literal("friends"),
      friendshipId: v.id("friendship"),
      friendedAt: v.number(),
    }),
    v.object({
      status: v.literal("pending_sent"),
      friendshipId: v.id("friendship"),
    }),
    v.object({
      status: v.literal("pending_received"),
      friendshipId: v.id("friendship"),
    }),
    v.object({
      status: v.literal("none"),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.userId1 === args.userId2) {
      return { status: "none" as const };
    }

    const friendship1 = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q.eq("requesterId", args.userId1).eq("recipientId", args.userId2),
      )
      .unique();

    const friendship2 = await ctx.db
      .query("friendship")
      .withIndex("by_requester_and_recipient", (q) =>
        q.eq("requesterId", args.userId2).eq("recipientId", args.userId1),
      )
      .unique();

    if (friendship1) {
      if (friendship1.status === "accepted") {
        return {
          status: "friends" as const,
          friendshipId: friendship1._id,
          friendedAt: friendship1.acceptedAt || friendship1.createdAt,
        };
      }
      if (friendship1.status === "pending") {
        return {
          status: "pending_sent" as const,
          friendshipId: friendship1._id,
        };
      }
    }

    if (friendship2) {
      if (friendship2.status === "accepted") {
        return {
          status: "friends" as const,
          friendshipId: friendship2._id,
          friendedAt: friendship2.acceptedAt || friendship2.createdAt,
        };
      }
      if (friendship2.status === "pending") {
        return {
          status: "pending_received" as const,
          friendshipId: friendship2._id,
        };
      }
    }

    return { status: "none" as const };
  },
});
