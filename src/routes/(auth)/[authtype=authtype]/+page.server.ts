import { fail, redirect, error } from "@sveltejs/kit";
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

const convex = getConvexClient();

const formSchema = z.object({
  email: z.string().email("Enter a valid email address"),
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
    return redirect(307, "/");
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
          redirect(303, "/");
        },
        (err) => {
          console.error("Failed to create session", err);
          error(500, { message: "Failed to create session" });
        },
      );
    };

    if (event.params.authtype === "signup") {
      if (!username) {
        return setError(form, "username", "Username is required");
      }

      const existingResult = await Result.try(async () =>
        convex.query(api.user.getUserByUsername, { username }),
      );

      return existingResult.fold(
        async (existing) => {
          if (existing) {
            return setError(form, "username", "Username already taken");
          }

          const createResult = await Result.try(async () =>
            convex.mutation(api.user.createUser, {
              email,
              password,
              username,
            }),
          );

          return createResult.fold(
            (userId) => finalizeSession(userId),
            (err) => {
              console.error("Failed to create user", err);
              error(500, { message: "Failed to create user" });
            },
          );
        },
        (err) => {
          console.error("Failed to verify username uniqueness", err);
          error(500, { message: "Failed to create user" });
        },
      );
    }

    const userResult = await Result.try(async () =>
      convex.query(api.user.getUserWithPasswordByEmail, { email }),
    );

    return userResult.fold(
      (user) => {
        if (!user) {
          return setError(form, "email", "User not found");
        }

        const validPassword = verifyPasswordHash(user.password, password);

        if (!validPassword) {
          return setError(form, "password", "Invalid password");
        }

        return finalizeSession(user._id);
      },
      (err) => {
        console.error("Failed to fetch user", err);
        error(500, { message: "Failed to sign in" });
      },
    );
  },
} satisfies Actions;
