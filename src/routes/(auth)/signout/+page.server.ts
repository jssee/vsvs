import { redirect } from "@sveltejs/kit";

import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  if (event.locals.session) {
    await invalidateSession(event.locals.session.sessionId);
    deleteSessionTokenCookie(event);
  }

  redirect(307, "/signin");
};
