import { createFileRoute, redirect } from "@tanstack/react-router";

// Land on the action-first Dashboard; Inbox is one click away.
export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/dashboard" });
  },
});
