import { error } from "@sveltejs/kit";
import { PUBLIC_CONVEX_SITE_URL } from "$env/static/public";
import type { RequestHandler } from "./$types";

const handler: RequestHandler = async ({ request }) => {
  if (!PUBLIC_CONVEX_SITE_URL) {
    console.error("PUBLIC_CONVEX_SITE_URL environment variable is not set");
    throw error(500, "Convex site URL misconfiguration");
  }

  const requestUrl = new URL(request.url);
  const baseUrl = PUBLIC_CONVEX_SITE_URL.replace(/\/$/, "");
  const targetUrl = `${baseUrl}${requestUrl.pathname}${requestUrl.search}`;

  const proxiedRequest = new Request(targetUrl, request);
  proxiedRequest.headers.set("accept-encoding", "application/json");

  return fetch(proxiedRequest, { redirect: "manual" });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
