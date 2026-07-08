import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Mail, Plug, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  disconnectGmail,
  listEmailAccounts,
  startGmailOAuth,
} from "@/lib/gmail.functions";
import { getInboundInfo } from "@/lib/email-sources.functions";

export const Route = createFileRoute("/_authenticated/app/email-sources")({
  component: EmailSourcesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load: {String(error)}</div>
  ),
});

function EmailSourcesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listEmailAccounts);
  const startFn = useServerFn(startGmailOAuth);
  const disconnectFn = useServerFn(disconnectGmail);
  const inboundFn = useServerFn(getInboundInfo);

  const accounts = useQuery({ queryKey: ["email-accounts"], queryFn: () => listFn() });
  const inbound = useQuery({ queryKey: ["inbound-info"], queryFn: () => inboundFn() });

  const url = useMemo(() => new URL(window.location.href), [router.state.location.href]);
  const connected = url.searchParams.get("connected");
  const errorParam = url.searchParams.get("error");

  const connect = useMutation({
    mutationFn: async () => startFn({ data: { origin: window.location.origin } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectFn({ data: { connectionId: id } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["email-accounts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const inboundUrl = inbound.data?.token
    ? `${window.location.origin}/api/public/inbound/email?token=${inbound.data.token}`
    : null;

  const copy = (v: string, label = "Copied") => {
    navigator.clipboard.writeText(v);
    toast.success(label);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Sources</h1>
        <p className="text-sm text-muted-foreground">
          Connect any mailbox. Gmail via one-click OAuth, or forward emails from ANY provider
          (Resend, SendGrid, Cloudflare, Mailgun, Zapier, or your own script) into your inbox.
        </p>
      </div>

      {connected && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-600">
          Connected <b>{connected}</b>. First sync runs within 5 minutes.
        </div>
      )}
      {errorParam && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errorParam.replace(/_/g, " ")}
        </div>
      )}

      {/* Gmail OAuth */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <div>
              <CardTitle>Gmail / Google Workspace</CardTitle>
              <CardDescription>
                One-click OAuth. We poll your INBOX every 5 minutes and feed replies into your
                pipeline. Read-only — we never send from your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            {connect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
            Connect Gmail
          </Button>

          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-medium">Connected accounts</div>
            {accounts.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {accounts.data && accounts.data.length === 0 && (
              <div className="text-sm text-muted-foreground">No accounts connected yet.</div>
            )}
            {accounts.data?.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.account_email}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.provider} • {a.status}
                    {a.last_error ? ` • ${a.last_error.slice(0, 80)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "active" ? "default" : "destructive"}>{a.status}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => disconnect.mutate(a.id)}
                    disabled={disconnect.isPending}
                    aria-label="Disconnect"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inbound webhook — the USP */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <div>
              <CardTitle>Inbound webhook (any provider)</CardTitle>
              <CardDescription>
                Point any email-inbound service to this URL. Every message arriving here is
                classified, added to Contacts / Pipeline, and embedded for AI search.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!inboundUrl && <div className="text-sm text-muted-foreground">Loading…</div>}
          {inboundUrl && (
            <>
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Your workspace webhook URL
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs">{inboundUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(inboundUrl, "URL copied")}>
                    <Copy className="mr-2 h-3 w-3" /> Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="mb-1 font-medium">Option 1 — Gmail auto-forward via Zapier / Make</div>
                  <div className="text-muted-foreground">
                    In Zapier, trigger on "New Email in Gmail" → action "Webhooks by Zapier — POST"
                    to the URL above, with body:
                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{`{
  "from": {{from__email}},
  "name": "{{from__name}}",
  "subject": "{{subject}}",
  "text": "{{body_plain}}",
  "message_id": "{{message_id}}",
  "received_at": "{{date}}"
}`}</pre>
                  </div>
                </div>

                <div>
                  <div className="mb-1 font-medium">Option 2 — Resend Inbound / SendGrid Parse</div>
                  <div className="text-muted-foreground">
                    Configure your domain's MX to Resend or SendGrid Inbound. Set the destination
                    URL to the webhook above. Payload is auto-detected.
                  </div>
                </div>

                <div>
                  <div className="mb-1 font-medium">Option 3 — Cloudflare Email Workers</div>
                  <div className="text-muted-foreground">
                    Route <code>*@yourdomain.com</code> to a Worker that <code>fetch()</code>es the
                    URL above with a JSON body.
                  </div>
                </div>

                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Keep this URL private — anyone with the token can inject emails into your
                  workspace. Rotate by regenerating it (coming soon).
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
