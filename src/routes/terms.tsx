import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLink } from "@/components/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ByteBack" },
      {
        name: "description",
        content:
          "The terms and conditions that govern your use of the ByteBack Inbox AI platform.",
      },
      { property: "og:title", content: "Terms of Service — ByteBack" },
      {
        property: "og:description",
        content:
          "The terms and conditions that govern your use of the ByteBack Inbox AI platform.",
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 10, 2026</p>

        <div className="prose prose-sm mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-p:leading-relaxed prose-a:text-brand">
          <p>
            These Terms of Service ("Terms") govern your access to and use of ByteBack Inbox AI
            (the "Service"), operated by ByteBack ("we", "us", "our"). By creating an account
            or using the Service you agree to these Terms. If you do not agree, do not use the
            Service.
          </p>

          <h2>1. Eligibility and account</h2>
          <p>
            You must be at least 16 years old and able to form a binding contract. You are
            responsible for keeping your login credentials confidential and for all activity
            that occurs under your account.
          </p>

          <h2>2. The Service</h2>
          <p>
            ByteBack provides a unified inbox that ingests replies from connected email
            accounts and third-party sending tools, classifies them with AI, and organizes them
            into a CRM, pipeline, and task workflow. Features and pricing may change over time;
            material changes will be announced in advance.
          </p>

          <h2>3. Connected accounts</h2>
          <p>
            You may connect email accounts (e.g. Gmail, Outlook, IMAP) and other services to
            ByteBack. You represent that you have authority to connect these accounts and that
            doing so does not violate any third-party terms. You may disconnect an account at
            any time from <em>Settings → Email Sources</em>.
          </p>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for unlawful, harmful, or fraudulent activity</li>
            <li>Send spam, phishing messages, or unsolicited bulk email through connected accounts</li>
            <li>Attempt to reverse engineer, disrupt, or overload the Service</li>
            <li>Upload malware or scrape data outside API limits</li>
            <li>Resell or white-label the Service without a written agreement</li>
          </ul>

          <h2>5. Your content</h2>
          <p>
            You retain all rights to email content, contact data, and other information you
            bring into the Service ("Customer Data"). You grant us a limited license to
            process Customer Data solely to provide, secure, and improve the Service for you.
            We do not use Customer Data to train AI models. See our{" "}
            <Link to="/privacy">Privacy Policy</Link> for details.
          </p>

          <h2>6. AI features</h2>
          <p>
            ByteBack uses large language models to classify replies and generate suggestions.
            AI output can be incorrect. You are responsible for reviewing AI-generated
            classifications, tasks, and drafts before acting on them.
          </p>

          <h2>7. Fees</h2>
          <p>
            Paid plans are billed in advance on a subscription basis. Fees are non-refundable
            except where required by law. We may change pricing on 30 days' notice.
          </p>

          <h2>8. Termination</h2>
          <p>
            You may cancel your account at any time. We may suspend or terminate access if you
            breach these Terms or if required by law. On termination we will delete your data
            in accordance with our Privacy Policy.
          </p>

          <h2>9. Warranty disclaimer</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            express or implied, including merchantability, fitness for a particular purpose,
            and non-infringement.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, ByteBack will not be liable for indirect,
            incidental, special, consequential, or punitive damages, or for lost profits,
            revenue, or data. Our aggregate liability arising out of or relating to the Service
            will not exceed the amount you paid us in the 12 months preceding the claim.
          </p>

          <h2>11. Indemnity</h2>
          <p>
            You will defend and indemnify ByteBack against claims arising from your Customer
            Data, your use of the Service, or your violation of these Terms.
          </p>

          <h2>12. Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after
            changes take effect constitutes acceptance of the updated Terms.
          </p>

          <h2>13. Governing law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which ByteBack is
            established, without regard to conflict-of-laws principles.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
            <a href="mailto:legal@byteback.digital">legal@byteback.digital</a>.
          </p>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </main>
    </div>
  );
}
