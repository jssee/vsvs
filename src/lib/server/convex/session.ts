import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createSession = mutation({
	args: {
		sessionId: v.string(),
		userId: v.id('user'),
		expiresAt: v.number()
	},
	returns: v.id('session'),
	handler: async (ctx, args) => {
		return await ctx.db.insert('session', {
			sessionId: args.sessionId,
			userId: args.userId,
			expiresAt: args.expiresAt
		});
	}
});

export const getSessionWithUser = query({
	args: {
		sessionId: v.string()
	},
	returns: v.union(
		v.object({
			session: v.object({
				_id: v.id('session'),
				_creationTime: v.number(),
				sessionId: v.string(),
				userId: v.id('user'),
				expiresAt: v.number()
			}),
			user: v.object({
				_id: v.id('user'),
				_creationTime: v.number(),
				email: v.string()
			})
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query('session')
			.withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
			.unique();

		if (!session) {
			return null;
		}

		const user = await ctx.db.get(session.userId);
		if (!user) {
			return null;
		}

		// Remove password from user data
		const { password, ...userPublic } = user;
		return { session, user: userPublic };
	}
});

export const deleteSession = mutation({
	args: {
		sessionId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query('session')
			.withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
			.unique();

		if (session) {
			await ctx.db.delete(session._id);
		}
		return null;
	}
});

export const deleteUserSessions = mutation({
	args: {
		userId: v.id('user')
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const sessions = await ctx.db
			.query('session')
			.withIndex('by_user', (q) => q.eq('userId', args.userId))
			.collect();

		for (const session of sessions) {
			await ctx.db.delete(session._id);
		}
		return null;
	}
});

export const updateSessionExpiry = mutation({
	args: {
		sessionId: v.string(),
		expiresAt: v.number()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query('session')
			.withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
			.unique();

		if (session) {
			await ctx.db.patch(session._id, {
				expiresAt: args.expiresAt
			});
		}
		return null;
	}
});
