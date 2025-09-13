import { fail, redirect } from "@sveltejs/kit";
import * as z from "zod";

import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
  verifyPasswordHash,
} from "$lib/server/auth";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.session) {
    return redirect(307, "/");
  }
};

const emailSchema = z.email();
const passwordSchema = z.string().min(8);
const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/);

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
      const username = usernameSchema.safeParse(formData.get("username"));
      if (!username.success) {
        return fail(400, {
          success: false,
          message: "Invalid username",
          email: email.data,
          username: String(formData.get("username") ?? ""),
        } as const);
      }

      // Enforce unique username
      const existing = await convex.query(api.user.getUserByUsername, {
        username: username.data,
      });
      if (existing) {
        return fail(400, {
          success: false,
          message: "Username already taken",
          email: email.data,
          username: username.data,
        } as const);
      }

      userId = await convex.mutation(api.user.createUser, {
        email: email.data,
        password: password.data,
        username: username.data,
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
    const created = await createSession(token, userId);
    if (!created.ok) {
      return fail(500, { message: "Failed to create session" });
    }
    const session = created.value;

    setSessionTokenCookie(event, token, session.expiresAt);
    return redirect(303, "/");
  },
} satisfies Actions;
