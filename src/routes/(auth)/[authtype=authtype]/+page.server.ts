import { fail, redirect } from "@sveltejs/kit";
import * as z from "zod";

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

const emailSchema = z.email();
const passwordSchema = z.string().min(8);

export const actions = {
  default: async (event) => {
    const convex = getConvexClient();
    const formData = await event.request.formData();

    const email = emailSchema.safeParse(formData.get("email"));
    const password = passwordSchema.safeParse(formData.get("password"));

    if (!email.success) {
      return fail(400, {
        success: false,
        message: "Invalid email",
        email: email,
      } as const);
    }

    if (!password.success) {
      return fail(400, {
        success: false,
        message: "Invalid password",
      } as const);
    }

    let userId;
    if (event.params.authtype === "signup") {
      userId = await convex.mutation(api.user.createUser, {
        email: email.data,
        password: password.data,
      });
    } else {
      try {
        const user = await convex.query(api.user.getUserWithPasswordByEmail, {
          email: email.data,
        });

        if (!user) {
          return fail(400, {
            message: "User not found",
            email,
          });
        }

        const validPassword = verifyPasswordHash(user.password, password.data);

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
