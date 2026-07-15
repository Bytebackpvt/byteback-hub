import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  ShieldOff,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { BrandLink } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Account & Data Deletion — ByteBack" },
      {
        name: "description",
        content:
          "Disconnect Google or Microsoft accounts, delete synced emails, and permanently delete your ByteBack account and all associated data.",
      },
      { property: "og:title", content: "Account & Data Deletion — ByteBack" },
      {
        property: "og:description",
        content:
          "How to disconnect connected mailboxes, revoke OAuth permissions, and permanently delete your ByteBack account.",
      },
    ],
  }),
  component: AccountDeletionPage,
});

const REMOVED_ON_DELETE = [
  "OAuth Tokens Revoked (Google & Microsoft)",
  "Refresh Tokens Deleted from encrypted vault",
  "Email Sync Stops immediately",
  "Background Jobs Removed",
  "Mailbox Records Removed",
  "Synced Messages Deleted",
  "CRM Contacts & Deals Deleted",
  "Tasks & Reminders Deleted",
  "Notifications Deleted",
  "AI Embeddings Deleted",
  "Timeline & Activity History Deleted",
  "Workspace Deleted",
  "Backups Purged Within 30 Days",
];

const FAQS = [
  {
    q: "Can I reconnect later?",
    a: "Yes. If you only disconnect a mailbox you can re-authorize it any time from Settings → Email Sources. If you delete your entire account, you can sign up again with the same email — but your previous data is not recoverable.",
  },
  {
    q: "Can I restore my account?",
    a: "No. Account deletion is permanent and irreversible. Data is removed from our primary systems immediately and from encrypted backups within 30 days.",
  },
  {
    q: "Can I export my data first?",
    a: "Yes. Before deleting, go to Settings → Account & Data → Export data to download your CRM contacts, deals, and email metadata as CSV. Or push data to Google Sheets / a webhook from Integrations.",
  },
  {
    q: "Can I delete only one mailbox?",
    a: "Yes. From Settings → Email Sources, click Disconnect on the specific mailbox. Its OAuth token is revoked immediately and its synced messages are purged within 30 days.",
  },
  {
    q: "Can I delete only synced emails?",
    a: "Yes. Disconnect the mailbox — synced messages from it are purged within 30 days while your CRM, tasks, and other workspace data remain.",
  },
];

function AccountDeletionPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <BrandLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Badge variant="outline" className="rounded-full gap-1.5">
          <ShieldOff className="h-3 w-3 text-brand" /> Account &amp; Data
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Account &amp; Data Deletion
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This page explains exactly how to disconnect Google accounts, disconnect
          Microsoft accounts, revoke OAuth permissions, delete synced emails, and
          permanently delete your ByteBack account. It satisfies the Google OAuth
          Verification requirements for account and data deletion.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={ShieldOff}
            title="Disconnect"
            body="Revoke OAuth and stop syncing a single mailbox or all of them."
          />
          <SummaryCard
            icon={Trash2}
            title="Delete data"
            body="Purge synced emails, workspace data, or your entire account."
          />
          <SummaryCard
            icon={Mail}
            title="Manual request"
            body="Email info@byteback.co.in if you can't access the app."
          />
        </div>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-a:text-brand">
          <h2>Overview</h2>
          <p>
            You own your data in ByteBack and can remove it at any time. You have four
            levels of control, from disconnecting a single mailbox to permanently
            deleting your entire account. All deletions are reflected in encrypted
            backups within 30 days.
          </p>

          <h2>1. Disconnect a Google account</h2>
          <p>
            Go to <em>Settings → Account &amp; Data → Disconnect all Google accounts</em>,
            or disconnect a specific mailbox from <em>Settings → Email Sources</em>. When
            you disconnect, ByteBack immediately:
          </p>
          <ul>
            <li>
              Calls Google's OAuth revoke endpoint
              (<code>https://oauth2.googleapis.com/revoke</code>) for the mailbox's
              refresh and access tokens
            </li>
            <li>Deletes the encrypted refresh and access tokens from our vault</li>
            <li>Stops Gmail syncing and removes scheduled sync jobs</li>
            <li>Purges messages synced from that mailbox within 30 days</li>
          </ul>
          <p>
            You may also revoke ByteBack directly from your Google Account at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer noopener"
            >
              https://myaccount.google.com/permissions{" "}
              <ExternalLink className="inline h-3 w-3" />
            </a>
            .
          </p>

          <h2>2. Disconnect a Microsoft account</h2>
          <p>
            From <em>Settings → Email Sources</em>, click Disconnect on the Outlook or
            Microsoft 365 mailbox. ByteBack revokes the Microsoft OAuth token, deletes
            stored credentials, stops syncing, and purges synced messages within 30
            days. You can also remove ByteBack from{" "}
            <a
              href="https://myaccount.microsoft.com/consent"
              target="_blank"
              rel="noreferrer noopener"
            >
              your Microsoft account consent page{" "}
              <ExternalLink className="inline h-3 w-3" />
            </a>
            .
          </p>

          <h2>3. Disconnect individual mailboxes</h2>
          <p>
            Every connected mailbox can be disconnected independently from{" "}
            <em>Settings → Email Sources</em>. Other mailboxes and workspace data are
            unaffected.
          </p>

          <h2>4. Delete synced emails</h2>
          <p>
            Disconnecting a mailbox purges the emails synced from it within 30 days. To
            delete synced emails without disconnecting, use{" "}
            <em>Settings → Account &amp; Data → Purge synced emails</em> for the
            selected mailbox.
          </p>

          <h2>5. Delete a workspace</h2>
          <p>
            Owners can delete an entire workspace from{" "}
            <em>Settings → Account &amp; Data → Delete workspace</em>. This cascades
            through all workspace data — mailboxes, contacts, deals, tasks, notes,
            notifications, and AI embeddings — and removes every member's access.
          </p>

          <h2>6. Delete your entire account</h2>
          <p>The full account deletion flow lives at:</p>
          <pre className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
{`Settings
   ↓
Account & Data
   ↓
Delete my account`}
          </pre>

          <h3>Confirmation workflow</h3>
          <ol>
            <li>Open <em>Settings → Account &amp; Data → Delete my account</em>.</li>
            <li>
              Type <code>DELETE</code> into the confirmation field to confirm intent.
            </li>
            <li>Click <strong>Permanently delete</strong>.</li>
            <li>
              You receive a confirmation email at your account address summarizing what
              was removed and the backup purge date.
            </li>
          </ol>

          <h3>Exactly what happens</h3>
          <ul>
            {REMOVED_ON_DELETE.map((r) => (
              <li key={r} className="!my-0 flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <h2>Request manual deletion</h2>
          <p>
            If you can't sign in or cannot use the in-app flow, email{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a> from
            the address on file. We will verify your identity and action the request
            within 30 days.
          </p>
          <ul>
            <li>
              <strong>Expected processing time:</strong> up to 30 days from receipt.
            </li>
            <li>
              <strong>Support contact:</strong>{" "}
              <a href="mailto:info@byteback.co.in">info@byteback.co.in</a>
            </li>
          </ul>

          <h2>Data retention exceptions</h2>
          <p>
            After deletion we retain a minimal set of records only where required by
            law (for example tax and accounting invoices under Indian and applicable
            foreign law). These records do not include email content, Google Workspace
            data, or AI-generated content, and are stored securely for the minimum
            legally required period.
          </p>

          <h2>Encrypted backups</h2>
          <p>
            Encrypted disaster-recovery backups are retained for up to 30 days and are
            not directly accessible during normal operations. Deleted data is fully
            purged from backups as they roll off within 30 days.
          </p>
        </div>

        <section className="mt-12 rounded-2xl border border-border/70 bg-card p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-base font-semibold">FAQ</h2>
          </div>
          <ul className="mt-4 space-y-4">
            {FAQS.map((f) => (
              <li key={f.q}>
                <p className="text-sm font-medium">{f.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer noopener"
            >
              Revoke on Google
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="mailto:info@byteback.co.in">Email info@byteback.co.in</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/privacy">Privacy Policy</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/google-oauth">Google OAuth info</Link>
          </Button>
        </section>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span className="mx-2">·</span>
          <Link to="/support" className="hover:text-foreground">Support</Link>
          <span className="mx-2">·</span>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldOff;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
