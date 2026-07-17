import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, HelpCircle, PlayCircle, ChevronDown, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GuidedTour } from "@/components/guided-tour";

export const Route = createFileRoute("/_authenticated/app/help")({
  head: () => ({
    meta: [
      { title: "Help Center — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HelpPage,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "How many mailboxes can I connect?",
    a: "Unlimited. Connect Gmail, Outlook, Google Workspace, Microsoft 365, IMAP/SMTP or your Instantly / Smartlead accounts — all replies land in one unified inbox.",
  },
  {
    q: "Which AI model powers reply classification?",
    a: "ByteBack uses a state-of-the-art large language model (Google Gemini class) via our secure AI gateway. Every reply is classified into one of 22 categories (Interested, Objection, Booked, Unsubscribe, etc.) with a confidence score and reason.",
  },
  {
    q: "Can I export my lead data?",
    a: "Yes. From Integrations you can push leads to Google Sheets, HubSpot, or any webhook. You can also download CSV exports from the CRM page.",
  },
  {
    q: "Does ByteBack work offline?",
    a: "The app is a PWA and keeps your last-loaded data on screen when the network drops. Actions queue and sync when you're back online.",
  },
  {
    q: "How are follow-up tasks created?",
    a: "When AI classifies a reply as needing action (e.g. Interested, Question, Objection), a task is auto-created and assigned to the mailbox owner with a suggested next step and due date.",
  },
  {
    q: "How does escalation work?",
    a: "If a hot reply isn't actioned within 30 min / 2 h / 24 h, ByteBack escalates via notification, email, and Slack (if connected). Configurable per workspace.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted in transit and at rest. Row-level security ensures workspace isolation. OAuth tokens are stored in an encrypted vault. We never train AI models on your data.",
  },
  {
    q: "Can I invite my team?",
    a: "Yes — from the Team page. Roles: Owner, Admin, Member, Viewer. Each role has different permissions across leads, tasks, and settings.",
  },
];

function HelpPage() {
  const [tourOpen, setTourOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
          <HelpCircle className="h-3.5 w-3.5" /> Help Center
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">How can we help?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the product manual, take a guided tour, or browse frequently asked questions.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={FileText}
          title="Product Manual"
          body="Complete PDF guide with every feature, screen tour, and 5-min demo script."
          action={
            <Button asChild size="sm" className="w-full">
              <a href="/ByteBack-Manual.pdf" download>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </a>
            </Button>
          }
        />
        <ActionCard
          icon={PlayCircle}
          title="Guided Tour"
          body="A 60-second interactive walk-through of every main screen in the app."
          action={
            <Button size="sm" variant="outline" className="w-full" onClick={() => setTourOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Start tour
            </Button>
          }
        />
        <ActionCard
          icon={Mail}
          title="Contact Support"
          body="Email info@byteback.co.in or call +91 97175 13277 — our team replies within a few hours on business days."
          action={
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href="mailto:info@byteback.co.in">Email support</a>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href="tel:+919717513277">Call +91 97175 13277</a>
              </Button>
            </div>
          }
        />
      </div>

      <section aria-labelledby="faq-heading" className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 id="faq-heading" className="text-sm font-semibold">Frequently asked questions</h2>
        </div>
        <ul className="divide-y divide-border">
          {FAQS.map((f, i) => {
            const isOpen = openIdx === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-btn-${i}`;
            return (
              <li key={f.q}>
                <button
                  id={btnId}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground"
                  >
                    {f.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-3">{action}</div>
    </div>
  );
}
