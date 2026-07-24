// PayU server-to-server webhook. Configure this URL in the PayU dashboard
// under "Webhooks" so that payment status is reconciled even if the buyer
// closes their browser mid-redirect.
import { createFileRoute } from "@tanstack/react-router";
import { handlePayuCallback } from "@/lib/payu-return-handler.server";

export const Route = createFileRoute("/api/public/payu/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const result = await handlePayuCallback(request);
        if (result.status === "invalid") {
          return new Response("Invalid signature", { status: 400 });
        }
        return Response.json({ received: true, status: result.status });
      },
    },
  },
});
