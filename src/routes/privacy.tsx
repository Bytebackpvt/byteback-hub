import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLink } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ByteBack" },
      {
        name: "description",
        content:
          "How ByteBack collects, uses, stores, and protects your data — including Gmail and other connected email accounts.",
      },
      { property: "og:title", content: "Privacy Policy — ByteBack" },
      {
        property: "og:description",
        content:
          "How ByteBack collects, uses, stores, and protects your data — including Gmail and other connected email accounts.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <Badge variant="outline" className="rounded-full">Legal</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          How ByteBack collects, uses, protects, disconnects, and deletes your data — including
          Google/Gmail data authorized through OAuth.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 10, 2026</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-card p-4">
            <div className="text-sm font-semibold">Google Limited Use</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Gmail data is used only for user-facing inbox, classification, CRM, and task features.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-4">
            <div className="text-sm font-semibold">Disconnect flow</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Disconnect one mailbox or all connected Google accounts from Account &amp; Data settings.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-4">
            <div className="text-sm font-semibold">Delete account</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Permanently delete your account and associated workspace data from settings.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/terms">Terms of Service</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="mailto:info@byteback.co.in">Email info@byteback.co.in</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="tel:+919717513277">Call +91 97175 13277</a>
          </Button>
        </div>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-a:text-brand">
          <h2>What ByteBack does</h2>
          <p>
            ByteBack is an enterprise AI-powered Unified Inbox and Customer Communication
            Platform. It enables organizations to connect multiple email accounts from
            Gmail, Google Workspace, Microsoft 365, Outlook, and other supported providers
            into one intelligent inbox. The platform helps users manage customer
            communications, generate AI-powered summaries, organize conversations, create
            CRM records, assign follow-up tasks, and improve response times.
          </p>
          <p>
            This Privacy Policy explains what information ByteBack ("we", "us", "our")
            collects, how we use it, and the choices you have. By using the Service you
            agree to this policy.
          </p>

          <h2>1. Information we collect</h2>
          <h3>Account data</h3>
          <p>
            When you sign up we collect your name, email address, workspace name, and
            authentication identifiers. Passwords are hashed by our authentication provider
            and are never accessible to us in plaintext.
          </p>
          <h3>Connected email accounts</h3>
          <p>
            When you connect a Gmail, Google Workspace, Outlook, Microsoft 365, IMAP, or
            other supported email service provider to ByteBack, we access:
          </p>
          <ul>
            <li>Message metadata (sender, recipient, subject, date, thread id, labels)</li>
            <li>Message bodies (plain text and HTML) required to power inbox and AI features</li>
            <li>Your email address and basic profile from the OAuth provider</li>
          </ul>
          <p>
            We request the minimum OAuth scopes required for the features you enable.
            Additional scopes (such as send or modify) are requested only if you enable
            features that need them, and always with an explicit user consent screen.
          </p>
          <h3>Usage data</h3>
          <p>
            We collect standard product analytics (pages visited, features used, errors) to
            improve the Service. We do not sell this data.
          </p>

          <h2>2. How we use your data</h2>
          <ul>
            <li>To provide the unified inbox and analyze customer conversations to provide AI-powered summaries, categorization, CRM timelines, and productivity features</li>
            <li>To create follow-up tasks and send you notifications</li>
            <li>To secure your account and detect abuse</li>
            <li>To provide customer support</li>
          </ul>
          <p>
            We <strong>do not train AI models on your email content</strong>. AI inference
            is performed by authorized AI processing providers operating under
            zero-retention agreements — your data is not stored or used for training by
            these providers.
          </p>

          <h2>3. Google Workspace data</h2>
          <p>
            ByteBack accesses Gmail and Google Workspace data only after explicit user
            authorization via Google OAuth, to provide the following user-facing features:
            Unified Inbox, AI-powered summaries and categorization of customer
            conversations, CRM timeline generation, follow-up reminders, and email
            management features.
          </p>
          <p>Specifically, we access:</p>
          <ul>
            <li>
              <strong>What:</strong> message metadata (sender, recipient, subject, date,
              thread id, labels) and message bodies (plain text and HTML) from mailboxes
              you connect.
            </li>
            <li>
              <strong>Why:</strong> to display incoming messages in the unified inbox,
              analyze customer conversations with AI, generate CRM contacts and timelines,
              and create follow-up tasks and reminders.
            </li>
            <li>
              <strong>Which features use it:</strong> Unified Inbox, AI Summaries &amp;
              Categorization, CRM &amp; Timeline, Tasks &amp; Follow-ups, Analytics
              (mailbox health, response time, inbox activity, and productivity metrics),
              Notifications.
            </li>
          </ul>

          <h3>AI processing</h3>
          <p>
            Email content may be processed to generate AI summaries, categorization, and
            productivity features (such as suggested next actions and follow-up drafts).
          </p>
          <p>
            <strong>
              Google Workspace data is never used to train generalized AI models.
            </strong>{" "}
            AI inference is performed by authorized AI processing providers operating
            under zero-retention agreements — your data is not stored or used for training
            by these providers.
          </p>

          <h3>Google Limited Use statement</h3>
          <p>
            The use of information received from Google Workspace APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer noopener"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>Specifically:</p>
          <ul>
            <li>
              We only use Google Workspace data to provide user-facing features in the
              ByteBack app (unified inbox, AI summaries and categorization, CRM, tasks,
              analytics).
            </li>
            <li>
              We do not transfer Google Workspace data to third parties except as
              required to provide the Service, comply with law, or with your explicit
              consent.
            </li>
            <li>We do not use Google Workspace data for serving advertisements.</li>
            <li>
              We do not allow humans to read Google Workspace data unless you explicitly
              grant permission for support, we need to for security or to comply with the
              law, or the data is aggregated and anonymized for internal operations.
            </li>
          </ul>

          <h3>Google OAuth scope justification</h3>
          <p>Each scope we request from Google is used only for the following purpose:</p>
          <ul>
            <li>
              <code>https://www.googleapis.com/auth/gmail.readonly</code> — read incoming
              messages in the connected mailbox so ByteBack can display them in the
              unified inbox, analyze customer conversations, and create CRM contacts and
              follow-up tasks.
            </li>
            <li>
              <code>https://www.googleapis.com/auth/gmail.send</code> and{" "}
              <code>https://www.googleapis.com/auth/gmail.modify</code> — requested only
              if you enable reply, compose, or mailbox-action features. Depending on the
              permissions explicitly granted by the user, ByteBack may allow composing,
              sending, replying to emails, and performing mailbox actions such as marking
              messages as read or applying labels. These actions occur only after direct
              user initiation.
            </li>
            <li>
              <code>https://www.googleapis.com/auth/userinfo.email</code> — identify
              which Google account the user connected, so we can label the mailbox in the
              app and prevent duplicate connections.
            </li>
            <li>
              <code>https://www.googleapis.com/auth/userinfo.profile</code> — display the
              connected account's name in the ByteBack UI.
            </li>
            <li>
              <code>openid</code> — standard OpenID Connect sign-in for identifying the
              Google user.
            </li>
          </ul>




          <h2>4. Data storage and security</h2>
          <ul>
            <li>All data is encrypted in transit (TLS 1.2+) and at rest.</li>
            <li>OAuth refresh tokens are stored encrypted (AES-256-GCM) in an isolated secrets vault.</li>
            <li>Row-level security enforces strict workspace isolation.</li>
            <li>Hosted on hardened cloud infrastructure with regular security review.</li>
          </ul>

          <h2>5. Data retention</h2>
          <ul>
            <li>
              <strong>Synced emails:</strong> messages fetched from connected mailboxes are
              retained for as long as the mailbox remains connected and your ByteBack
              workspace is active, so classification, CRM timelines, and search continue
              to work.
            </li>
            <li>
              <strong>On mailbox disconnect:</strong> messages synced from that mailbox are
              purged from our primary database within 30 days of disconnect.
            </li>
            <li>
              <strong>On account deletion:</strong> all workspace data — emails, contacts,
              tasks, notes, pipeline, notifications, AI embeddings — is deleted immediately
              from the primary database.
            </li>
            <li>
              <strong>Backups:</strong> encrypted backups are retained for up to 30 days
              for disaster recovery, after which deleted data is fully purged from backups
              as they roll off.
            </li>
            <li>
              <strong>Account &amp; billing records:</strong> minimal account records
              (name, email, invoices) may be retained as required by applicable tax and
              accounting law.
            </li>
          </ul>

          <h2>6. Data deletion</h2>
          <p>You have full control over your data at any time:</p>
          <ul>
            <li>
              <strong>Disconnect Google:</strong> revoke a single mailbox or all connected
              Google accounts from <em>Settings → Account &amp; Data</em>. ByteBack calls
              Google's OAuth revoke endpoint, deletes the stored refresh token, and stops
              all Gmail syncing.
            </li>
            <li>
              <strong>Delete synced emails:</strong> disconnecting a mailbox purges the
              messages synced from it within 30 days.
            </li>
            <li>
              <strong>Delete account:</strong> permanently delete your entire ByteBack
              account and all workspace data from <em>Settings → Account &amp; Data →
              Delete my account</em>.
            </li>
            <li>
              <strong>Request deletion:</strong> if you cannot access the app, email{" "}
              <a href="mailto:info@byteback.co.in">info@byteback.co.in</a> and we will
              action the request within 30 days.
            </li>
          </ul>

          <h3>Disconnect a Google / Gmail account</h3>

          <p>
            You can disconnect any connected mailbox at any time from{" "}
            <em>Settings → Account &amp; Data → Disconnect all Google accounts</em>, or
            individually from <em>Email Sources</em>. When you disconnect, ByteBack
            immediately calls Google's OAuth revoke endpoint
            (<code>https://oauth2.googleapis.com/revoke</code>), deletes the stored
            refresh token from our database, stops all Gmail syncing, and purges any
            messages synced from that mailbox within 30 days. You can also revoke
            ByteBack directly from your Google Account at{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
              myaccount.google.com/permissions
            </a>.
          </p>
          <h3>Delete your entire ByteBack account</h3>
          <p>
            Go to <em>Settings → Account &amp; Data → Delete my account</em>, type
            <b> DELETE</b> to confirm, and press <em>Permanently delete</em>. This
            immediately and irreversibly:
          </p>
          <ul>
            <li>Revokes every connected Google OAuth token</li>
            <li>Deletes all OAuth connection records</li>
            <li>
              Deletes every workspace you own and all data inside it — emails,
              contacts, tasks, notes, pipeline, notifications, AI embeddings
            </li>
            <li>Removes your membership from any shared workspaces</li>
            <li>Deletes your login (auth user) and signs you out everywhere</li>
          </ul>
          <p>
            Backups are purged within 30 days. If you cannot access the app, email{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a> and
            we will action the request within 30 days.
          </p>

          <h2>7. Sharing your data</h2>
          <p>We share data only with subprocessors that help us operate the Service:</p>
          <ul>
            <li>Cloud hosting and database provider</li>
            <li>Google (Gmail API) — only for accounts you connect</li>
            <li>AI inference provider (LLM inference, zero retention)</li>
            <li>Transactional email provider for notifications</li>
          </ul>
          <p>
            We do not sell your personal data. We may disclose data if required by law or to
            protect the rights, safety, and property of ByteBack, our users, or the public.
          </p>

          <h2>8. Your rights</h2>
          <p>
            Subject to applicable law (including GDPR and CCPA), you have the right to access,
            correct, export, or delete your personal data. Contact{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a> to exercise
            these rights.
          </p>

          <h2>9. Children</h2>
          <p>The Service is not directed to individuals under 16 and we do not knowingly collect data from them.</p>

          <h2>10. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be announced in
            the app or by email at least 7 days before they take effect.
          </p>

          <h2>11. Contact</h2>

          <p>
            Questions? Contact us at{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a>.
          </p>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </main>
    </div>
  );
}
