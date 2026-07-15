import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLink } from "@/components/brand";

const VERSION = "2.0";
const LAST_UPDATED = "July 15, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ByteBack" },
      {
        name: "description",
        content:
          "The enterprise Terms of Service governing use of the ByteBack Inbox AI platform, including Google Workspace and Microsoft 365 integrations.",
      },
      { property: "og:title", content: "Terms of Service — ByteBack" },
      {
        property: "og:description",
        content:
          "Enterprise Terms of Service for ByteBack Inbox AI — an AI-powered Unified Inbox and Customer Communication Platform.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED} · Version {VERSION}
        </p>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-p:leading-relaxed prose-a:text-brand">
          <p>
            These Terms of Service (the "Terms") are a binding legal agreement between you
            and ByteBack ("ByteBack", "we", "us", or "our") governing your access to and
            use of the ByteBack Inbox AI platform, mobile applications, APIs, and related
            services (collectively, the "Service"). By creating an account, accessing, or
            using the Service, you accept these Terms. If you do not agree, do not use the
            Service.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By registering an account, accessing, or otherwise using the Service, you
            confirm that you have read, understood, and agree to be bound by these Terms
            and by our <Link to="/privacy">Privacy Policy</Link>. If you are accepting
            these Terms on behalf of an organization, you represent that you have
            authority to bind that organization, and "you" refers to that organization.
          </p>

          <h2>2. Description of Services</h2>
          <p>
            ByteBack is an enterprise AI-powered Unified Inbox and Customer Communication
            Platform. The Service includes, without limitation:
          </p>
          <ul>
            <li>Unified Inbox across multiple connected mailboxes and domains</li>
            <li>AI Email Management, including summaries, prioritization, and drafting assistance</li>
            <li>Customer Relationship Management (CRM) with contact, deal, and pipeline records</li>
            <li>AI-powered email categorization of customer conversations</li>
            <li>AI Summaries of individual threads and daily/weekly activity</li>
            <li>Follow-up Tasks and Reminders</li>
            <li>Notifications across web, mobile, email, Slack, and Teams</li>
            <li>Team Collaboration, including internal notes, mentions, and assignments</li>
            <li>Google Workspace Integration (Gmail, Google Contacts, Google Calendar where enabled)</li>
            <li>Microsoft 365 Integration (Outlook, Exchange Online)</li>
            <li>Analytics on mailbox health, response time, inbox activity, and productivity metrics</li>
          </ul>
          <p>
            Features, availability, and pricing may evolve. We will announce material
            changes in advance in the app or by email.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You must be at least 16 years old and able to form a binding contract to use
            the Service. You are responsible for (a) keeping your login credentials
            confidential, (b) all activity that occurs under your account, and (c)
            promptly notifying us of any unauthorized access. We may refuse or terminate
            accounts at our reasonable discretion where required by law or these Terms.
          </p>

          <h2>4. Workspace Ownership</h2>
          <p>
            The Service is organized into workspaces. The user who creates a workspace is
            its initial Owner. The Owner controls billing, membership, roles, connected
            accounts, and workspace deletion. Owners may transfer ownership to another
            Admin. Members access the workspace only within the scope granted by the
            Owner.
          </p>

          <h2>5. Connected Email Accounts</h2>
          <p>
            You may connect email accounts, including Gmail, Google Workspace, Outlook,
            Microsoft 365, IMAP mailboxes, and other supported providers. You represent
            and warrant that:
          </p>
          <ul>
            <li>You are the authorized owner or administrator of each connected account, or have permission from that owner to connect it.</li>
            <li>Connecting the account does not violate the account provider's terms.</li>
            <li>You remain the owner of your Gmail, Google Workspace, Outlook, and Microsoft accounts and the data contained in them.</li>
          </ul>
          <p>
            ByteBack accesses authorized accounts only after your explicit consent, and
            only for the features you enable. You may disconnect any account at any time
            from <em>Settings → Email Sources</em> or <em>Account &amp; Data</em>.
          </p>

          <h2>6. Google API Services</h2>
          <p>
            The Service's use of Google APIs complies with the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer noopener"
            >
              Google API Services User Data Policy
            </a>
            , including the Google Workspace Limited Use Requirements. In particular:
          </p>
          <ul>
            <li>Google Workspace data is used only to provide user-facing features you enable in ByteBack.</li>
            <li>Google Workspace data is not sold and is not used to serve advertising.</li>
            <li>Google Workspace data is not used to train generalized AI/ML models.</li>
            <li>Humans do not read Google Workspace data except with your explicit permission, where required for security, to comply with law, or where data has been aggregated and anonymized.</li>
          </ul>

          <h2>7. Acceptable Use</h2>
          <p>You may not use the Service to:</p>
          <ul>
            <li>Send spam, unsolicited bulk email, or misleading messages</li>
            <li>Distribute malware, viruses, or other harmful code</li>
            <li>Conduct phishing, credential harvesting, or fraudulent activity</li>
            <li>Violate any applicable law or third-party rights</li>
            <li>Access accounts or data without proper authorization</li>
            <li>Reverse engineer, resell, or white-label the Service without a written agreement</li>
            <li>Interfere with, disrupt, or overload the Service or its infrastructure</li>
          </ul>

          <h2>8. AI Features</h2>
          <p>
            ByteBack provides AI-powered summaries, reply suggestions, categorization of
            customer conversations, and follow-up recommendations. AI inference is
            performed by authorized AI processing providers operating under zero-retention
            agreements. AI output may be inaccurate or incomplete; you remain solely
            responsible for reviewing, editing, and approving any content you send and
            for any decisions you make in reliance on AI output.
          </p>

          <h2>9. Payments</h2>
          <p>
            Paid plans are billed in advance on a recurring subscription basis in the
            currency shown at checkout. Subscriptions automatically renew for successive
            terms unless cancelled before the renewal date. Fees are non-refundable except
            where required by law. You are responsible for applicable taxes, duties, and
            similar governmental assessments. We may change pricing on at least 30 days'
            notice.
          </p>

          <h2>10. Data Ownership</h2>
          <p>
            As between you and ByteBack, you retain all rights, title, and interest in
            and to the emails, contacts, files, and other content you or your users bring
            into the Service ("Customer Data"). You grant ByteBack a limited,
            non-exclusive, worldwide license to host, process, transmit, and display
            Customer Data solely to provide, secure, and improve the Service for you.
          </p>

          <h2>11. Data Security</h2>
          <p>
            We implement administrative, physical, and technical safeguards designed to
            protect Customer Data. These include encryption in transit (TLS 1.2+),
            encryption at rest, encrypted storage of OAuth refresh tokens (AES-256-GCM),
            row-level tenant isolation, least-privilege access controls, audit logging,
            and periodic security reviews. Detailed information is available in our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>12. Suspension &amp; Termination</h2>
          <p>
            You may cancel your subscription and delete your account at any time from{" "}
            <em>Settings → Account &amp; Data</em>. We may suspend or terminate access if
            you materially breach these Terms, fail to pay fees, or where required by
            law. On termination we will delete Customer Data in accordance with the
            Privacy Policy and the retention windows described therein.
          </p>

          <h2>13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, neither ByteBack nor its affiliates,
            officers, employees, agents, suppliers, or licensors will be liable for any
            indirect, incidental, special, consequential, exemplary, or punitive damages,
            or for lost profits, revenue, goodwill, or data, arising out of or relating
            to these Terms or the Service. Our aggregate liability for any claim arising
            out of or relating to these Terms or the Service will not exceed the fees you
            paid us for the Service in the twelve (12) months preceding the event giving
            rise to the claim.
          </p>

          <h2>14. Disclaimer</h2>
          <p>
            The Service is provided "AS IS" and "AS AVAILABLE" without warranty of any
            kind, whether express, implied, or statutory, including implied warranties of
            merchantability, fitness for a particular purpose, title, and
            non-infringement. We do not warrant that the Service will be uninterrupted,
            error-free, or free of harmful components, or that any Customer Data will be
            secure or not otherwise lost, corrupted, or altered.
          </p>

          <h2>15. Third-Party Services</h2>
          <p>
            The Service integrates with third-party services, including Google, Microsoft,
            OpenAI and other AI providers, Stripe, Supabase, cloud hosting providers,
            transactional email providers, and analytics tools. Your use of these
            third-party services is governed by their own terms. ByteBack is not
            responsible for the availability, content, or practices of third-party
            services.
          </p>

          <h2>16. Intellectual Property</h2>
          <p>
            The Service, including all software, designs, trademarks, logos, and
            documentation, is owned by ByteBack and its licensors and is protected by
            intellectual property laws. Except for the limited rights expressly granted
            in these Terms, no rights are granted to you. Feedback you provide is
            licensed to us on a royalty-free, perpetual, irrevocable basis to improve
            the Service.
          </p>

          <h2>17. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India, without regard to
            conflict-of-laws principles. The courts located in New Delhi, India will have
            exclusive jurisdiction over disputes arising out of or relating to these
            Terms or the Service, except that either party may seek injunctive relief in
            any court of competent jurisdiction.
          </p>

          <h2>18. Contact Information</h2>
          <p>
            ByteBack<br />
            Email:{" "}
            <a href="mailto:info@byteback.co.in">info@byteback.co.in</a>
            <br />
            Support:{" "}
            <a href="mailto:support@byteback.digital">support@byteback.digital</a>
            <br />
            Privacy:{" "}
            <a href="mailto:privacy@byteback.digital">privacy@byteback.digital</a>
            <br />
            Phone: <a href="tel:+919717513277">+91 97175 13277</a>
            <br />
            Address: New Delhi, India
          </p>

          <h2>19. Changes</h2>
          <p>
            We may update these Terms from time to time. Material changes will be
            announced in advance. Continued use of the Service after changes take effect
            constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <span>Last Updated: {LAST_UPDATED}</span>
          <span className="mx-2">·</span>
          <span>Version {VERSION}</span>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
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
