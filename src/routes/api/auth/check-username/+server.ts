import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export const POST: RequestHandler = async ({ request }) => {
  let username: unknown;

  try {
    const body = await request.json();
    username = body?.username;
  } catch {
    return json(
      { message: "Invalid request payload" },
      {
        status: 400,
      },
    );
  }

  if (typeof username !== "string") {
    return json(
      { message: "Username is required" },
      {
        status: 400,
      },
    );
  }

  const trimmed = username.trim();

  if (!USERNAME_REGEX.test(trimmed)) {
    return json(
      {
        message:
          "Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.",
      },
      {
        status: 400,
      },
    );
  }

  const convex = getConvexClient();
  const existingUser = await convex.query(api.user.getUserByUsername, {
    username: trimmed,
  });

  if (existingUser) {
    return json(
      { message: "Username already taken" },
      {
        status: 409,
      },
    );
  }

  return json({ available: true });
};
