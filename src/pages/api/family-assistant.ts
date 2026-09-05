import type { APIRoute } from "astro";
import handler from "../../../netlify/functions/family-assistant";
import { bridgeEnv } from "./_env";

// One door into the handler, open both under `astro dev` and in production.
// The handler itself stays under netlify/functions, where it is tested.
export const prerender = false;

export const POST: APIRoute = ({ request }) => {
  bridgeEnv();
  return handler(request);
};
