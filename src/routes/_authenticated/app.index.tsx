import { createFileRoute, redirect } from "@tanstack/react-router";

// Inbox-first product: the app root always lands on the unified inbox.
export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inbox" });
  },
});
