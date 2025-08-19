import { genSaltSync, hashSync } from 'bcrypt-ts';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const get = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id('user'),
			_creationTime: v.number(),
			email: v.string(),
			password: v.string()
		})
	),
	handler: async (ctx) => {
		const user = await ctx.db.query('user').collect();
		return user;
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
			email: v.string(),
			password: v.string()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('user')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.unique();
		return user;
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
		const row = await ctx.db
			.query('user')
			.withIndex('by_id', (q) => q.eq('_id', args.userId))
			.unique();

		if (!row) {
			throw new Error('invalid user id');
		}

		return row.password;
	}
});
