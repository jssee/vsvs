import { fail, redirect } from "@sveltejs/kit";

import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
  verifyPasswordHash,
} from "$lib/server/auth";
import { getConvexClient } from "$lib/server/convex-client";
import { api } from "$lib/server/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.session) {
    return redirect(307, "/");
  }
};

export const actions = {
  default: async (event) => {
    const convex = getConvexClient();
    const formData = await event.request.formData();

    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email) {
      return fail(400, {
        success: false,
        message: "Invalid email",
        email: email,
      } as const);
    }

    if (!password) {
      return fail(400, {
        success: false,
        message: "Invalid password",
      } as const);
    }

    let userId;
    if (event.params.authtype === "signup") {
      userId = await convex.mutation(api.user.createUser, { email, password });
    } else {
      try {
        const user = await convex.query(api.user.getUserWithPasswordByEmail, {
          email,
        });

        if (!user) {
          return fail(400, {
            message: "User not found",
            email,
          });
        }

        const validPassword = verifyPasswordHash(user.password, password);

        if (!validPassword) {
          return fail(400, {
            message: "Invalid password",
            email,
          });
        }
        userId = user._id;
      } catch {
        return fail(400, {
          message: "User not found",
          email,
        });
      }
    }

    const token = generateSessionToken();
    const session = await createSession(token, userId);

    setSessionTokenCookie(event, token, session.expiresAt);
    return redirect(303, "/");
  },
} satisfies Actions;
