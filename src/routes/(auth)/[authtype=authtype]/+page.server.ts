import { fail, redirect } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate, setError } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
  verifyPasswordHash,
} from "$lib/server/auth";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { Actions, PageServerLoad } from "./$types";
import { EmailAlreadyInUseError, UsernameAlreadyTakenError } from "$lib/errors";

const convex = getConvexClient();

const formSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  username: z
    .string()
    .min(3, "Username must be between 3 and 30 characters")
    .max(30, "Username must be between 3 and 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .optional(),
});

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    return redirect(307, "/battles");
  }

  return {
    form: await superValidate(zod4(formSchema)),
  };
};

export const actions = {
  default: async (event) => {
    const form = await superValidate(event.request, zod4(formSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const { email, password, username } = form.data;

    const finalizeSession = async (userId: Id<"user">) => {
      const token = generateSessionToken();
      const created = await createSession(token, userId);

      return created.fold(
        (session) => {
          setSessionTokenCookie(event, token, session.expiresAt);
          redirect(303, "/battles");
        },
        (err) => {
          console.error("Failed to create session", err);
          return fail(400, { form });
        },
      );
    };

    if (event.params.authtype === "signup") {
      if (!username) {
        return fail(400, { form });
      }

      const createResult = Result.try(
        async () =>
          await convex.mutation(api.user.createUser, {
            email,
            password,
            username,
          }),
      );

      return createResult.fold(
        (userId) => finalizeSession(userId),
        (err) => {
          if (err instanceof EmailAlreadyInUseError) {
            setError(form, "email", "Email already in use");
          } else if (err instanceof UsernameAlreadyTakenError) {
            setError(form, "username", "Username already taken");
          } else {
            console.error("Signup error", err);
            return fail(400, { form });
          }
        },
      );
    } else {
      const userResult = await Result.try(
        async () =>
          await convex.query(api.user.getUserWithPasswordByEmail, { email }),
      );

      return userResult.fold(
        (user) => {
          if (!user) {
            setError(form, "email", "user not found");
            return fail(400, { form });
          }

          const validpassword = verifyPasswordHash(user.password, password);
          if (!validpassword) {
            setError(form, "password", "invalid password");
            return fail(400, { form });
          }

          return finalizeSession(user._id);
        },
        (err) => {
          console.error("Signin error", err);
          return fail(400, { form });
        },
      );
    }
  },
} satisfies Actions;
