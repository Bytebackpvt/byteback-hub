import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Server,
  Trash2,
  PlayCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { BrandLink } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/google-oauth")({
  head: () => ({
    meta: [
      { title: "Google OAuth Verification — ByteBack" },
      {
        name: "description",
        content:
          "Google OAuth Verification information for ByteBack Inbox AI — scopes, justification, demo video, data flow, security, Limited Use compliance, and reviewer contacts.",
      },
      { property: "og:title", content: "Google OAuth Verification — ByteBack" },
      {
        property: "og:description",
        content:
          "Everything a Google reviewer needs to understand ByteBack's use of Google Workspace APIs.",
      },
    ],
  }),
  component: GoogleOAuthPage,
});

const SCOPES = [
  {
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    why: "Read incoming messages in the connected mailbox to display them in the Unified Inbox, analyze customer conversations with AI, and generate CRM contacts and follow-up tasks.",
    sensitive: "Restricted",
  },
  {
    scope: "https://www.googleapis.com/auth/gmail.send",
    why: "Requested only when the user enables reply/compose features. Allows the user to send emails and replies initiated from ByteBack's Unified Inbox.",
    sensitive: "Restricted",
  },
  {
    scope: "https://www.googleapis.com/auth/gmail.modify",
    why: "Requested only when the user enables mailbox-action features (mark as read, apply labels). Actions occur only after direct user initiation.",
    sensitive: "Restricted",
  },
  {
    scope: "https://www.googleapis.com/auth/userinfo.email",
    why: "Identify which Google account the user connected, to label the mailbox in the app and prevent duplicate connections.",
    sensitive: "Non-sensitive",
  },
  {
    scope: "https://www.googleapis.com/auth/userinfo.profile",
    why: "Display the connected account's name in the ByteBack UI.",
    sensitive: "Non-sensitive",
  },
  {
    scope: "openid",
    why: "Standard OpenID Connect sign-in for identifying the Google user.",
    sensitive: "Non-sensitive",
  },
];

const SUBPROCESSORS: [string, string][] = [
  ["Google LLC", "Gmail & Workspace APIs (user-authorized)"],
  ["Microsoft Corporation", "Outlook & Microsoft 365 APIs (user-authorized)"],
  ["Cloud hosting provider", "Application hosting, database, storage"],
  ["AI processing provider", "LLM inference under zero-retention agreement"],
  ["Transactional email provider", "System and notification emails"],
  ["Stripe", "Subscription billing (if you upgrade to a paid plan)"],
];

function GoogleOAuthPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <BrandLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <Badge variant="outline" className="rounded-full gap-1.5">
          <ShieldCheck className="h-3 w-3 text-brand" /> For Google Reviewers
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Google OAuth Verification Information
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This page contains everything a Google reviewer needs to understand ByteBack
          Inbox AI's use of Google Workspace APIs — application overview, requested
          scopes with justifications, demo video, data flow, security controls, Limited
          Use compliance statement, AI processing details, subprocessors, and account
          deletion.
        </p>

        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          <Button asChild size="sm" variant="outline">
            <Link to="/privacy">Privacy Policy</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/terms">Terms of Service</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/account-deletion">Account Deletion</Link>
          </Button>
        </div>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-a:text-brand">
          <h2>Application overview</h2>
          <p>
            ByteBack is an enterprise AI-powered Unified Inbox and Customer
            Communication Platform. It enables organizations to connect multiple email
            accounts from Gmail, Google Workspace, Microsoft 365, Outlook, and other
            supported providers into one intelligent inbox. The platform helps users
            manage customer communications, generate AI-powered summaries, organize
            conversations, create CRM records, assign follow-up tasks, and improve
            response times.
          </p>
          <ul>
            <li><strong>Application name:</strong> ByteBack Inbox AI</li>
            <li><strong>Website:</strong> <a href="https://byteback.digital" target="_blank" rel="noreferrer noopener">byteback.digital</a></li>
            <li><strong>Support email:</strong> <a href="mailto:info@byteback.co.in">info@byteback.co.in</a></li>
            <li><strong>Privacy contact:</strong> <a href="mailto:info@byteback.co.in">info@byteback.co.in</a></li>
          </ul>

          <h2>Core features</h2>
          <ul>
            <li>Unified Inbox across multiple mailboxes and domains</li>
            <li>AI-powered summaries and categorization of customer conversations</li>
            <li>Lightweight CRM with contacts, deals, and pipeline</li>
            <li>Follow-up tasks and reminders auto-created from conversations</li>
            <li>Notifications across web, mobile, email, Slack, and Teams</li>
            <li>Analytics on mailbox health, response time, inbox activity, and productivity</li>
            <li>Team collaboration with internal notes, mentions, and assignments</li>
          </ul>

          <h2>OAuth flow</h2>
          <ol>
            <li>
              The user clicks <em>Connect Gmail</em> in ByteBack and is redirected to
              Google's OAuth consent screen at{" "}
              <code>accounts.google.com/o/oauth2/v2/auth</code>.
            </li>
            <li>
              Google displays the requested scopes and asks the user for consent.
              ByteBack requests only the scopes required for the features the user has
              enabled.
            </li>
            <li>
              Google redirects the browser to ByteBack's authorized redirect URI with
              an authorization code.
            </li>
            <li>
              ByteBack's server exchanges the code for a refresh and access token,
              which are encrypted (AES-256-GCM) and stored in an isolated secrets
              vault.
            </li>
            <li>
              Tokens are used only server-to-server to fetch messages and perform
              user-initiated actions. The user can revoke access at any time from
              ByteBack or from{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer noopener"
              >
                myaccount.google.com/permissions
              </a>
              .
            </li>
          </ol>

          <h2>Requested Google scopes &amp; why each is required</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Scope</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Why required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {SCOPES.map((s) => (
                  <tr key={s.scope} className="align-top">
                    <td className="px-3 py-2 font-mono text-xs">{s.scope}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          s.sensitive === "Restricted"
                            ? "inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-warning"
                            : "inline-flex rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                        }
                      >
                        {s.sensitive}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Demo video</h2>
          <p>
            The demo video walks a reviewer through: (1) the OAuth consent screen
            showing the requested scopes, (2) connecting a Gmail account, (3) the
            Unified Inbox displaying messages, (4) an AI-generated summary of a
            conversation, (5) a CRM contact and task automatically created from a
            reply, and (6) the in-app Account &amp; Data page showing disconnect and
            delete controls.
          </p>
          <p>
            <a
              href="mailto:info@byteback.co.in?subject=Google%20OAuth%20verification%20-%20demo%20video"
              className="inline-flex items-center gap-1"
            >
              <PlayCircle className="inline h-4 w-4" /> Request current demo video link
              <ExternalLink className="inline h-3 w-3" />
            </a>
          </p>

          <h2>Reviewer test credentials</h2>
          <p>
            Test credentials for the Google reviewer are provided directly through the
            OAuth verification submission. Reviewers may also request new credentials
            at <a href="mailto:info@byteback.co.in">info@byteback.co.in</a>.
          </p>

          <h2>Data flow</h2>
          <pre className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed">
{`User's browser
      │  1. Sign in with Google (OAuth consent)
      ▼
Google OAuth 2.0
      │  2. Authorization code
      ▼
ByteBack server (TLS 1.2+)
      │  3. Exchange code → refresh & access tokens
      │  4. Encrypt tokens (AES-256-GCM) → secrets vault
      │  5. Server-to-server: fetch messages via Gmail API
      ▼
Postgres database (encrypted at rest, RLS)
      │  6. AI request (minimum content needed)
      ▼
Authorized AI processing provider (zero retention)
      │  7. Summary / categorization returned
      ▼
ByteBack UI displays inbox, summaries, CRM, tasks`}
          </pre>

          <h2>Security measures</h2>
          <ul>
            <li>TLS 1.2+ for all data in transit</li>
            <li>Encryption at rest for the primary database and object storage</li>
            <li>OAuth refresh tokens stored encrypted with AES-256-GCM in a secrets vault</li>
            <li>Row-level security enforcing strict tenant/workspace isolation</li>
            <li>Least-privilege access, audit logging, and periodic security review</li>
            <li>Automated dependency and vulnerability scanning</li>
            <li>No production access to Google Workspace data by ByteBack personnel except with explicit user permission, for security, or to comply with law</li>
          </ul>

          <h2>Google Limited Use compliance</h2>
          <blockquote>
            The use of information received from Google Workspace APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer noopener"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </blockquote>
          <ul>
            <li>Google Workspace data is used only to provide user-facing features in ByteBack.</li>
            <li>Google Workspace data is not transferred to third parties except as required to provide the Service, comply with law, or with the user's explicit consent.</li>
            <li>Google Workspace data is not used for advertising.</li>
            <li>Google Workspace data is not read by humans except with the user's explicit permission, for security, to comply with law, or where the data has been aggregated and anonymized.</li>
            <li>Google Workspace data is not used to train generalized AI/ML models.</li>
          </ul>

          <h2>AI processing explanation</h2>
          <p>
            Email content processed for AI summaries and categorization is sent, over
            TLS, to authorized AI processing providers operating under zero-retention
            agreements. Providers do not store request or response content and do not
            use it to train generalized models. Only the minimum content required for
            the feature is sent (for example the current thread's messages), and
            results are returned to ByteBack and displayed to the user.
          </p>

          <h2>Subprocessors</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Subprocessor</th>
                  <th className="px-3 py-2 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {SUBPROCESSORS.map(([name, purpose]) => (
                  <tr key={name} className="align-top">
                    <td className="px-3 py-2 text-xs font-medium">{name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Encryption</h2>
          <ul>
            <li><strong>In transit:</strong> TLS 1.2+ everywhere, HSTS on public endpoints</li>
            <li><strong>At rest:</strong> AES-256 for database, storage, and backups</li>
            <li><strong>Secrets:</strong> AES-256-GCM envelope encryption for OAuth tokens</li>
          </ul>

          <h2>Data retention</h2>
          <p>
            Synced emails are retained while the mailbox remains connected and the
            workspace is active. On mailbox disconnect, synced messages are purged from
            the primary database within 30 days. On account deletion, all workspace
            data is deleted immediately from the primary database and purged from
            encrypted backups within 30 days. See the{" "}
            <Link to="/privacy">Privacy Policy</Link> for full details.
          </p>

          <h2>Data deletion</h2>
          <p>
            Users can disconnect Google or Microsoft accounts, delete synced emails,
            delete workspaces, or delete their entire account from{" "}
            <em>Settings → Account &amp; Data</em>. A detailed step-by-step guide is
            available on the{" "}
            <Link to="/account-deletion">Account &amp; Data Deletion</Link> page.
            Manual deletion requests can be sent to{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a> and
            are actioned within 30 days.
          </p>

          <h2>Contact</h2>
          <ul>
            <li><strong>Privacy &amp; verification:</strong> <a href="mailto:info@byteback.co.in">info@byteback.co.in</a></li>
            <li><strong>Support:</strong> <a href="mailto:info@byteback.co.in">info@byteback.co.in</a></li>
            <li><strong>General:</strong> <a href="mailto:info@byteback.co.in">info@byteback.co.in</a></li>
            <li><strong>Phone:</strong> <a href="tel:+919717513277">+91 97175 13277</a></li>
          </ul>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-4">
          <SmallCard icon={Lock} title="Encryption" body="TLS 1.2+, AES-256 at rest" />
          <SmallCard icon={Server} title="Data flow" body="Server-to-server, RLS isolated" />
          <SmallCard icon={Sparkles} title="AI" body="Zero-retention providers" />
          <SmallCard icon={Trash2} title="Deletion" body="30-day backup purge" />
        </div>

        <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <span className="mx-2">·</span>
          <Link to="/support" className="hover:text-foreground">Support</Link>
          <span className="mx-2">·</span>
          <Link to="/account-deletion" className="hover:text-foreground">Account Deletion</Link>
          <span className="mx-2">·</span>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </main>
    </div>
  );
}

function SmallCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof KeyRound;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
