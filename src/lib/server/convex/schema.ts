import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	user: defineTable({
		email: v.string(),
		password: v.string()
	}).index('by_email', ['email']),

	session: defineTable({
		sessionId: v.string(),
		userId: v.id('user'),
		expiresAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_session_id', ['sessionId'])
});
