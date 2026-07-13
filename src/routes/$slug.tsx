import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type MarketingPage = {
  title: string;
  description: string;
  eyebrow: string;
  bullets: string[];
  cta?: string;
};

const PAGES: Record<string, MarketingPage> = {
  features: {
    eyebrow: "Product",
    title: "Features built for outbound reply teams",
    description:
      "ByteBack brings every reply, lead signal, follow-up, notification, and account connection into one focused workspace.",
    bullets: [
      "Unified inbox across all connected mailboxes and domains",
      "AI reply classification for demos, pricing, pickups, objections, and follow-ups",
      "Priority scoring so hot buyers surface before routine replies",
      "Tasks, reminders, CRM pipeline, team assignment, and search in one place",
    ],
    cta: "Start free",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Simple pricing that scales with your team",
    description:
      "Start free, connect your core inboxes, and upgrade when your reply volume and team workflow grow.",
    bullets: [
      "Free plan for solo operators and early testing",
      "Growth and Business plans for teams managing larger outbound volume",
      "No per-mailbox surprise fees on supported plans",
      "Enterprise options for security, scale, and custom rollout needs",
    ],
    cta: "Create workspace",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Answers before you connect your inbox",
    description:
      "Here are the practical details teams ask before bringing their outreach replies into ByteBack.",
    bullets: [
      "ByteBack reads replies from mailboxes you authorize and keeps access scoped to the product workflow",
      "You can disconnect one email account or all connected accounts from Account & Data settings",
      "You can permanently delete your ByteBack account and associated data from Account & Data settings",
      "Google user data use is described in the Privacy Policy with Limited Use disclosure",
    ],
    cta: "Review privacy",
  },
  blog: {
    eyebrow: "Resources",
    title: "ByteBack blog",
    description:
      "Playbooks for reply management, outbound operations, AI triage, and revenue team workflows.",
    bullets: [
      "How to stop hot leads from getting buried in shared inboxes",
      "What to track when outbound replies land across many domains",
      "How AI classification changes daily sales operations",
      "Best practices for OAuth disconnect and data deletion flows",
    ],
  },
  integrations: {
    eyebrow: "Product",
    title: "Integrations for the tools you already use",
    description:
      "Connect email accounts and route signals to the channels and workflows your team already checks.",
    bullets: [
      "Google Workspace and Gmail account connections",
      "Webhook-ready integrations for operations workflows",
      "Marketplace flow for CRM, chat, calendar, storage, and automation tools",
      "Per-account disconnect controls for cleaner access management",
    ],
    cta: "Sign in to connect",
  },
  changelog: {
    eyebrow: "Product",
    title: "Changelog",
    description: "Recent product updates for ByteBack users and evaluators.",
    bullets: [
      "Account & Data settings with per-email disconnect controls",
      "Google Limited Use disclosure added to Privacy Policy",
      "Account deletion flow with permanent data deletion confirmation",
      "Integration marketplace foundation for connected workflows",
    ],
  },
  roadmap: {
    eyebrow: "Product",
    title: "Roadmap",
    description: "What the ByteBack team is prioritizing next for outbound reply operations.",
    bullets: [
      "More native integrations across CRM and team chat tools",
      "Advanced analytics for reply quality and conversion signals",
      "Expanded AI assistant workflows for follow-up and daily planning",
      "More admin controls for growing teams",
    ],
  },
  about: {
    eyebrow: "Company",
    title: "About ByteBack",
    description:
      "ByteBack is built for teams that cannot afford to miss a buyer because the reply landed in the wrong inbox.",
    bullets: [
      "Designed around real outbound reply workflows",
      "Focused on clarity, speed, and practical sales operations",
      "Built with privacy, access control, and disconnect flows in mind",
      "Created for teams managing multiple domains, accounts, and campaigns",
    ],
  },
  customers: {
    eyebrow: "Company",
    title: "Customers",
    description:
      "ByteBack helps outbound teams, agencies, IT service companies, and founders manage scattered replies with less chaos.",
    bullets: [
      "Cold email and lead generation agencies",
      "SaaS, IT services, MSP, ITAD, and e-waste teams",
      "Founders handling sales across multiple inboxes",
      "Sales teams coordinating replies, follow-ups, and handoffs",
    ],
  },
  careers: {
    eyebrow: "Company",
    title: "Careers",
    description:
      "We are building a focused product for revenue teams who live in replies, follow-ups, and fast decisions.",
    bullets: [
      "Product-minded engineering and design culture",
      "Strong bias toward useful workflows over bloated dashboards",
      "Privacy-conscious product development",
      "Customer-led roadmap and practical shipping cadence",
    ],
  },
  press: {
    eyebrow: "Company",
    title: "Press",
    description: "A concise overview of ByteBack for media, partners, and analysts.",
    bullets: [
      "ByteBack is an AI-powered unified inbox for outbound reply teams",
      "The product helps teams classify replies, prioritize buyers, and manage follow-ups",
      "Core users include agencies, founders, sales teams, and IT-focused businesses",
      "For press inquiries, contact info@byteback.co.in or info@byteback.co.in",
    ],
  },
  contact: {
    eyebrow: "Company",
    title: "Contact ByteBack",
    description: "Reach the ByteBack team for product, privacy, legal, or account-data questions.",
    bullets: [
      "Privacy and deletion requests: info@byteback.co.in",
      "Legal questions: info@byteback.co.in",
      "Product access: create a workspace from the sign-in page",
      "Connected account management: Account & Data settings inside the app",
    ],
    cta: "Create workspace",
  },
  docs: {
    eyebrow: "Resources",
    title: "Docs",
    description: "Operational guidance for setting up ByteBack and managing connected account access.",
    bullets: [
      "Create your workspace and invite teammates",
      "Connect Google/Gmail accounts from Email Sources",
      "Use Account & Data settings to disconnect one email, disconnect all, or delete your account",
      "Review Privacy Policy and Terms before granting OAuth access",
    ],
  },
  guides: {
    eyebrow: "Resources",
    title: "Guides",
    description: "Practical guides for outbound teams moving from scattered inboxes to one reply command center.",
    bullets: [
      "Set up reply triage for multiple sending domains",
      "Build a daily hot-lead review workflow",
      "Use AI classification without losing human control",
      "Audit and revoke connected accounts when teammates change roles",
    ],
  },
  status: {
    eyebrow: "Resources",
    title: "Status",
    description: "Current product status information for ByteBack users.",
    bullets: [
      "App routes and public legal pages are available",
      "Account settings include disconnect and delete controls",
      "Connected account authorization depends on provider availability",
      "For urgent access questions, contact info@byteback.co.in",
    ],
  },
  community: {
    eyebrow: "Resources",
    title: "Community",
    description: "A place for outbound operators to share reply workflows, triage ideas, and team practices.",
    bullets: [
      "Share inbox workflows that reduce missed opportunities",
      "Discuss AI classification and follow-up habits",
      "Exchange integration and operations patterns",
      "Help shape ByteBack's roadmap through real use cases",
    ],
  },
  security: {
    eyebrow: "Legal",
    title: "Security",
    description:
      "ByteBack is designed around scoped access, account disconnect controls, and careful handling of authorized inbox data.",
    bullets: [
      "OAuth tokens are stored for connected account syncing and revoked during disconnect flows where supported",
      "Users can disconnect one email account or all connected accounts",
      "Users can request or perform account deletion from Account & Data settings",
      "We do not sell Google user data and describe use in our Privacy Policy",
    ],
  },
  dpa: {
    eyebrow: "Legal",
    title: "Data Processing Addendum",
    description:
      "This page summarizes how ByteBack approaches data processing commitments for customer account data.",
    bullets: [
      "Customer data is processed to provide the ByteBack service",
      "Connected account data is used for reply syncing, classification, prioritization, and user-requested workflows",
      "Deletion and disconnect controls are available from Account & Data settings",
      "For DPA requests, contact info@byteback.co.in",
    ],
  },
  cookies: {
    eyebrow: "Legal",
    title: "Cookie Policy",
    description: "ByteBack uses essential cookies and local storage to keep the app secure and usable.",
    bullets: [
      "Authentication state keeps users signed in securely",
      "Preference storage can remember interface settings such as theme",
      "Essential cookies support routing, session, and product functionality",
      "Contact info@byteback.co.in for privacy-related questions",
    ],
  },
};

export const Route = createFileRoute("/$slug")({
  loader: ({ params }) => {
    if (!PAGES[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    const page = loaderData ? PAGES[loaderData.slug] : undefined;
    const title = page ? `${page.title} — ByteBack` : "Page unavailable — ByteBack";
    const description = page?.description ?? "ByteBack page unavailable.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: MarketingSlugPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">This page did not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{String(error)}</p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you tried to open is not available.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  ),
});

function MarketingSlugPage() {
  const { slug } = Route.useLoaderData();
  const page = PAGES[slug];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLink />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border/60 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <p className="mt-10 text-xs font-medium uppercase tracking-[0.2em] text-brand">
              {page.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {page.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth">
                  {page.cta ?? "Start free"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto grid max-w-4xl gap-4 px-4 sm:px-6">
            {page.bullets.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-border/70 bg-card p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}