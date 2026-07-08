import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Plus, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCatalog, requestIntegration } from "@/lib/marketplace.functions";

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
  const call = useServerFn(listCatalog);
  const callRequest = useServerFn(requestIntegration);
  const q = useQuery({ queryKey: ["marketplace", "catalog"], queryFn: () => call() });
  const entry = q.data?.catalog.find((c) => c.id === providerId);
  const isRequested = !!q.data?.requested.includes(providerId);

  const reqMut = useMutation({
    mutationFn: () => callRequest({ data: { provider_id: providerId } }),
    onSuccess: () => {
      toast.success("Added to waitlist");
      router.invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!entry) throw notFound();

  const isLive = entry.status === "live";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/integrations">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </Button>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
            {entry.logo_slug ? (
              <img
                src={`https://cdn.simpleicons.org/${entry.logo_slug}`}
                alt=""
                className="h-8 w-8"
                loading="lazy"
              />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                {entry.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{entry.name}</h1>
              {isLive ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Live
                </Badge>
              ) : entry.status === "beta" ? (
                <Badge variant="outline">Beta</Badge>
              ) : (
                <Badge variant="outline">Coming soon</Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {entry.category.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{entry.tagline}</p>
          </div>
          <div className="shrink-0">
            {isLive ? (
              <ConnectAction entry={entry} />
            ) : isRequested ? (
              <Badge variant="secondary">On waitlist ✓</Badge>
            ) : (
              <Button onClick={() => reqMut.mutate()} disabled={reqMut.isPending}>
                {reqMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Request early access
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Zap} title="Auth method" body={authLabel(entry.auth_type)} />
        <InfoTile
          icon={Shield}
          title="Permissions"
          body={permissionsBlurb(entry.auth_type, entry.category)}
        />
      </div>

      {entry.docs_url && (
        <a
          href={entry.docs_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          Documentation <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function ConnectAction({ entry }: { entry: { id: string; auth_type: string } }) {
  // Route live providers to the correct connect flow.
  // OAuth-based providers currently supported end-to-end: google_workspace, gmail (via existing OAuth flow).
  // Webhook-based providers route to the webhooks tab.
  // Others show a helpful message.
  if (entry.auth_type === "webhook") {
    return (
      <Button asChild>
        <Link to="/app/integrations/webhooks">Configure webhook</Link>
      </Button>
    );
  }
  if (entry.id === "google_workspace" || entry.id === "gmail") {
    return (
      <Button asChild>
        <Link to="/app/integrations/webhooks">Connect (setup)</Link>
      </Button>
    );
  }
  if (entry.id === "instantly") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Managed by workspace
      </Badge>
    );
  }
  return (
    <Button asChild>
      <Link to="/app/integrations/webhooks">Connect</Link>
    </Button>
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

function authLabel(t: string): string {
  if (t === "oauth") return "1-click OAuth — no keys to copy";
  if (t === "api_key") return "API key from the provider";
  if (t === "webhook") return "Incoming webhook URL";
  return "Built-in";
}

function permissionsBlurb(auth: string, category: string): string {
  if (auth === "webhook") return "Outbound only — ByteBack posts alerts to a URL you control. No data is read from the provider.";
  if (category === "email") return "Read + send email as the connected mailbox. Metadata (sender, subject, threading) is stored to power the unified inbox.";
  if (category === "crm") return "Read/write contacts, companies, and deals so ByteBack can keep both systems in sync.";
  if (category === "calendar") return "Read availability and create events for meetings booked from ByteBack.";
  if (category === "storage") return "Read file metadata and download attachments referenced in replies.";
  if (category === "ai") return "Sends prompts + optional email context to the provider. Your key stays in ByteBack.";
  return "Standard read access scoped to your account.";
}
