import { error, fail } from "@sveltejs/kit";
import { Result } from "typescript-result";
import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { PageServerLoad, Actions } from "./$types";
import {
  InvalidEmailError,
  InvitationAlreadySentError,
  NotAuthorizedError,
  BattleInactiveError,
  AlreadyInBattleError,
} from "$lib/errors";

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

/**
 * Sends an invitation to join a battle via email
 */
async function sendBattleInvitation(
  userId: Id<"user">,
  battleId: Id<"battles">,
  invitedEmail: string,
) {
  // Basic email validation
  if (!invitedEmail.includes("@")) {
    return Result.error(new InvalidEmailError());
  }

  const response = await convex.mutation(api.invitations.sendInvitation, {
    userId,
    battleId,
    invitedEmail,
  });

  if (!response.success) {
    // Map string error messages to specific error types
    const msg = response.message.toLowerCase();
    if (msg.includes("already sent") || msg.includes("already in")) {
      if (msg.includes("already in")) {
        return Result.error(new AlreadyInBattleError(response.message));
      }
      return Result.error(new InvitationAlreadySentError(response.message));
    }
    if (msg.includes("only") && msg.includes("creator")) {
      return Result.error(new NotAuthorizedError(response.message));
    }
    if (msg.includes("completed") || msg.includes("ended")) {
      return Result.error(new BattleInactiveError(response.message));
    }

    // Fallback to generic error
    return Result.error(new InvalidEmailError(response.message));
  }

  return Result.ok();
}

export const actions: Actions = {
  sendInvitation: async ({ locals, request, params }) => {
    if (!locals.session || !locals.user) {
      return fail(401, { message: "Not authenticated" });
    }

    const formData = await request.formData();
    const invitedEmail = formData.get("invitedEmail")?.toString().trim();
    const battleId = params.id as Id<"battles">;

    if (!invitedEmail) {
      return fail(400, { message: "Email is required" });
    }

    const result = await sendBattleInvitation(
      locals.user._id,
      battleId,
      invitedEmail,
    );

    if (!result.ok) {
      return result
        .match()
        .when(InvalidEmailError, (error) =>
          fail(400, { message: error.message }),
        )
        .when(InvitationAlreadySentError, (error) =>
          fail(400, { message: error.message }),
        )
        .when(NotAuthorizedError, (error) =>
          fail(403, { message: error.message }),
        )
        .when(BattleInactiveError, (error) =>
          fail(400, { message: error.message }),
        )
        .when(AlreadyInBattleError, (error) =>
          fail(400, { message: error.message }),
        )
        .run();
    }

    return { success: true, message: "Invitation sent successfully" };
  },
};
