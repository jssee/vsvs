import { redirect, fail, error } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { getConvexClient } from "$lib/convex-client";
import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";

const convex = getConvexClient();

const formSchema = z.object({
  name: z.string("Must be between 3 and 20 characters").min(3).max(20),
  visibility: z.enum(["public", "private"]).default("private"),
  doubleSubmissions: z.boolean().default(false),
  maxPlayers: z.number().positive().default(4),
});

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
    form: await superValidate(zod4(formSchema)),
  };
};

export const actions = {
  createBattle: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(formSchema));

    if (!form.valid) return fail(400, { form });

    const { name, visibility, maxPlayers, doubleSubmissions } = form.data;

    const result = Result.try(
      async () =>
        await convex.mutation(api.battles.createBattle, {
          userId: locals.user!._id,
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
