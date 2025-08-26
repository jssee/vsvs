import { fail, error } from "@sveltejs/kit";
import { getConvexClient } from "$lib/server/convex-client";
import { api } from "$lib/server/convex/_generated/api";
import type { Id } from "$lib/server/convex/_generated/dataModel";

export const load = async ({ params, locals }) => {
  const convex = getConvexClient();
  const battleId = params.id as Id<"battles">;
  const battle = await convex.query(api.battles.getBattle, {
    battleId,
    userId: locals.user?._id,
  });
  if (!battle) throw error(404, "Battle not found");
  const players = await convex.query(api.players.getBattlePlayers, { battleId });
  const sessions = await convex.query(api.sessions.getBattleSessions, { battleId });
  const currentSession = await convex.query(api.sessions.getCurrentSession, { battleId });
  return { battle, players, sessions, currentSession, user: locals.user };
};

export const actions = {
  invite: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const email = String(form.get("email") || "").trim();
    if (!email) return fail(400, { message: "Email is required" });
    const convex = getConvexClient();
    const result = await convex.mutation(api.invitations.sendInvitation, {
      userId: locals.user._id,
      battleId: params.id as Id<"battles">,
      invitedEmail: email,
    });
    if (!result.success) {
      return fail(400, { message: result.message });
    }
    return { success: true };
  },
  addSession: async ({ request, params, locals }) => {
    if (!locals.user) return fail(401, { message: "Not authenticated" });
    const form = await request.formData();
    const vibe = String(form.get("vibe") || "").trim();
    const description = String(form.get("description") || "").trim() || undefined;
    const submissionStr = String(form.get("submissionDeadline") || "").trim();
    const votingStr = String(form.get("votingDeadline") || "").trim();

    if (!vibe) return fail(400, { message: "Vibe is required" });
    if (!submissionStr || !votingStr) {
      return fail(400, { message: "Both deadlines are required" });
    }

    const submissionDeadline = Date.parse(submissionStr);
    const votingDeadline = Date.parse(votingStr);
    if (Number.isNaN(submissionDeadline) || Number.isNaN(votingDeadline)) {
      return fail(400, { message: "Invalid deadline format" });
    }
    if (votingDeadline <= submissionDeadline) {
      return fail(400, { message: "Voting deadline must be after submission deadline" });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.sessions.addSession, {
      userId: locals.user._id,
      battleId: params.id as Id<"battles">,
      vibe,
      description,
      submissionDeadline,
      votingDeadline,
    });

    if (!result.success) {
      return fail(400, { message: result.message });
    }

    return { success: true };
  },
};
