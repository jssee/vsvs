import { fail, redirect } from "@sveltejs/kit";

import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) {
    redirect(302, "/signin");
  }

  const convex = getConvexClient();
  const battles = await convex.query(api.battles.getMyBattles, {
    userId: locals.user._id,
  });

  return { battles, user: locals.user };
};

export const actions = {
  createBattle: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const visibility = (
      String(form.get("visibility") || "private") === "public"
        ? "public"
        : "private"
    ) as "public" | "private";
    const maxPlayers = Number(form.get("maxPlayers") || 4);
    const doubleSubmissions = form.get("doubleSubmissions") === "on";

    if (!name) return fail(400, { message: "Name is required" });

    const convex = getConvexClient();
    try {
      const { battleId } = await convex.mutation(api.battles.createBattle, {
        userId: locals.user._id,
        name,
        visibility,
        maxPlayers,
        doubleSubmissions,
      });
      throw redirect(303, `/battles/${battleId}`);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to create battle";
      return fail(400, { message });
    }
  },

  joinByCode: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const inviteCode = String(form.get("inviteCode") || "")
      .toUpperCase()
      .trim();
    if (!inviteCode) return fail(400, { message: "Invite code is required" });
    const convex = getConvexClient();
    const result = await convex.mutation(api.players.joinBattleByCode, {
      userId: locals.user._id,
      inviteCode,
    });
    if (result.success && result.battleId) {
      throw redirect(303, `/battles/${result.battleId}`);
    }
    return fail(400, { message: result.message });
  },
} satisfies Actions;
