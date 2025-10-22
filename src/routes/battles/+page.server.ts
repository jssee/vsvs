import { redirect, fail } from "@sveltejs/kit";
import { Result } from "typescript-result";
import { api } from "$lib/convex/_generated/api";
import type { PageServerLoad, Actions } from "./$types";
import type { Id } from "$lib/convex/_generated/dataModel";
import {
  InviteCodeNotFoundError,
  BattleFullError,
  BattleInactiveError,
  AlreadyInBattleError,
} from "$lib/errors";
import { requireAuth } from "$lib/server/auth-helpers";

export const load: PageServerLoad = async (event) => {
  const { client, user } = await requireAuth(event);

  const battles = await client.query(api.battle.getMyBattles, {
    userId: user._id,
  });

  return {
    battles,
    user,
  };
};

/**
 * Joins a battle using an invite code
 */
async function joinBattleByInviteCode(
  client: any,
  inviteCode: string,
  userId: Id<"profile">,
) {
  const response = await client.mutation(api.player.joinBattleByCode, {
    inviteCode,
    userId,
  });

  if (!response.success) {
    // Map string error messages to specific error types
    if (response.message.toLowerCase().includes("invalid")) {
      return Result.error(new InviteCodeNotFoundError(response.message));
    }
    if (response.message.toLowerCase().includes("full")) {
      return Result.error(new BattleFullError(response.message));
    }
    if (response.message.toLowerCase().includes("ended")) {
      return Result.error(new BattleInactiveError(response.message));
    }
    if (response.message.toLowerCase().includes("already")) {
      return Result.error(new AlreadyInBattleError(response.message));
    }

    // Fallback to generic error
    return Result.error(new InviteCodeNotFoundError(response.message));
  }

  return Result.ok(response.battleId!);
}

export const actions: Actions = {
  joinByCode: async (event) => {
    const { client, user } = await requireAuth(event);

    const formData = await event.request.formData();
    const inviteCode = formData.get("inviteCode")?.toString().trim();

    if (!inviteCode) {
      return fail(400, { message: "Invite code is required" });
    }

    const result = await joinBattleByInviteCode(client, inviteCode, user._id);

    if (!result.ok) {
      return result
        .match()
        .when(InviteCodeNotFoundError, (error) =>
          fail(404, { message: error.message }),
        )
        .when(BattleFullError, (error) => fail(400, { message: error.message }))
        .when(BattleInactiveError, (error) =>
          fail(400, { message: error.message }),
        )
        .when(AlreadyInBattleError, (error) =>
          fail(400, { message: error.message }),
        )
        .run();
    }

    redirect(303, `/battles/${result.value}`);
  },
};
