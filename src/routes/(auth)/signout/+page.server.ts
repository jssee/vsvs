import { redirect } from '@sveltejs/kit';

import { deleteSessionTokenCookie, invalidateSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	console.log(JSON.stringify(event.locals, null, 2));
	if (event.locals.session) {
		console.log('deleting session', event.locals.session);
		await invalidateSession(event.locals.session.sessionId);
		deleteSessionTokenCookie(event);
	}

	redirect(307, '/signin');
};
