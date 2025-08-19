import type { RequestEvent } from '@sveltejs/kit';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '$lib/convex/_generated/api';
import type { Doc, Id } from '$lib/convex/_generated/dataModel';
import { env } from '$env/dynamic/public';
import { compareSync } from 'bcrypt-ts';

const convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL);

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(
	token: string,
	userId: Id<'user'>
): Promise<{ sessionId: string; userId: Id<'user'>; expiresAt: number }> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;

	await convex.mutation(api.session.createSession, {
		sessionId,
		userId,
		expiresAt
	});

	return { sessionId, userId, expiresAt };
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const result = await convex.query(api.session.getSessionWithUser, { sessionId });

	if (!result) {
		return { session: null, user: null };
	}

	const { user, session } = result;
	if (Date.now() >= session.expiresAt) {
		await convex.mutation(api.session.deleteSession, { sessionId: session.sessionId });
		return { session: null, user: null };
	}

	if (Date.now() >= session.expiresAt - 1000 * 60 * 60 * 24 * 15) {
		const newExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
		await convex.mutation(api.session.updateSessionExpiry, {
			sessionId: session.sessionId,
			expiresAt: newExpiresAt
		});
		session.expiresAt = newExpiresAt;
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await convex.mutation(api.session.deleteSession, { sessionId });
}

export async function invalidateAllSessions(userId: Id<'user'>): Promise<void> {
	await convex.mutation(api.session.deleteUserSessions, { userId });
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: number): void {
	event.cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(expiresAt),
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set('session', '', {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 0,
		path: '/'
	});
}
export type SessionValidationResult =
	| { session: Doc<'session'>; user: Doc<'user'> }
	| { session: null; user: null };

export function verifyPasswordHash(hash: string, password: string) {
	return compareSync(password, hash);
}
