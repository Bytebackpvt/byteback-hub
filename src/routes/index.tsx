import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  Inbox,
  KanbanSquare,
  Layers,
  ListChecks,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
  Menu,
  X,
  Star,
} from "lucide-react";
import { useState } from "react";

import { BrandLink, BrandMark } from "@/components/brand";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/")({
  component: Landing,
});

const NAV = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
];

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      ["Features", "/features"],
      ["Pricing", "/pricing"],
      ["Integrations", "/integrations"],
      ["Changelog", "/changelog"],
      ["Roadmap", "/roadmap"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Customers", "/customers"],
      ["Careers", "/careers"],
      ["Press", "/press"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Docs", "/docs"],
      ["Blog", "/blog"],
      ["Guides", "/guides"],
      ["Status", "/status"],
      ["Community", "/community"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Support", "/support"],
      ["Google OAuth", "/google-oauth"],
      ["Account Deletion", "/account-deletion"],
    ],
  },

] as const;

const INTEGRATIONS = [
  "Instantly",
  "Smartlead",
  "Google Workspace",
  "Microsoft 365",
  "Outlook",
  "Apollo",
  "Lemlist",
  "Saleshandy",
  "Gmail",
  "IMAP",
];

const FEATURES = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    desc: "Every reply from every mailbox and every domain, in one calm view.",
    span: "md:col-span-2 md:row-span-2",
  },
  { icon: Bot, title: "AI Classification", desc: "Interested, demo, pricing, pickup — auto-tagged." },
  { icon: Flame, title: "AI Priority", desc: "Hot leads surface first. Nothing gets buried." },
  { icon: Bell, title: "Smart Notifications", desc: "Push, Slack, Teams, Telegram — your call." },
  { icon: KanbanSquare, title: "Lightweight CRM", desc: "Contacts, deals, pipeline. No bloat." },
  { icon: ListChecks, title: "Tasks & Reminders", desc: "Reply later, book demo, send quote." },
  { icon: BarChart3, title: "Analytics", desc: "Reply, response and revenue in one dashboard." },
  { icon: Users, title: "Team Collaboration", desc: "Assign, mention, share notes internally." },
  { icon: Search, title: "Ask AI", desc: '"Show all hot ITAM leads waiting 3+ days."' },
];

const CUSTOMERS = [
  "Cold Email Agencies",
  "Lead Gen Agencies",
  "IT Companies",
  "SaaS",
  "MSPs",
  "ITAD",
  "E-Waste",
  "Laptop Rental",
  "Refurbished Laptops",
  "Sales Teams",
  "Founders",
  "Startups",
];

const PRICING = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    tagline: "Try ByteBack solo. No card required.",
    features: [
      "1 mailbox",
      "500 emails / month sync",
      "Basic AI classification",
      "7-day history",
      "1 user",
    ],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "₹999",
    period: "per month",
    tagline: "For founders running outbound alone.",
    features: [
      "3 mailboxes",
      "5,000 emails / month",
      "Full AI summary + follow-up engine",
      "30-day history",
      "Up to 2 users",
    ],
    cta: "Upgrade",
  },
  {
    name: "Pro",
    price: "₹2,499",
    period: "per month",
    tagline: "For small teams that live in the inbox.",
    highlight: true,
    features: [
      "10 mailboxes",
      "Unlimited emails",
      "All integrations (Instantly, Sheets, CRM…)",
      "Full audit log + analytics",
      "Priority AI models",
      "Up to 5 users",
    ],
    cta: "Upgrade",
  },
  {
    name: "Business",
    price: "₹6,999",
    period: "per month",
    tagline: "For agencies and scaling sales orgs.",
    features: [
      "Unlimited mailboxes",
      "Unlimited team seats",
      "Custom domain emails",
      "API access",
      "Priority support",
      "SSO on request",
    ],
    cta: "Talk to sales",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We were juggling 18 mailboxes across 4 domains. ByteBack surfaced two enterprise leads we would have missed in week one.",
    name: "Priya Menon",
    role: "Head of Growth, ITAM Cloud",
  },
  {
    quote:
      "Feels like Superhuman for cold outreach. My team is out of Gmail tabs and into replying to real buyers.",
    name: "Alex Rivera",
    role: "Founder, Refurb.io",
  },
  {
    quote:
      "The AI priority is scary good. Hot leads sit at the top and nothing else asks for my attention.",
    name: "Kenji Watanabe",
    role: "Director of Sales, MSP Group",
  },
];

const FAQS = [
  {
    q: "How is this different from HubSpot or Salesforce?",
    a: "ByteBack is built around your reply stream, not a bloated CRM record. You'll be productive in 5 minutes, not 5 weeks.",
  },
  {
    q: "Which email providers do you support?",
    a: "Google Workspace, Gmail, Microsoft 365, Outlook, and any IMAP/SMTP mailbox. Connect unlimited accounts across unlimited domains.",
  },
  {
    q: "Does it work with Instantly, Smartlead, Lemlist, Apollo?",
    a: "Yes. Any tool that sends from a mailbox you own — we ingest the replies directly from your inbox, so nothing changes about how you send.",
  },
  {
    q: "How does the AI classify replies?",
    a: "Every reply is tagged (Interested, Demo, Pricing, Pickup, Not Interested, OOO, and 15+ more) and scored Hot / Medium / Low. You can override anytime.",
  },
  {
    q: "Is my email data safe?",
    a: "SOC 2-ready, encrypted at rest and in transit. We never train shared models on your email content.",
  },
  {
    q: "Do you offer a free plan?",
    a: "Yes — up to 5 mailboxes and 2 users, forever. No card required.",
  },
  {
    q: "Can I import my existing contacts?",
    a: "CSV import on Starter and above. Native sync with Apollo, HubSpot, and Pipedrive on Growth and up.",
  },
  {
    q: "Is there a mobile app?",
    a: "iOS and Android apps ship alongside the web app so you can triage hot leads from anywhere.",
  },
];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-transparent">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLink />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                to={n.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              to="/auth"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button size="sm" className="rounded-lg">
                Start free <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="mt-8 flex flex-col gap-1">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm hover:bg-accent"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <div className="mt-4 flex flex-col gap-2">
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button className="w-full">Start free</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-radial-brand relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px]">
        <div className="absolute left-1/2 top-24 h-72 w-[720px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 md:pb-28 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge
            variant="outline"
            className="mb-5 gap-1.5 rounded-full border-border/70 bg-background/70 px-3 py-1 text-xs backdrop-blur"
          >
            <Sparkles className="h-3 w-3 text-brand" />
            <span className="text-muted-foreground">Now with AI Lead Qualification</span>
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            One inbox.{" "}
            <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">
              Every lead.
            </span>{" "}
            Zero missed opportunities.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Connect unlimited email accounts across every domain. AI organizes every reply, ranks
            the hot ones, and pings you the second a real buyer shows up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-xl px-5">
                Start free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <BookDemoDialog
              trigger={
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-border/70 bg-background/60 px-5 backdrop-blur"
                >
                  Book a demo
                </Button>
              }
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free forever plan · No card required · 5-minute setup
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const items = [
    {
      from: "Sarah Chen · Northwind Corp",
      subject: "Re: quick question on your ITAD service",
      snippet: "This is exactly what we need — can we book 30 min this week?",
      tag: "Demo",
      priority: "Hot",
      color: "bg-brand/10 text-brand ring-brand/20",
    },
    {
      from: "David Park · Meridian Health",
      subject: "Re: Refurbished ThinkPad quote",
      snippet: "Send pricing for 120 units, our fleet refresh is Q1.",
      tag: "Pricing",
      priority: "Hot",
      color: "bg-warning/10 text-warning ring-warning/20",
    },
    {
      from: "Marcus Reed · Atlas Logistics",
      subject: "Re: e-waste pickup",
      snippet: "Pickup Friday works. What's the process for signed COD?",
      tag: "Pickup",
      priority: "Medium",
      color: "bg-success/10 text-success ring-success/20",
    },
    {
      from: "Emma Alvarez · Cirrus SaaS",
      subject: "Re: Rental inquiry for onsite team",
      snippet: "60 laptops for 3 months. Timeline flexible.",
      tag: "Rental",
      priority: "Medium",
      color: "bg-chart-5/15 text-foreground ring-border",
    },
    {
      from: "Auto Reply",
      subject: "Out of office through Friday",
      snippet: "I'll respond when I'm back next week.",
      tag: "OOO",
      priority: "Low",
      color: "bg-muted text-muted-foreground ring-border",
    },
  ];

  return (
    <div className="relative rounded-2xl border border-border/70 bg-card/70 p-2 shadow-2xl shadow-black/10 backdrop-blur">
      <div className="rounded-xl border border-border/70 bg-background/80">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-3 text-xs text-muted-foreground">inbox.byteback.ai</span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI is watching 17 mailboxes
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-border/70 p-3 md:block">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Filters
            </div>
            {[
              ["Hot Leads", "5", true],
              ["Unread", "23", false],
              ["Needs reply", "11", false],
              ["Assigned to me", "7", false],
              ["Waiting", "4", false],
              ["Closed", "—", false],
            ].map(([label, count, active]) => (
              <div
                key={label as string}
                className={`mb-1 flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                  active ? "bg-accent text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{label as string}</span>
                <span className="text-xs">{count as string}</span>
              </div>
            ))}
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> AI Summary
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                17 replies today · 5 Hot Leads · 3 demos · 2 pricing · 1 pickup.
              </p>
            </div>
          </aside>
          <div className="divide-y divide-border/70">
            {items.map((it) => (
              <div
                key={it.subject}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-accent/40"
              >
                <div className="mt-1 flex flex-col items-center gap-1">
                  {it.priority === "Hot" && <Flame className="h-3.5 w-3.5 text-brand" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{it.from}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${it.color}`}
                    >
                      {it.tag}
                    </span>
                  </div>
                  <p className="truncate text-sm">{it.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.snippet}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMarquee() {
  const row = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <section className="border-y border-border/60 bg-muted/30 py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Works with everything you already send from
      </p>
      <div
        className="group relative flex overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="flex min-w-full animate-[marquee_40s_linear_infinite] items-center gap-10 pr-10">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground/70"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

function ProblemBand() {
  const items = [
    {
      icon: Layers,
      title: "Replies scattered across dozens of inboxes",
      desc: "Sales1, Sales2, Info, Contact, Support — nobody knows where the good lead landed.",
    },
    {
      icon: Zap,
      title: "Important leads slip through the cracks",
      desc: "A hot demo request buried between out-of-office auto-replies and unsubscribes.",
    },
    {
      icon: Calendar,
      title: "Follow-ups get forgotten",
      desc: "The 3-day window closes and the deal cools. Every week. Every rep.",
    },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">The problem</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Cold email works. Your inbox doesn't.
          </h2>
          <p className="mt-3 text-muted-foreground">
            You already send from Instantly, Smartlead, Apollo, Lemlist. The replies come back to
            you — and disappear.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <it.icon className="h-5 w-5 text-brand" />
              <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Product</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            The command center for outbound reply.
          </h2>
          <p className="mt-3 text-muted-foreground">
            A calm, AI-native workspace that replaces your shared inbox, your spreadsheet, and half
            your CRM.
          </p>
        </div>
        <div className="mt-12 grid auto-rows-[200px] grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                f.span ?? ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              {f.span && (
                <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AISummary() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">AI Assistant</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your morning brief, generated for you.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every morning ByteBack tells you exactly what to do first. Every evening it tells you
            what's still open. Every Friday it recaps the week — deals, replies, wins.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Daily summary at 8 AM",
              "Work pending brief at 6 PM",
              "Weekly report every Friday",
              "Ask AI: “Who's waiting on me more than 3 days?”",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Daily Summary · Monday</p>
              <p className="text-xs text-muted-foreground">Generated 8:00 AM</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            You received <span className="font-semibold text-foreground">17 replies</span> today.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[
              ["🔥 5", "Hot Leads"],
              ["📅 3", "Demo Requests"],
              ["💵 2", "Pricing Requests"],
              ["📦 1", "Pickup Request"],
              ["⏰ 6", "Follow-ups Pending"],
              ["✅ 4", "Closed Today"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg border border-border/70 bg-background p-3">
                <div className="text-lg font-semibold">{n}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Recommended next: reply to <span className="font-medium text-foreground">Sarah Chen</span>{" "}
            (waiting 22h · Hot).
          </div>
        </div>
      </div>
    </section>
  );
}

function Customers() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Built for</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Teams that live in their inbox.
          </h2>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {CUSTOMERS.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing. Start free forever.
          </h2>
          <p className="mt-3 text-muted-foreground">
            No per-mailbox nickel-and-diming. Cancel any time.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRICING.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                tier.highlight
                  ? "border-brand/50 bg-card ring-1 ring-brand/30"
                  : "border-border/70 bg-card"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                <span className="text-sm text-muted-foreground">/ {tier.period}</span>
              </div>
              {tier.cta === "Talk to sales" ? (
                <BookDemoDialog
                  trigger={
                    <Button className="mt-5 w-full rounded-lg" variant={tier.highlight ? "default" : "outline"}>
                      {tier.cta}
                    </Button>
                  }
                />
              ) : (
                <Link to="/auth" className="mt-5">
                  <Button
                    className="w-full rounded-lg"
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              )}
              <ul className="mt-6 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Loved by teams</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            The last inbox they'll ever configure.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-brand text-brand" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 text-xs">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Answers, before you ask.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/70">
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-10 text-center shadow-lg sm:p-16">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-gradient-to-b from-brand/20 to-transparent blur-3xl" />
          <Shield className="mx-auto h-8 w-8 text-brand" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Never miss another valuable lead.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Set up in under 5 minutes. Free forever plan. Your team will thank you tomorrow.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-xl px-5">
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <BookDemoDialog
              trigger={
                <Button size="lg" variant="outline" className="rounded-xl px-5">
                  Book a demo
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/20 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <BrandMark />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              One inbox. Every lead. Zero missed opportunities.
            </p>
          </div>
          {FOOTER_LINKS.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {c.title}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} className="transition hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ByteBack, Inc. All rights reserved.</p>
          <p>Made for teams who reply fast.</p>
        </div>
      </div>
    </footer>
  );
}

function GoogleWorkspaceSection() {
  const items = [
    "Securely connect your Gmail or Google Workspace account using OAuth",
    "Read customer emails to power the Unified Inbox",
    "Generate AI summaries and categorize conversations",
    "Reply from one unified inbox across every mailbox",
    "Create CRM contacts and follow-up tasks automatically",
    "Never share or sell your data — Google Limited Use compliant",
  ];
  return (
    <section id="google-workspace" className="border-t border-border/60 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">
              Google Workspace Integration
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Gmail &amp; Google Workspace, natively integrated.
            </h2>
            <p className="mt-3 text-muted-foreground">
              ByteBack connects to your Gmail or Google Workspace account with OAuth,
              analyzes customer conversations with AI, and organizes everything into a
              unified inbox and lightweight CRM — without ever selling or sharing your
              data.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {items.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/google-oauth">
                <Button size="sm" variant="outline">
                  Google OAuth &amp; Limited Use
                </Button>
              </Link>
              <Link to="/privacy">
                <Button size="sm" variant="outline">
                  Privacy Policy
                </Button>
              </Link>
              <Link to="/account-deletion">
                <Button size="sm" variant="outline">
                  Disconnect &amp; delete data
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-brand" /> Google Limited Use
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The use of information received from Google Workspace APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Google Workspace data is never
              used to train generalized AI models or serve advertising.
            </p>
            <div className="mt-4 grid gap-2 text-xs">
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <div className="font-medium">Requested scopes</div>
                <div className="mt-1 text-muted-foreground">
                  gmail.readonly, gmail.send &amp; gmail.modify (when enabled),
                  userinfo.email, userinfo.profile, openid
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <div className="font-medium">Disconnect any time</div>
                <div className="mt-1 text-muted-foreground">
                  Revoke via ByteBack settings or myaccount.google.com/permissions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <LogoMarquee />
        <ProblemBand />
        <Features />
        <AISummary />
        <GoogleWorkspaceSection />
        <Customers />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

