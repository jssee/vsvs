import { redirect, fail, error } from "@sveltejs/kit";
import * as z from "zod";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { Result } from "typescript-result";

import { requireAuth } from "$lib/server/auth-helpers";
import { api } from "$lib/convex/_generated/api";
import type { Actions, PageServerLoad } from "./$types";
import type { Id } from "$lib/convex/_generated/dataModel";

const formSchema = z.object({
  vibe: z.string().min(1, "Vibe is required").max(100, "Vibe too long"),
  description: z.string().optional(),
  submissionLocal: z.string().min(1, "Submission deadline required"),
  votingLocal: z.string().min(1, "Voting deadline required"),
});

export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const { client, user } = await requireAuth(event);

  const battle = await client.query(api.battles.getBattle, {
    battleId: params.id as Id<"battles">,
    userId: user._id,
  });
  if (!battle) throw error(404, "Battle not found");

  return {
    battle,
    form: await superValidate(zod4(formSchema)),
  };
};

export const actions = {
  createSession: async (event) => {
    const { request, params } = event;
    const { client, user } = await requireAuth(event);

    const form = await superValidate(request, zod4(formSchema));
    if (!form.valid) return fail(400, { form });

    const submissionDeadline = new Date(form.data.submissionLocal).getTime();
    const votingDeadline = new Date(form.data.votingLocal).getTime();

    if (
      !Number.isFinite(submissionDeadline) ||
      !Number.isFinite(votingDeadline)
    ) {
      return fail(400, { message: "Invalid deadline format" });
    }
    if (votingDeadline <= submissionDeadline) {
      return fail(400, {
        message: "Voting deadline must be after submission deadline",
      });
    }

    const result = Result.try(
      async () =>
        await client.mutation(api.sessions.addSession, {
          userId: user._id,
          battleId: params.id as Id<"battles">,
          vibe: form.data.vibe,
          description: form.data.description,
          submissionDeadline,
          votingDeadline,
        }),
    );

    return result.fold(
      ({ sessionId }) =>
        redirect(302, `/battles/${params.id}/session/${sessionId}`),
      (err) => error(400, { message: err.message }),
    );
  },
} satisfies Actions;
