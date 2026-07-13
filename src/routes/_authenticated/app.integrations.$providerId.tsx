import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProvider } from "@/lib/integrations/registry";
import {
  listAllIntegrations,
  connectIntegration,
  disconnectIntegration,
  testIntegrationUniversal,
} from "@/lib/integrations/universal.functions";

export const Route = createFileRoute("/_authenticated/app/integrations/$providerId")({
  head: ({ params }) => ({
    meta: [{ title: `${params.providerId} — Integrations — ByteBack` }, { name: "robots", content: "noindex" }],
  }),
  component: ProviderDetail,
  notFoundComponent: () => (
    <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
      <h2 className="font-medium">Integration not found</h2>
      <Button asChild variant="link" className="mt-2">
        <Link to="/app/integrations">Back to marketplace</Link>
      </Button>
    </div>
  ),
});

function ProviderDetail() {
  const { providerId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const provider = getProvider(providerId);

  const callList = useServerFn(listAllIntegrations);
  const callConnect = useServerFn(connectIntegration);
  const callTest = useServerFn(testIntegrationUniversal);
  const callDisconnect = useServerFn(disconnectIntegration);

  const listQ = useQuery({
    queryKey: ["integrations", "all"],
    queryFn: () => callList(),
    staleTime: 15_000,
  });
  const row = useMemo(
    () => listQ.data?.rows.find((r) => r.provider_id === providerId),
    [listQ.data, providerId],
  );
  const connected = !!row && row.status !== "not_connected";

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(row?.config_public ?? {})) {
      if (typeof v === "string") init[k] = v;
    }
    return init;
  });

  const connectMut = useMutation({
    mutationFn: () => callConnect({ data: { provider: providerId, fields } }),
    onSuccess: (res) => {
      if ((res as { warning?: string }).warning) {
        toast.warning("Connected, but test failed", {
          description: (res as { warning?: string }).warning,
        });
      } else {
        toast.success(`${provider?.name ?? providerId} connected`);
      }
      qc.invalidateQueries({ queryKey: ["integrations"] });
      router.invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const testMut = useMutation({
    mutationFn: () => callTest({ data: { provider: providerId } }),
    onSuccess: () => {
      toast.success("Connection is healthy");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const disconnectMut = useMutation({
    mutationFn: () => callDisconnect({ data: { provider: providerId } }),
    onSuccess: () => {
      toast.success("Disconnected");
      setFields({});
      qc.invalidateQueries({ queryKey: ["integrations"] });
      router.invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!provider) throw notFound();

  if (listQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const isLive = provider.status === "live" || provider.status === "beta";
  const inboundUrl =
    provider.auth_kind === "webhook_in" && typeof window !== "undefined"
      ? `${window.location.origin}/api/public/inbound/email`
      : "";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/integrations">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
            {provider.logo_slug ? (
              <img src={`https://cdn.simpleicons.org/${provider.logo_slug}`} alt="" className="h-8 w-8" loading="lazy" />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                {provider.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{provider.name}</h1>
              {connected && row!.health === "healthy" && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Connected
                </Badge>
              )}
              {connected && (row!.health === "error" || row!.health === "degraded") && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Needs attention
                </Badge>
              )}
              {provider.status === "beta" && <Badge variant="outline">Beta</Badge>}
              {provider.status === "coming_soon" && <Badge variant="outline">Coming soon</Badge>}
              <Badge variant="outline" className="capitalize">
                {provider.category.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{provider.tagline}</p>
            {connected && row?.last_error_msg && (
              <p className="mt-2 text-xs text-red-500">{row.last_error_msg}</p>
            )}
          </div>
        </div>
      </div>

      {!isLive ? (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {provider.name} is on our roadmap. We'll email you when it goes live.
        </div>
      ) : provider.auth_kind === "oauth" ? (
        <OAuthPanel provider={provider} />
      ) : provider.auth_kind === "webhook_in" ? (
        <InboundPanel url={inboundUrl} />
      ) : (
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
          {provider.connect_hint && (
            <p className="text-sm text-muted-foreground">{provider.connect_hint}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connectMut.mutate();
            }}
            className="space-y-4"
          >
            {provider.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id={f.key}
                  type={f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "password" ? "password" : "text"}
                  placeholder={f.placeholder ?? ""}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  required={f.required}
                  autoComplete="off"
                />
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={connectMut.isPending}>
                {connectMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {connected ? "Save changes" : "Connect"}
              </Button>
              {connected && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testMut.mutate()}
                    disabled={testMut.isPending}
                  >
                    {testMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Disconnect ${provider.name}?`)) disconnectMut.mutate();
                    }}
                    disabled={disconnectMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Disconnect
                  </Button>
                </>
              )}
              {provider.docs_url && (
                <a
                  href={provider.docs_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  Docs <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          icon={Zap}
          title="Auth method"
          body={
            provider.auth_kind === "oauth"
              ? "1-click OAuth — no keys to copy."
              : provider.auth_kind === "api_key"
                ? "API key from the provider."
                : provider.auth_kind === "webhook_in"
                  ? "Inbound webhook URL you paste into the provider."
                  : "Outbound webhook — ByteBack POSTs to a URL you control."
          }
        />
        <InfoTile
          icon={Shield}
          title="What we do with your data"
          body={permissionsBlurb(provider.category)}
        />
      </div>
    </div>
  );
}

function OAuthPanel({ provider }: { provider: ReturnType<typeof getProvider> & object }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6">
      <p className="text-sm text-muted-foreground">
        {provider.name} uses OAuth. Head to the {provider.id === "gmail" ? "Email Sources" : "connect"} page to start the sign-in flow.
      </p>
      <div className="mt-4">
        <Button asChild>
          <Link to={provider.oauth_route ?? "/app/email-sources"}>Continue</Link>
        </Button>
      </div>
    </div>
  );
}

function InboundPanel({ url }: { url: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Configure your provider (SendGrid, Mailgun, Postmark, etc.) to POST inbound mail to:
      </p>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast.success("Copied");
          }}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, title, body }: { icon: typeof Zap; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="mt-1.5 text-sm">{body}</p>
    </div>
  );
}

function permissionsBlurb(category: string): string {
  if (category === "email") return "Read + label mail. We store metadata (sender, subject, thread) to power the unified inbox.";
  if (category === "cold_email") return "Read replies + campaign metadata from your outbound tool.";
  if (category === "crm") return "Read/write contacts, companies, and deals so both systems stay in sync.";
  if (category === "chat" || category === "automation") return "Outbound only — we POST alerts to your URL. No data is read from your workspace.";
  if (category === "calendar") return "Read availability and create meeting events.";
  if (category === "storage") return "Read file metadata and download attachments referenced in replies.";
  if (category === "sheets") return "Append rows to a spreadsheet you own.";
  return "Standard read access scoped to your account.";
}
