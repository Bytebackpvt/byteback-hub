import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Server,
  Database,
  Sparkles,
  Mail,
  Users,
  ListChecks,
  BarChart3,
  Search,
  Bell,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  FileText,
  LifeBuoy,
  Trash2,
  UserCircle,
  Globe,
  Cpu,
  BookOpen,
  Video,
  ClipboardList,
  Building2,
  Scale,
} from "lucide-react";
import { BrandLink } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Google API Verification Center — ByteBack Inbox AI" },
      {
        name: "description",
        content:
          "Verification center for Google OAuth reviewers evaluating ByteBack Inbox AI. Application overview, requested scopes, data flow, security, Limited Use compliance, demo, and reviewer test guide.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "Google API Verification Center — ByteBack Inbox AI",
      },
      {
        property: "og:description",
        content:
          "Everything a Google reviewer needs to evaluate ByteBack Inbox AI for OAuth verification.",
      },
    ],
  }),
  component: VerificationCenter,
});

const CONTACT_EMAIL = "info@byteback.co.in";

const NAV = [
  { id: "overview", label: "1. Application Overview" },
  { id: "oauth-flow", label: "2. Google OAuth Flow" },
  { id: "scopes", label: "3. Requested OAuth Scopes" },
  { id: "why-scopes", label: "4. Why Each Scope Is Required" },
  { id: "data-flow", label: "5. Data Flow Diagram" },
  { id: "security", label: "6. Security" },
  { id: "workspace-data", label: "7. Google Workspace Data Usage" },
  { id: "ai", label: "8. AI Processing" },
  { id: "limited-use", label: "9. Google Limited Use" },
  { id: "demo", label: "10. Demo Video" },
  { id: "credentials", label: "11. Reviewer Test Credentials" },
  { id: "test-guide", label: "12. Reviewer Test Guide" },
  { id: "documents", label: "13. Supporting Documents" },
  { id: "subprocessors", label: "14. Subprocessors" },
  { id: "compliance", label: "15. Compliance" },
  { id: "contact", label: "16. Contact" },
  { id: "reviewer-notes", label: "17. Reviewer Notes" },
];

const CAPABILITIES = [
  { icon: Mail, label: "Unified Inbox" },
  { icon: Sparkles, label: "AI Email Summaries" },
  { icon: ListChecks, label: "Conversation Classification" },
  { icon: Users, label: "CRM Timeline" },
  { icon: ClipboardList, label: "Task Management" },
  { icon: Bell, label: "Notifications" },
  { icon: UserCircle, label: "Team Collaboration" },
  { icon: Search, label: "Email Search" },
  { icon: BarChart3, label: "Analytics" },
  { icon: CheckCircle2, label: "Follow-up Management" },
];

const OAUTH_FLOW = [
  "Homepage",
  "User clicks Connect Google",
  "Google OAuth Screen",
  "User reviews permissions",
  "User grants access",
  "ByteBack encrypts refresh token",
  "Mailbox sync starts",
  "Unified Inbox populated",
  "AI Summary generated",
  "CRM Timeline & Notifications",
];

const DATA_FLOW = [
  { icon: Mail, label: "Google Gmail" },
  { icon: ShieldCheck, label: "OAuth 2.0" },
  { icon: KeyRound, label: "Encrypted Token Vault" },
  { icon: Server, label: "ByteBack Backend" },
  { icon: Cpu, label: "AI Processing" },
  { icon: Mail, label: "Unified Inbox" },
  { icon: Users, label: "CRM" },
  { icon: Bell, label: "Notifications" },
  { icon: BarChart3, label: "Dashboard" },
];

const SCOPES = [
  {
    scope: "gmail.readonly",
    full: "https://www.googleapis.com/auth/gmail.readonly",
    purpose: "Read messages, threads, and labels from the connected mailbox.",
    feature: "Unified Inbox, AI summaries, conversation classification, CRM timeline, email search.",
    why: "Displaying the mailbox, generating AI summaries, and building the CRM timeline requires reading message headers, bodies, and thread metadata. No narrower scope exposes this data.",
    sensitivity: "Restricted",
  },
  {
    scope: "gmail.compose",
    full: "https://www.googleapis.com/auth/gmail.compose",
    purpose: "Create and save draft replies inside the user's Gmail account.",
    feature: "AI-assisted reply drafts, follow-up drafts saved to Gmail's Drafts folder.",
    why: "Users expect drafts to appear inside their Gmail Drafts. Only compose can create native drafts.",
    sensitivity: "Restricted",
  },
  {
    scope: "gmail.send",
    full: "https://www.googleapis.com/auth/gmail.send",
    purpose: "Send messages on the user's behalf when they click Send.",
    feature: "Reply and Send inside ByteBack, follow-up sending after user confirmation.",
    why: "Sending a reply from the Unified Inbox requires send. ByteBack never sends without an explicit user action.",
    sensitivity: "Restricted",
  },
  {
    scope: "gmail.modify",
    full: "https://www.googleapis.com/auth/gmail.modify",
    purpose: "Mark messages read/unread, add or remove labels, archive threads.",
    feature: "Two-way sync of read/unread state, labels, archive from ByteBack back to Gmail.",
    why: "Without modify, actions taken in the Unified Inbox would not reflect in Gmail — users expect a single, consistent state across both.",
    sensitivity: "Restricted",
  },
  {
    scope: "openid",
    full: "openid",
    purpose: "OpenID Connect authentication token.",
    feature: "Identify the connecting user during OAuth.",
    why: "Standard OIDC identifier for the sign-in flow.",
    sensitivity: "Non-sensitive",
  },
  {
    scope: "userinfo.email",
    full: "https://www.googleapis.com/auth/userinfo.email",
    purpose: "Read the connecting user's Google account email address.",
    feature: "Show which mailbox is connected; prevent duplicate connections.",
    why: "Required to identify which Gmail account is linked to the ByteBack workspace member.",
    sensitivity: "Non-sensitive",
  },
  {
    scope: "userinfo.profile",
    full: "https://www.googleapis.com/auth/userinfo.profile",
    purpose: "Read the connecting user's basic profile (name, avatar).",
    feature: "Display the connected account's name and avatar in the ByteBack UI.",
    why: "Provides recognizable connection details to the user; avoids ambiguity when multiple accounts are connected.",
    sensitivity: "Non-sensitive",
  },
];

const SECURITY = [
  { icon: Lock, label: "TLS 1.2+ Encryption", desc: "All traffic to and from ByteBack uses TLS in transit." },
  { icon: KeyRound, label: "AES-256 Encryption", desc: "Sensitive data at rest is encrypted with AES-256." },
  { icon: ShieldCheck, label: "OAuth Token Encryption", desc: "Google refresh and access tokens are encrypted at rest in a dedicated vault." },
  { icon: Users, label: "Role-Based Access", desc: "Workspace roles gate access to mailboxes, CRM data, and settings." },
  { icon: Building2, label: "Workspace Isolation", desc: "Row-level security enforces per-workspace tenant isolation on every query." },
  { icon: CheckCircle2, label: "Least Privilege", desc: "Only the OAuth scopes required for user-facing features are requested." },
  { icon: ClipboardList, label: "Audit Logs", desc: "Security-relevant events are logged for review." },
  { icon: Server, label: "Secure Cloud Infrastructure", desc: "Hosted on managed cloud infrastructure with hardened defaults." },
  { icon: Trash2, label: "Automatic Token Revocation", desc: "Disconnecting a mailbox revokes tokens with Google and purges them from ByteBack." },
];

const AI_USES = [
  "AI Summaries of long threads",
  "Conversation understanding & intent",
  "Lead categorization",
  "Reply suggestions",
  "Follow-up recommendations",
  "Task generation from emails",
  "CRM timeline enrichment",
];

const TEST_GUIDE = [
  "Sign in to ByteBack using the reviewer test credentials.",
  "Open the onboarding flow and click Connect Gmail.",
  "Approve the OAuth consent screen on the Google account.",
  "Wait for the Unified Inbox to load synced messages.",
  "Observe emails syncing from the connected Gmail mailbox.",
  "Open a thread and click Generate AI Summary.",
  "Reply to a message from within ByteBack.",
  "Send the reply and confirm it appears in Gmail's Sent folder.",
  "Mark a message read/unread and confirm the state syncs to Gmail.",
  "Disconnect the Google account from Settings → Integrations.",
  "Delete the reviewer account from Settings → Account.",
];

const SUBPROCESSORS = [
  { name: "OpenAI / Google Gemini", purpose: "AI inference for summaries, classification, and reply drafts (zero-retention where available)." },
  { name: "Google", purpose: "OAuth authentication and Gmail API access." },
  { name: "Supabase", purpose: "Managed Postgres database, authentication, and object storage." },
  { name: "Cloud Provider", purpose: "Application hosting and edge compute." },
  { name: "Email Provider", purpose: "Transactional notifications and system emails to ByteBack users." },
];

const COMPLIANCE = [
  "Google API Services User Data Policy",
  "Google Workspace Limited Use requirements",
  "GDPR — data subject rights & deletion",
  "CCPA — consumer rights & disclosures",
  "SOC-ready operational controls",
  "Enterprise security posture",
];

const DOCUMENTS = [
  { title: "Privacy Policy", desc: "How ByteBack collects, uses, retains, and deletes data.", to: "/privacy", icon: FileText },
  { title: "Terms of Service", desc: "Legal terms governing use of the ByteBack service.", to: "/terms", icon: Scale },
  { title: "Support Center", desc: "Help articles, contact channels, and system status.", to: "/support", icon: LifeBuoy },
  { title: "Account Deletion", desc: "How users disconnect Google and delete data.", to: "/account-deletion", icon: Trash2 },
  { title: "Google OAuth Summary", desc: "Public OAuth summary page.", to: "/google-oauth", icon: Globe },
];

function SectionHeader({ id, kicker, title, description }: { id: string; kicker: string; title: string; description?: string }) {
  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</div>
      <h2 id={id} className="mt-2 scroll-mt-24 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function VerificationCenter() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLink />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              For Google Reviewers
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${CONTACT_EMAIL}?subject=Google%20OAuth%20Verification`}>
                <Mail className="mr-2 h-4 w-4" />
                Contact verification team
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 50%), radial-gradient(500px circle at 80% 20%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Google API Verification
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Google API Verification Center
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            This page provides Google reviewers with everything required to evaluate ByteBack Inbox AI
            for Google OAuth verification — application overview, requested scopes, data flow, security
            posture, privacy practices, Limited Use compliance, and step-by-step testing instructions.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#test-guide">
                Reviewer Test Guide
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="#scopes">View requested scopes</a>
            </Button>
            <Button asChild variant="ghost">
              <a href="#demo">
                <Video className="mr-2 h-4 w-4" />
                Demo video
              </a>
            </Button>
          </div>

          <dl className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Application", v: "ByteBack Inbox AI" },
              { k: "Category", v: "Enterprise Unified Inbox & CRM" },
              { k: "Data policy", v: "Google Limited Use compliant" },
              { k: "Verification contact", v: CONTACT_EMAIL },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border/60 bg-card/60 p-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.k}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:self-start lg:overflow-auto">
          <nav aria-label="Sections" className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              On this page
            </div>
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 space-y-24">
          {/* 1. Overview */}
          <section>
            <SectionHeader
              id="overview"
              kicker="Section 1"
              title="Application Overview"
              description="ByteBack Inbox AI is an enterprise AI-powered Unified Inbox and customer communication platform. Organizations connect Gmail, Google Workspace, Outlook, Microsoft 365, and other supported email providers into one intelligent inbox for their teams."
            />
            <GlassCard>
              <p className="text-sm leading-relaxed text-muted-foreground">
                ByteBack is <span className="font-medium text-foreground">not</span> an email marketing
                platform, cold-email tool, or email warming service. Emails are accessed only after
                explicit end-user authorization via Google's OAuth consent screen, and only to power
                user-facing features inside the ByteBack workspace the user belongs to.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITIES.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          {/* 2. OAuth Flow */}
          <section>
            <SectionHeader
              id="oauth-flow"
              kicker="Section 2"
              title="Google OAuth Flow"
              description="End-to-end authentication flow from the ByteBack homepage to a fully synced Unified Inbox."
            />
            <GlassCard>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {OAUTH_FLOW.map((step, i) => (
                  <li
                    key={step}
                    className="group flex items-start gap-3 rounded-lg border border-border/60 bg-background p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{step}</div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </li>
                ))}
              </ol>
            </GlassCard>
          </section>

          {/* 3. Scopes table */}
          <section>
            <SectionHeader
              id="scopes"
              kicker="Section 3"
              title="Requested OAuth Scopes"
              description="ByteBack requests only the scopes required to deliver its user-facing features."
            />
            <GlassCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Scope</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                      <th className="px-4 py-3 font-semibold">User-facing feature</th>
                      <th className="px-4 py-3 font-semibold">Sensitivity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {SCOPES.map((s) => (
                      <tr key={s.scope} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-mono text-xs font-semibold text-foreground">{s.scope}</div>
                          <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                            {s.full}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{s.purpose}</td>
                        <td className="px-4 py-4 text-muted-foreground">{s.feature}</td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={s.sensitivity === "Restricted" ? "default" : "secondary"}
                            className="whitespace-nowrap"
                          >
                            {s.sensitivity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>

          {/* 4. Why each scope */}
          <section>
            <SectionHeader
              id="why-scopes"
              kicker="Section 4"
              title="Why Each Scope Is Required"
              description="Narrower permissions cannot power the following user-facing features. Each justification maps directly to functionality reviewers can observe in the demo."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {SCOPES.map((s) => (
                <GlassCard key={s.scope}>
                  <div className="mb-2 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm font-semibold text-foreground">{s.scope}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.why}</p>
                </GlassCard>
              ))}
            </div>
          </section>

          {/* 5. Data flow */}
          <section>
            <SectionHeader
              id="data-flow"
              kicker="Section 5"
              title="Data Flow Diagram"
              description="How Google Workspace data flows through ByteBack, from Gmail to the user's dashboard."
            />
            <GlassCard>
              <ol className="flex flex-wrap items-center gap-3">
                {DATA_FLOW.map(({ icon: Icon, label }, i) => (
                  <li key={label} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </div>
                    {i < DATA_FLOW.length - 1 ? (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-muted-foreground">
                OAuth refresh tokens are stored encrypted in a dedicated vault. AI inference runs on
                subprocessors under zero-retention agreements where available. No Google Workspace data
                is used for advertising or to train generalized AI models.
              </p>
            </GlassCard>
          </section>

          {/* 6. Security */}
          <section>
            <SectionHeader
              id="security"
              kicker="Section 6"
              title="Security"
              description="Controls in place to protect Google Workspace data and other customer data."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY.map(({ icon: Icon, label, desc }) => (
                <GlassCard key={label}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </GlassCard>
              ))}
            </div>
          </section>

          {/* 7. Workspace data usage */}
          <section>
            <SectionHeader
              id="workspace-data"
              kicker="Section 7"
              title="Google Workspace Data Usage"
              description="What Google Workspace data ByteBack accesses, why, which features use it, and how long it is retained."
            />
            <GlassCard>
              <dl className="grid gap-6 md:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold text-foreground">Data accessed</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Message headers and bodies, thread and label metadata, read/unread state, and the
                    connecting user's basic profile (email, name, avatar).
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-foreground">Why accessed</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    To populate the Unified Inbox, generate AI summaries, classify conversations, build
                    the CRM timeline, enable search, and let users reply/send from ByteBack.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-foreground">Retention</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Synced email data is retained only while the mailbox is connected. Disconnecting a
                    mailbox purges its synced data within 30 days.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-foreground">Deletion</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Users can disconnect Google, delete synced emails, or delete their account at any
                    time. Account deletion purges all associated workspace data.
                  </dd>
                </div>
              </dl>
              <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                Google Workspace data is <span className="font-semibold">never sold</span>, never used
                for advertising, and never used to train generalized AI models.
              </div>
            </GlassCard>
          </section>

          {/* 8. AI */}
          <section>
            <SectionHeader
              id="ai"
              kicker="Section 8"
              title="AI Processing"
              description="Google Workspace data is processed by AI only to provide user-facing features requested by the user."
            />
            <GlassCard>
              <ul className="grid gap-2 sm:grid-cols-2">
                {AI_USES.map((u) => (
                  <li key={u} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                Inference runs through third-party LLM providers under zero-retention agreements where
                available. Outputs are surfaced only inside the user's workspace and never used to train
                generalized AI models.
              </p>
            </GlassCard>
          </section>

          {/* 9. Limited Use */}
          <section>
            <SectionHeader id="limited-use" kicker="Section 9" title="Google Limited Use" />
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
                <p className="text-base font-medium leading-relaxed text-foreground">
                  The use of information received from Google Workspace APIs adheres to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>
              </div>
            </div>
          </section>

          {/* 10. Demo */}
          <section>
            <SectionHeader
              id="demo"
              kicker="Section 10"
              title="Demo Video"
              description="An unlisted YouTube walkthrough of the full OAuth flow and every requested scope in use."
            />
            <GlassCard>
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-center">
                <div className="p-6">
                  <Video className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Unlisted demo video link will be provided during verification.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reviewers, request the link at{" "}
                    <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-sm font-semibold text-foreground">What to observe</div>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {[
                    "Google Login",
                    "Permission Screen",
                    "Inbox Sync",
                    "AI Summary",
                    "Compose Email",
                    "Reply Email",
                    "Send Email",
                    "Modify Email (read / label)",
                    "Disconnect Google",
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </section>

          {/* 11. Credentials */}
          <section>
            <SectionHeader
              id="credentials"
              kicker="Section 11"
              title="Reviewer Test Credentials"
              description="Dedicated credentials are provisioned for Google's review team on request."
            />
            <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Lock className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Test credentials for the reviewer account, a pre-provisioned Google mailbox, and the
                    ByteBack workspace name are shared privately with the Google review team via the
                    verification contact below. Please request them by replying to the verification
                    thread or emailing us directly.
                  </p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { k: "Email", v: "Provided on request" },
                      { k: "Password", v: "Provided on request" },
                      { k: "Workspace Name", v: "Provided on request" },
                    ].map((c) => (
                      <div key={c.k} className="rounded-lg border border-border/60 bg-background p-3">
                        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {c.k}
                        </dt>
                        <dd className="mt-1 font-mono text-sm text-foreground">{c.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={`mailto:${CONTACT_EMAIL}?subject=Google%20OAuth%20verification%20-%20reviewer%20credentials`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Request reviewer credentials
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 12. Test guide */}
          <section>
            <SectionHeader
              id="test-guide"
              kicker="Section 12"
              title="Reviewer Test Guide"
              description="Step-by-step actions that exercise every requested scope."
            />
            <GlassCard>
              <ol className="space-y-3">
                {TEST_GUIDE.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </section>

          {/* 13. Documents */}
          <section>
            <SectionHeader
              id="documents"
              kicker="Section 13"
              title="Supporting Documents"
              description="Public policies and reviewer resources."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DOCUMENTS.map(({ title, desc, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      {title}
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 14. Subprocessors */}
          <section>
            <SectionHeader
              id="subprocessors"
              kicker="Section 14"
              title="Subprocessors"
              description="Third parties involved in delivering ByteBack Inbox AI."
            />
            <GlassCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {SUBPROCESSORS.map((s) => (
                      <tr key={s.name}>
                        <td className="px-4 py-4 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-4 text-muted-foreground">{s.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>

          {/* 15. Compliance */}
          <section>
            <SectionHeader
              id="compliance"
              kicker="Section 15"
              title="Compliance"
              description="Frameworks and policies ByteBack aligns with."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COMPLIANCE.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm"
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{c}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 16. Contact */}
          <section>
            <SectionHeader
              id="contact"
              kicker="Section 16"
              title="Contact"
              description="Reviewer, technical, privacy, and support contact routes."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Verification", desc: "Google OAuth reviewer contact" },
                { label: "Technical", desc: "API and integration questions" },
                { label: "Privacy", desc: "Data, retention, and deletion" },
                { label: "Support", desc: "General product support" },
              ].map((c) => (
                <a
                  key={c.label}
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                    `ByteBack ${c.label}`,
                  )}`}
                  className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    {CONTACT_EMAIL}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </a>
              ))}
            </div>
          </section>

          {/* 17. Reviewer Notes */}
          <section>
            <SectionHeader id="reviewer-notes" kicker="Section 17" title="Reviewer Notes" />
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card/60 to-card/60 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Thank you for reviewing ByteBack Inbox AI.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    We designed this verification center to answer every question a Google reviewer
                    might have without a follow-up round-trip. If anything is missing — additional
                    documentation, a deeper technical walkthrough, extended demo footage, or a live
                    call — please tell us and we will provide it immediately.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild>
                      <a href={`mailto:${CONTACT_EMAIL}?subject=Google%20OAuth%20verification%20-%20follow%20up`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Contact verification team
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="#test-guide">Back to test guide</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="border-t border-border/60 pt-8 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>© ByteBack Inbox AI — Google API Verification Center</span>
              <span>
                Contact:{" "}
                <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
