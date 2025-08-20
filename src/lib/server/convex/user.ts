import { genSaltSync, hashSync } from 'bcrypt-ts';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const get = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id('user'),
			_creationTime: v.number(),
			email: v.string()
		})
	),
	handler: async (ctx) => {
		const users = await ctx.db.query('user').collect();
		// Remove password from public user data
		return users.map(({ password, ...userPublic }) => userPublic);
	}
});

export const getUserByEmail = query({
	args: {
		email: v.string()
	},
	returns: v.union(
		v.object({
			_id: v.id('user'),
			_creationTime: v.number(),
			email: v.string()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('user')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.unique();
		
		if (!user) {
			return null;
		}
		
		// Remove password from public user data
		const { password, ...userPublic } = user;
		return userPublic;
	}
});

export const createUser = mutation({
	args: {
		email: v.string(),
		password: v.string()
	},
	returns: v.id('user'),
	handler: async (ctx, args) => {
		const salt = genSaltSync(10);
		const hash = hashSync(args.password, salt);

		return await ctx.db.insert('user', {
			email: args.email,
			password: hash
		});
	}
});

export const getUserPasswordHash = query({
	args: {
		userId: v.id('user')
	},
	returns: v.string(),
	handler: async (ctx, args) => {
		const user = await ctx.db.get(args.userId);

		if (!user) {
			throw new Error('User not found');
		}

		return user.password;
	}
});

export const getUserWithPasswordByEmail = query({
	args: {
		email: v.string()
	},
	returns: v.union(
		v.object({
			_id: v.id('user'),
			_creationTime: v.number(),
			email: v.string(),
			password: v.string()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		return await ctx.db
			.query('user')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.unique();
	}
});
