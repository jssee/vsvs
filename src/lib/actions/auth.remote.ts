import { redirect } from "@sveltejs/kit";
import { z } from "zod";
import { Result } from "typescript-result";
import { createConvexHttpClient } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { api } from "$lib/convex/_generated/api";
import { form, getRequestEvent } from "$app/server";
import { getToken } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { createAuth } from "$lib/convex/auth";

const signUpSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
});

const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const signUp = form(signUpSchema, async (data, invalid) => {
  const event = getRequestEvent();

  const authResult = await Result.try(
    async () => {
      const response = await event.fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.username,
        }),
      });

      const result = await response.json();
      return { response, result };
    },
    (error) => error as Error,
  );

  if (!authResult.ok) {
    invalid(invalid.email("Failed to sign up. Please try again."));
    return;
  }

  const { response, result } = authResult.value;

  if (!response.ok || result.error) {
    const errorMessage = result.error?.message || "Failed to sign up";

    if (errorMessage.toLowerCase().includes("email")) {
      invalid(invalid.email(errorMessage));
    } else if (errorMessage.toLowerCase().includes("username")) {
      invalid(invalid.username(errorMessage));
    } else {
      invalid(invalid.email(errorMessage));
    }
    return;
  }

  const token = await getToken(createAuth as any, event.cookies);
  if (!token) {
    invalid(invalid.email("Authentication failed. Please try again."));
    return;
  }

  // Sync to Convex with the authenticated client
  const client = createConvexHttpClient({ token });
  const syncResult = await Result.try(
    async () => {
      return await client.mutation(api.auth.syncCurrentUser, {});
    },
    (error) => error as Error,
  );

  if (!syncResult.ok) {
    const errorMessage = syncResult.error.message;
    if (errorMessage.toLowerCase().includes("username")) {
      invalid(invalid.username(errorMessage));
    } else {
      invalid(
        invalid.email("Failed to complete registration. Please try again."),
      );
    }
    return;
  }

  redirect(302, "/battles");
});

export const signIn = form(signInSchema, async (data, invalid) => {
  const event = getRequestEvent();

  const authResult = await Result.try(
    async () => {
      const response = await event.fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();
      return { response, result };
    },
    (error) => error as Error,
  );

  if (!authResult.ok) {
    invalid(invalid.email("Failed to sign in. Please try again."));
    return;
  }

  const { response, result } = authResult.value;

  if (!response.ok || result.error) {
    const errorMessage = result.error?.message || "Failed to sign in";

    if (errorMessage.toLowerCase().includes("email")) {
      invalid(invalid.email(errorMessage));
    } else if (errorMessage.toLowerCase().includes("password")) {
      invalid(invalid.password(errorMessage));
    } else {
      invalid(invalid.email(errorMessage));
    }
    return;
  }

  redirect(302, "/battles");
});
