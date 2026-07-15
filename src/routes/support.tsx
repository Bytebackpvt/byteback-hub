import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Bug,
  Calendar,
  CreditCard,
  HelpCircle,
  Inbox,
  KanbanSquare,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  Zap,
  Bell,
  ListChecks,
  Plug,
  KeyRound,
  Activity,
  ArrowRight,
} from "lucide-react";
import { BrandLink } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Center — ByteBack" },
      {
        name: "description",
        content:
          "Get help with ByteBack Inbox AI — Google Workspace, Microsoft 365, Gmail, CRM, AI, notifications, tasks, mobile, security, integrations, and OAuth.",
      },
      { property: "og:title", content: "Support Center — ByteBack" },
      {
        property: "og:description",
        content:
          "Knowledge base, quick actions, and status for the ByteBack Inbox AI platform.",
      },
    ],
  }),
  component: SupportPage,
});

const CATEGORIES = [
  { icon: KeyRound, title: "Account", desc: "Sign in, security, profile" },
  { icon: CreditCard, title: "Billing", desc: "Plans, invoices, refunds" },
  { icon: Mail, title: "Google Workspace", desc: "Connect Gmail & Workspace" },
  { icon: Mail, title: "Microsoft 365", desc: "Outlook & Exchange" },
  { icon: Inbox, title: "Gmail", desc: "Sync, labels, threads" },
  { icon: KanbanSquare, title: "CRM", desc: "Contacts, deals, pipeline" },
  { icon: Sparkles, title: "AI", desc: "Summaries, categorization" },
  { icon: Bell, title: "Notifications", desc: "Email, push, Slack" },
  { icon: ListChecks, title: "Tasks", desc: "Follow-ups & reminders" },
  { icon: Smartphone, title: "Mobile App", desc: "iOS & Android" },
  { icon: Shield, title: "Security", desc: "Encryption, RLS, DPA" },
  { icon: Plug, title: "Integrations", desc: "Webhooks, Sheets, HubSpot" },
  { icon: KeyRound, title: "OAuth", desc: "Scopes, tokens, revoke" },
];

const POPULAR = [
  { title: "Connect your Gmail account", href: "/google-oauth" as const },
  { title: "Disconnect Gmail from ByteBack", href: "/account-deletion" as const },
  { title: "Reconnect a Gmail account after re-auth", href: "/google-oauth" as const },
  { title: "Permission errors during OAuth", href: "/google-oauth" as const },
  { title: "Google OAuth verification info", href: "/google-oauth" as const },
  { title: "AI summary looks wrong — what to check", href: "/support" as const },
  { title: "Notification issues (email, push, Slack)", href: "/support" as const },
  { title: "Email sync issues and mailbox health", href: "/support" as const },
  { title: "Delete my account and data", href: "/account-deletion" as const },
];

const OAUTH_ARTICLES = [
  "Connect Gmail",
  "Disconnect Gmail",
  "Reconnect Gmail",
  "Permission Errors",
  "OAuth Verification",
  "AI Summary Issues",
  "Notification Issues",
  "Email Sync Issues",
  "Mailbox Health",
];

const FAQS = [
  {
    q: "How long does it take to hear back from support?",
    a: "We reply within a few hours on business days (Mon–Sat, 10:00–19:00 IST). Priority tickets on paid plans are answered within 4 business hours.",
  },
  {
    q: "How do I report a bug?",
    a: "Use the Report Bug quick action or email info@byteback.co.in with steps to reproduce, expected vs. actual behavior, screenshots, and your workspace name.",
  },
  {
    q: "Can I request a new feature?",
    a: "Yes — send feature requests to info@byteback.co.in or vote on our public roadmap. We ship the most-requested items first.",
  },
  {
    q: "Where can I check if there's an outage?",
    a: "See the System Status section below for API status, current incidents, and maintenance windows.",
  },
  {
    q: "Is there a community forum?",
    a: "Coming soon — a self-serve community forum for tips, templates, and integrations.",
  },
];

function SupportPage() {
  const [query, setQuery] = useState("");
  const filteredPopular = useMemo(() => {
    if (!query.trim()) return POPULAR;
    const q = query.toLowerCase();
    return POPULAR.filter((p) => p.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>

      <section className="border-b border-border/60 bg-gradient-to-b from-brand/5 to-transparent">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Badge variant="outline" className="rounded-full gap-1.5">
            <LifeBuoy className="h-3 w-3 text-brand" /> Support Center
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            How can we help you?
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Search articles, find answers, and reach our team. Enterprise support for the
            ByteBack Inbox AI platform.
          </p>
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-border/70 bg-card p-2 shadow-sm">
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">Popular articles</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPopular.map((p) => (
              <Link
                key={p.title}
                to={p.href}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-sm font-medium">{p.title}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-brand" />
              </Link>
            ))}
            {filteredPopular.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                No results. Try a different search or{" "}
                <a
                  href="mailto:info@byteback.co.in"
                  className="text-brand hover:underline"
                >
                  contact support
                </a>
                .
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Browse by category</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold">{c.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Quick actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              icon={MessageCircle}
              title="Contact Support"
              desc="Get a human response in a few hours."
              cta={
                <Button asChild size="sm" className="w-full">
                  <a href="mailto:info@byteback.co.in">Email support</a>
                </Button>
              }
            />
            <QuickAction
              icon={Calendar}
              title="Book a Demo"
              desc="30-min walkthrough with our team."
              cta={
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a href="mailto:info@byteback.co.in?subject=Book%20a%20demo">
                    Book demo
                  </a>
                </Button>
              }
            />
            <QuickAction
              icon={Bug}
              title="Report a Bug"
              desc="Send steps, screenshots, expected result."
              cta={
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a href="mailto:info@byteback.co.in?subject=Bug%20report">
                    Report bug
                  </a>
                </Button>
              }
            />
            <QuickAction
              icon={Zap}
              title="Feature Request"
              desc="Tell us what to build next."
              cta={
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a href="mailto:info@byteback.co.in?subject=Feature%20request">
                    Suggest a feature
                  </a>
                </Button>
              }
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Google OAuth help</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to connect, disconnect, and troubleshoot Google Workspace
            access.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {OAUTH_ARTICLES.map((a) => (
              <Link
                key={a}
                to="/google-oauth"
                className="rounded-lg border border-border/70 bg-card px-4 py-2.5 text-sm hover:bg-accent/40"
              >
                {a}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand" />
                <h3 className="text-base font-semibold">Knowledge Base</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                In-depth guides for every feature — inbox, CRM, AI, tasks, integrations.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4">
                <a href="mailto:info@byteback.co.in?subject=Knowledge%20base%20request">
                  Request an article
                </a>
              </Button>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-brand" />
                <h3 className="text-base font-semibold">Frequently asked questions</h3>
              </div>
              <ul className="mt-3 space-y-3">
                {FAQS.map((f) => (
                  <li key={f.q}>
                    <p className="text-sm font-medium">{f.q}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.a}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                <h2 className="text-base font-semibold">System status</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                All systems operational
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatusItem label="API" status="Operational" />
              <StatusItem label="Email Sync" status="Operational" />
              <StatusItem label="AI Gateway" status="Operational" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Current incidents</div>
                <div className="mt-1">None reported.</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Maintenance schedule</div>
                <div className="mt-1">No scheduled maintenance in the next 7 days.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ContactCard
            icon={Mail}
            title="Support email"
            body={
              <a
                href="mailto:info@byteback.co.in"
                className="text-brand hover:underline"
              >
                info@byteback.co.in
              </a>
            }
          />
          <ContactCard
            icon={Phone}
            title="Phone"
            body={
              <a href="tel:+919717513277" className="text-brand hover:underline">
                +91 97175 13277
              </a>
            }
          />
          <ContactCard
            icon={Users}
            title="Community forum"
            body={<span className="text-muted-foreground">Coming soon</span>}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoRow label="Response time" value="Within a few hours on business days" />
          <InfoRow label="Business hours" value="Mon–Sat · 10:00–19:00 IST" />
          <InfoRow
            label="Emergency contact"
            value={
              <a
                href="mailto:info@byteback.co.in"
                className="text-brand hover:underline"
              >
                info@byteback.co.in
              </a>
            }
          />
        </section>

        <div className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span className="mx-2">·</span>
          <Link to="/account-deletion" className="hover:text-foreground">Account Deletion</Link>
          <span className="mx-2">·</span>
          <Link to="/google-oauth" className="hover:text-foreground">Google OAuth</Link>
        </div>
      </main>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  desc,
  cta,
}: {
  icon: typeof MessageCircle;
  title: string;
  desc: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-3">{cta}</div>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        {status}
      </span>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Mail;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="mt-2 text-sm">{body}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-sm">{value}</div>
    </div>
  );
}
