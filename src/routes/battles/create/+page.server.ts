import { redirect, fail, error } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";
import { requireAuth } from "$lib/server/auth-helpers";

const formSchema = z.object({
  name: z.string("Must be between 3 and 20 characters").min(3).max(20),
  visibility: z.enum(["public", "private"]).default("private"),
  doubleSubmissions: z.boolean().default(false),
  maxPlayers: z.number().positive().default(4),
});

export const load: PageServerLoad = async (event) => {
  const { user } = await requireAuth(event);

  return {
    user,
    form: await superValidate(zod4(formSchema)),
  };
};

export const actions = {
  createBattle: async (event) => {
    const { client, user } = await requireAuth(event);
    const form = await superValidate(event.request, zod4(formSchema));

    if (!form.valid) return fail(400, { form });

    const { name, visibility, maxPlayers, doubleSubmissions } = form.data;

    const result = Result.try(
      async () =>
        await client.mutation(api.battle.createBattle, {
          userId: user._id,
          name,
          visibility,
          maxPlayers,
          doubleSubmissions,
        }),
    );

    return result.fold(
      ({ battleId }) => redirect(302, `/battles/${battleId}`),
      (err) => error(400, { message: err.message }),
    );
  },
} satisfies Actions;
