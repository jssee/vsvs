import { redirect } from "@sveltejs/kit";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { PageServerLoad } from "./$types";

const convex = getConvexClient();

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) {
    redirect(302, "/signin");
  }

  const battles = await convex.query(api.battles.getMyBattles, {
    userId: locals.user._id,
  });

  return {
    battles,
    user: locals.user,
  };
};
