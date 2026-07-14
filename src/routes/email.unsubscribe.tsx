import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

const SearchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/email/unsubscribe")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "Unsubscribe — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "ready"; email: string; alreadyUnsubscribed: boolean }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = useSearch({ from: "/email/unsubscribe" });
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    fetch(`/api/public/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) return setState({ kind: "invalid" });
        setState({
          kind: "ready",
          email: j.email as string,
          alreadyUnsubscribed: Boolean(j.alreadyUnsubscribed),
        });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  async function confirm() {
    if (!token || state.kind !== "ready") return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/public/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setState({ kind: "error", message: j.error ?? "Unsubscribe failed" });
        return;
      }
      setState({ kind: "done", email: j.email as string });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Checking your link…</p>
          </div>
        )}
        {state.kind === "invalid" && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Invalid or expired link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This unsubscribe link is not valid. If you keep receiving email you
              didn't ask for, contact <a href="mailto:hello@byteback.digital" className="underline">hello@byteback.digital</a>.
            </p>
          </>
        )}
        {state.kind === "ready" && !state.alreadyUnsubscribed && (
          <>
            <MailX className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Unsubscribe from ByteBack</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Stop sending marketing and digest emails to <b className="text-foreground">{state.email}</b>?
              You'll still receive account-critical emails (invites, security).
            </p>
            <Button className="mt-6 w-full" onClick={confirm} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, unsubscribe me
            </Button>
          </>
        )}
        {state.kind === "ready" && state.alreadyUnsubscribed && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold">You're already unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.email} is not receiving digest emails from ByteBack.
            </p>
          </>
        )}
        {state.kind === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold">Unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.email} won't receive digest or marketing email from us anymore.
            </p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
