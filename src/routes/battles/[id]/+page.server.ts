import { error, fail } from "@sveltejs/kit";
import { Result } from "typescript-result";
import { getAuth, requireAuth } from "$lib/server/auth-helpers";
import { api } from "$lib/convex/_generated/api";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { PageServerLoad, Actions } from "./$types";
import type { ConvexHttpClient } from "convex/browser";
import {
  InvalidEmailError,
  InvitationAlreadySentError,
  NotAuthorizedError,
  BattleInactiveError,
  AlreadyInBattleError,
} from "$lib/errors";

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const { client, user } = await getAuth(event);

  // Create an unauthenticated client if needed
  const convexClient =
    client || (await import("$lib/convex-client")).getConvexClient();

  const battleId = params.id as Id<"battle">;
  const battle = await convexClient.query(api.battle.getBattle, {
    battleId,
    userId: user?._id,
  });
  if (!battle) throw error(404, "Battle not found");

  const stages = await convexClient.query(api.stage.getBattleStages, {
    battleId,
  });

  return {
    battle,
    stages,
    user,
  };
};

/**
 * Sends an invitation to join a battle via email
 */
async function sendBattleInvitation(
  client: ConvexHttpClient,
  userId: Id<"profile">,
  battleId: Id<"battle">,
  invitedEmail: string,
) {
  // Basic email validation
  if (!invitedEmail.includes("@")) {
    return Result.error(new InvalidEmailError());
  }

  const response = await client.mutation(api.invitation.sendInvitation, {
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
  sendInvitation: async (event) => {
    const { request, params } = event;
    const { client, user } = await requireAuth(event);

    const formData = await request.formData();
    const invitedEmail = formData.get("invitedEmail")?.toString().trim();
    const battleId = params.id as Id<"battle">;

    if (!invitedEmail) {
      return fail(400, { message: "Email is required" });
    }

    const result = await sendBattleInvitation(
      client,
      user._id,
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
