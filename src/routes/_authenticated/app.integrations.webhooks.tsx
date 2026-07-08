import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, MessageSquare, Plug, Send, Trash2, Webhook, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listIntegrations,
  saveWebhookIntegration,
  deleteIntegration,
  testIntegration,
  type IntegrationProvider,
  type IntegrationRow,
} from "@/lib/integrations.functions";
import { saveSheetsIntegration, testSheetsIntegration } from "@/lib/sheets.functions";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — ByteBack" }, { name: "robots", content: "noindex" }] }),
  component: IntegrationsPage,
});

type Catalog = {
  provider: IntegrationProvider | "google_sheets";
  name: string;
  blurb: string;
  icon: typeof Webhook;
  status: "available" | "coming-soon";
  kind: "webhook" | "oauth" | "sheets";
  help?: string;
};

const CATALOG: Catalog[] = [
  {
    provider: "slack_webhook",
    name: "Slack",
    blurb: "Post hot-lead alerts and follow-up reminders into a Slack channel.",
    icon: Webhook,
    status: "available",
    kind: "webhook",
    help: "Create an Incoming Webhook at api.slack.com/apps → Incoming Webhooks → Add New Webhook to Workspace, then paste the URL.",
  },
  {
    provider: "teams_webhook",
    name: "Microsoft Teams",
    blurb: "Deliver ByteBack alerts to a Teams channel via Incoming Webhook.",
    icon: MessageSquare,
    status: "available",
    kind: "webhook",
    help: "In Teams, open a channel → Connectors → Incoming Webhook → Configure. Paste the generated URL here.",
  },
  {
    provider: "discord_webhook",
    name: "Discord",
    blurb: "Send hot-lead notifications straight into a Discord channel.",
    icon: MessageSquare,
    status: "available",
    kind: "webhook",
    help: "In Discord, open Channel Settings → Integrations → Webhooks → New Webhook, then copy the webhook URL.",
  },
  {
    provider: "zapier_webhook",
    name: "Zapier / Make",
    blurb: "Forward every lead alert to a Zap or Make scenario for custom automations.",
    icon: Zap,
    status: "available",
    kind: "webhook",
    help: "In Zapier, create a Zap with 'Webhooks by Zapier → Catch Hook', copy the custom URL, and paste it here.",
  },
  {
    provider: "generic_webhook",
    name: "Custom webhook",
    blurb: "POST every ByteBack event as JSON to any HTTPS endpoint you control.",
    icon: Webhook,
    status: "available",
    kind: "webhook",
    help: "Any HTTPS endpoint that accepts a JSON POST body works — great for internal tools or bespoke automations.",
  },
  {
    provider: "google_sheets",
    name: "Google Sheets",
    blurb: "Auto-append every hot / lost lead as a row in a Google Sheet. No CRM subscription needed.",
    icon: FileSpreadsheet,
    status: "available",
    kind: "sheets",
    help: "Create a Google Sheet, add a tab named 'Leads' (or your choice), then paste the sheet URL below. We'll append a row for every hot or lost lead.",
  },
  {
    provider: "gmail",
    name: "Gmail",
    blurb: "Sync your Gmail inbox and reply to leads directly from ByteBack.",
    icon: Plug,
    status: "coming-soon",
    kind: "oauth",
  },
  {
    provider: "outlook",
    name: "Outlook / Microsoft 365",
    blurb: "Two-way sync with Outlook and Microsoft 365 mailboxes.",
    icon: Plug,
    status: "coming-soon",
    kind: "oauth",
  },
  {
    provider: "hubspot",
    name: "HubSpot",
    blurb: "Push new leads and status changes into HubSpot CRM.",
    icon: Plug,
    status: "coming-soon",
    kind: "oauth",
  },
];

function IntegrationsPage() {
  const call = useServerFn(listIntegrations);
  const q = useQuery({ queryKey: ["integrations"], queryFn: () => call(), staleTime: 30_000 });
  const rows = q.data?.integrations ?? [];
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect ByteBack to the tools your team already uses. Webhook-based integrations work
          today; OAuth providers are rolling out shortly.
        </p>
      </header>

      <section aria-labelledby="integrations-list-heading">
        <h2 id="integrations-list-heading" className="sr-only">Available integrations</h2>
        <ul className="grid gap-3">
          {CATALOG.map((c) => (
            <li key={c.provider}>
              <IntegrationCard catalog={c} current={byProvider.get(c.provider as IntegrationProvider)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function IntegrationCard({
  catalog,
  current,
}: {
  catalog: Catalog;
  current: IntegrationRow | undefined;
}) {
  const qc = useQueryClient();
  const Icon = catalog.icon;
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const callSave = useServerFn(saveWebhookIntegration);
  const callDelete = useServerFn(deleteIntegration);
  const callTest = useServerFn(testIntegration);
  const callSaveSheets = useServerFn(saveSheetsIntegration);
  const callTestSheets = useServerFn(testSheetsIntegration);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["integrations"] });

  const saveMut = useMutation({
    mutationFn: () =>
      catalog.kind === "sheets"
        ? callSaveSheets({
            data: { spreadsheet_url_or_id: url, sheet_name: label || undefined },
          })
        : callSave({
            data: {
              provider: catalog.provider as
                | "slack_webhook"
                | "teams_webhook"
                | "discord_webhook"
                | "generic_webhook"
                | "zapier_webhook",
              webhook_url: url,
              label: label || undefined,
            },
          }),
    onSuccess: () => {
      toast.success(`${catalog.name} connected`);
      setOpen(false);
      setUrl("");
      setLabel("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: () => callDelete({ data: { id: current!.id } }),
    onSuccess: () => {
      toast.success(`${catalog.name} disconnected`);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const testMut = useMutation({
    mutationFn: () =>
      catalog.kind === "sheets" ? callTestSheets({}) : callTest({ data: { id: current!.id } }),
    onSuccess: () => toast.success(`Test sent to ${catalog.name}`),
    onError: (e) => toast.error((e as Error).message),
  });

  const connected = !!current;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{catalog.name}</h3>
            {connected ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Connected
              </Badge>
            ) : catalog.status === "coming-soon" ? (
              <Badge variant="outline">Coming soon</Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{catalog.blurb}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {connected && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testMut.mutate()}
                disabled={testMut.isPending}
                aria-label={`Send test to ${catalog.name}`}
              >
                {testMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                aria-label={`Disconnect ${catalog.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {!connected && catalog.status === "available" && (
            <Button size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Cancel" : "Connect"}
            </Button>
          )}
        </div>
      </div>

      {open && (catalog.kind === "webhook" || catalog.kind === "sheets") && (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-border/70 bg-muted/30 p-3">
          {catalog.help && <p className="text-xs text-muted-foreground">{catalog.help}</p>}
          <div className="space-y-1.5">
            <Label htmlFor={`url-${catalog.provider}`} className="text-xs">
              {catalog.kind === "sheets" ? "Google Sheet URL" : "Webhook URL"}
            </Label>
            <Input
              id={`url-${catalog.provider}`}
              placeholder={
                catalog.kind === "sheets"
                  ? "https://docs.google.com/spreadsheets/d/…"
                  : "https://hooks.slack.com/services/…"
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`label-${catalog.provider}`} className="text-xs">
              {catalog.kind === "sheets" ? "Tab name (default: Leads)" : "Label (optional)"}
            </Label>
            <Input
              id={`label-${catalog.provider}`}
              placeholder={catalog.kind === "sheets" ? "Leads" : "#sales-alerts"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => saveMut.mutate()}
              disabled={!url || saveMut.isPending}
            >
              {saveMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save connection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
