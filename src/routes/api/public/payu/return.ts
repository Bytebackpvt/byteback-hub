// PayU redirects the buyer's browser here after checkout (SURL & FURL).
// We verify the response hash, update the subscription, then 302-redirect
// the browser to a friendly page.
import { createFileRoute } from "@tanstack/react-router";
import { handlePayuCallback } from "@/lib/payu-return-handler.server";

async function handle(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const result = await handlePayuCallback(request);
  const target = new URL("/checkout/return", origin);
  target.searchParams.set("status", result.status);
  if (result.txnid) target.searchParams.set("txnid", result.txnid);
  if (result.planKey) target.searchParams.set("plan", result.planKey);
  if (result.message) target.searchParams.set("message", result.message.slice(0, 200));
  return Response.redirect(target.toString(), 303);
}

export const Route = createFileRoute("/api/public/payu/return")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
