import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAuth } from "$lib/server/auth-helpers";

export const POST: RequestHandler = async (event) => {
  try {
    const { user } = await requireAuth(event);
    return json({ user });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to sync user";

    if (message.includes("Username already taken")) {
      return json(
        { message: "Username already taken" },
        {
          status: 409,
        },
      );
    }

    return json(
      { message: "Failed to sync user" },
      {
        status: 500,
      },
    );
  }
};
