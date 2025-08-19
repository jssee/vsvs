import { redirect, fail } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';

import {
	generateSessionToken,
	setSessionTokenCookie,
	verifyPasswordHash,
	createSession
} from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import { api } from '$lib/convex/_generated/api';
import { env } from '$env/dynamic/public';

const convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL);

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session) {
		return redirect(307, '/');
	}
};

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();

		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		if (!email) {
			return fail(400, {
				success: false,
				message: 'Invalid email',
				email: email
			} as const);
		}

		if (!password) {
			return fail(400, {
				success: false,
				message: 'Invalid password'
			} as const);
		}

		let userId;
		if (event.params.authtype === 'signup') {
			userId = await convex.mutation(api.user.createUser, { email, password });
		} else {
			try {
				const user = await convex.query(api.user.getUserByEmail, { email });

				if (!user) {
					return fail(400, {
						message: 'User not found',
						email
					});
				}

				const passwordHash = await convex.query(api.user.getUserPasswordHash, {
					userId: user._id
				});
				const validPassword = verifyPasswordHash(passwordHash, password);
				console.log(validPassword);

				if (!validPassword) {
					return fail(400, {
						message: 'INVALID PASSWORD',
						email
					});
				}
				userId = user._id;
			} catch {
				return fail(400, {
					message: 'User not found',
					email
				});
			}
		}

		const token = generateSessionToken();
		const session = await createSession(token, userId);

		const userWithSession = await convex.query(api.session.getSessionWithUser, {
			sessionId: session.sessionId
		});

		console.log(userWithSession);

		setSessionTokenCookie(event, token, userWithSession!.session.expiresAt);
		return redirect(303, '/');
	}
} satisfies Actions;
