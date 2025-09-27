import { error } from "@sveltejs/kit";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { PageServerLoad } from "./$types";

const convex = getConvexClient();

export const load: PageServerLoad = async ({ params, locals }) => {
  const battleId = params.id as Id<"battles">;
  const battle = await convex.query(api.battles.getBattle, {
    battleId,
    userId: locals.user?._id,
  });
  if (!battle) throw error(404, "Battle not found");

  const sessions = await convex.query(api.sessions.getBattleSessions, {
    battleId,
  });

  return {
    battle,
    sessions,
    user: locals.user,
  };
};
