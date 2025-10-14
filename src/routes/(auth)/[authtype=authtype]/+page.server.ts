import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  // Redirect to battles if already authenticated
  if (locals.token) {
    return redirect(307, "/battles");
  }

  return {
    authType: params.authtype,
  };
};
