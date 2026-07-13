import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLink } from "@/components/brand";

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
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <BrandLink />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Legal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 10, 2026</p>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-h3:text-base prose-p:leading-relaxed prose-a:text-brand">
          <p>
            ByteBack ("we", "us", "our") operates the ByteBack Inbox AI platform available at
            byteback.digital (the "Service"). This Privacy Policy explains what information we
            collect, how we use it, and the choices you have. By using the Service you agree to
            this policy.
          </p>

          <h2>1. Information we collect</h2>
          <h3>Account data</h3>
          <p>
            When you sign up we collect your name, email address, workspace name, and
            authentication identifiers. Passwords are hashed by our authentication provider and
            are never accessible to us in plaintext.
          </p>
          <h3>Connected email accounts</h3>
          <p>
            When you connect a Gmail, Google Workspace, Outlook, Microsoft 365, IMAP, or
            third-party sending tool (Instantly, Smartlead) to ByteBack, we access:
          </p>
          <ul>
            <li>Message metadata (sender, recipient, subject, date, thread id, labels)</li>
            <li>Message bodies (plain text and HTML) required to classify replies</li>
            <li>Your email address and basic profile from the OAuth provider</li>
          </ul>
          <p>
            We request the minimum OAuth scopes required — for Gmail this is{" "}
            <code>gmail.readonly</code>, <code>openid</code>, <code>email</code>, and{" "}
            <code>profile</code>. We do <strong>not</strong> request send, delete, or modify
            scopes.
          </p>
          <h3>Usage data</h3>
          <p>
            We collect standard product analytics (pages visited, features used, errors) to
            improve the Service. We do not sell this data.
          </p>

          <h2>2. How we use your data</h2>
          <ul>
            <li>To provide the unified inbox, reply classification, and CRM features</li>
            <li>To create follow-up tasks and send you notifications</li>
            <li>To secure your account and detect abuse</li>
            <li>To provide customer support</li>
          </ul>
          <p>
            We <strong>do not train AI models on your email content</strong>. Reply
            classification is performed by third-party LLM providers (Google Gemini via the
            Lovable AI Gateway) under zero-retention agreements — your data is not stored or
            used for training by these providers.
          </p>

          <h2>3. Google user data — limited use disclosure</h2>
          <p>
            ByteBack's use and transfer of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer noopener"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Specifically:
          </p>
          <ul>
            <li>
              We only use Gmail data to provide user-facing features in the ByteBack app
              (unified inbox, classification, CRM, tasks, analytics).
            </li>
            <li>We do not transfer Gmail data to third parties except as required to provide the Service, comply with law, or with your explicit consent.</li>
            <li>We do not use Gmail data for serving advertisements.</li>
            <li>We do not allow humans to read Gmail data unless you explicitly grant permission for support, we need to for security or to comply with the law, or the data is aggregated and anonymized for internal operations.</li>
          </ul>

          <h3>Google OAuth scope justification</h3>
          <p>Each scope we request from Google is used only for the following purpose:</p>
          <ul>
            <li>
              <code>https://www.googleapis.com/auth/gmail.readonly</code> — read incoming
              messages in the connected mailbox so ByteBack can display them in the unified
              inbox, classify replies with AI, and create CRM contacts and follow-up tasks.
              We never send, modify, delete, or archive messages.
            </li>
            <li>
              <code>https://www.googleapis.com/auth/userinfo.email</code> — identify which
              Google account the user connected, so we can label the mailbox in the app and
              prevent duplicate connections.
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

          <h2>5. Data retention and deletion</h2>
          <p>
            You can disconnect any email account at any time from{" "}
            <em>Settings → Email Sources</em>. When you disconnect an account, we revoke the
            OAuth token and delete stored messages for that account within 30 days.
          </p>
          <p>
            To delete your entire ByteBack account and all associated data, email{" "}
            <a href="mailto:privacy@byteback.digital">privacy@byteback.digital</a>. We will
            action deletion requests within 30 days.
          </p>

          <h2>6. Sharing your data</h2>
          <p>We share data only with subprocessors that help us operate the Service:</p>
          <ul>
            <li>Cloud hosting and database provider</li>
            <li>Google (Gmail API) — only for accounts you connect</li>
            <li>Lovable AI Gateway (LLM inference, zero retention)</li>
            <li>Transactional email provider for notifications</li>
          </ul>
          <p>
            We do not sell your personal data. We may disclose data if required by law or to
            protect the rights, safety, and property of ByteBack, our users, or the public.
          </p>

          <h2>7. Your rights</h2>
          <p>
            Subject to applicable law (including GDPR and CCPA), you have the right to access,
            correct, export, or delete your personal data. Contact{" "}
            <a href="mailto:privacy@byteback.digital">privacy@byteback.digital</a> to exercise
            these rights.
          </p>

          <h2>8. Children</h2>
          <p>The Service is not directed to individuals under 16 and we do not knowingly collect data from them.</p>

          <h2>9. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be announced in
            the app or by email at least 7 days before they take effect.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:privacy@byteback.digital">privacy@byteback.digital</a>.
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
