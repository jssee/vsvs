import { redirect, fail } from "@sveltejs/kit";
import { Result } from "typescript-result";
import { requireAuth } from "$lib/server/auth-helpers";
import { api } from "$lib/convex/_generated/api";
import type { PageServerLoad, Actions } from "./$types";
import type { Id } from "$lib/convex/_generated/dataModel";
import type { ConvexHttpClient } from "convex/browser";
import {
  InvitationNotFoundError,
  NotAuthorizedError,
  BattleInactiveError,
  BattleFullError,
} from "$lib/errors";

export const load: PageServerLoad = async (event) => {
  const { client, user } = await requireAuth(event);

  const invitations = await client.query(api.invitation.getMyInvitations, {
    userId: user._id,
  });

  // Fetch battle names for each invitation
  const invitationsWithBattles = await Promise.all(
    invitations.map(async (inv) => {
      const battle = await client.query(api.battle.getBattle, {
        battleId: inv.battleId,
        userId: user._id,
      });
      return {
        ...inv,
        battleName: battle?.name || "Unknown Battle",
      };
    }),
  );

  return {
    invitations: invitationsWithBattles,
    user,
  };
};

/**
 * Responds to an invitation (accept or decline)
 */
async function respondToInvitation(
  client: ConvexHttpClient,
  userId: Id<"profile">,
  invitationId: Id<"invitation">,
  response: "accepted" | "declined",
) {
  const apiResponse = await client.mutation(
    api.invitation.respondToInvitation,
    {
      userId,
      invitationId,
      response,
    },
  );

  if (!apiResponse.success) {
    // Map string error messages to specific error types
    const msg = apiResponse.message.toLowerCase();
    if (msg.includes("not found")) {
      return Result.error(new InvitationNotFoundError(apiResponse.message));
    }
    if (msg.includes("not authorized") || msg.includes("authorized")) {
      return Result.error(new NotAuthorizedError(apiResponse.message));
    }
    if (msg.includes("ended") || msg.includes("completed")) {
      return Result.error(new BattleInactiveError(apiResponse.message));
    }
    if (msg.includes("full")) {
      return Result.error(new BattleFullError(apiResponse.message));
    }

    // Fallback to generic error
    return Result.error(new InvitationNotFoundError(apiResponse.message));
  }

  return Result.ok({
    battleId: apiResponse.battleId,
    message: apiResponse.message,
  });
}

export const actions: Actions = {
  respond: async (event) => {
    const { request } = event;
    const { client, user } = await requireAuth(event);

    const formData = await request.formData();
    const invitationId = formData.get("invitationId")?.toString();
    const response = formData.get("response")?.toString();

    if (
      !invitationId ||
      !response ||
      (response !== "accepted" && response !== "declined")
    ) {
      return fail(400, { message: "Invalid request" });
    }

    const result = await respondToInvitation(
      client,
      user._id,
      invitationId as Id<"invitation">,
      response as "accepted" | "declined",
    );

    if (!result.ok) {
      return result
        .match()
        .when(InvitationNotFoundError, (error) =>
          fail(404, { message: error.message }),
        )
        .when(NotAuthorizedError, (error) =>
          fail(403, { message: error.message }),
        )
        .when(BattleInactiveError, (error) =>
          fail(400, { message: error.message }),
        )
        .when(BattleFullError, (error) => fail(400, { message: error.message }))
        .run();
    }

    if (response === "accepted" && result.value.battleId) {
      redirect(303, `/battles/${result.value.battleId}`);
    }

    return { success: true, message: result.value.message };
  },
};
