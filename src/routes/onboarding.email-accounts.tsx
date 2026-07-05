import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Inbox, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnboarding, type ConnectedAccount } from "@/stores/onboarding";

export const Route = createFileRoute("/onboarding/email-accounts")({
  component: EmailAccountsStep,
});

const PROVIDERS: {
  id: ConnectedAccount["provider"];
  name: string;
  desc: string;
  color: string;
}[] = [
  { id: "google-workspace", name: "Google Workspace", desc: "Domains on Google", color: "bg-red-500/10 text-red-500" },
  { id: "gmail", name: "Gmail", desc: "Personal Gmail address", color: "bg-orange-500/10 text-orange-500" },
  { id: "microsoft-365", name: "Microsoft 365", desc: "Business Microsoft", color: "bg-blue-500/10 text-blue-500" },
  { id: "outlook", name: "Outlook", desc: "outlook.com / hotmail", color: "bg-sky-500/10 text-sky-500" },
  { id: "imap", name: "IMAP", desc: "Any IMAP inbox", color: "bg-emerald-500/10 text-emerald-500" },
  { id: "smtp", name: "SMTP", desc: "Sending server", color: "bg-purple-500/10 text-purple-500" },
];

function EmailAccountsStep() {
  const navigate = useNavigate();
  const { accounts, addAccount, removeAccount } = useOnboarding();
  const [pending, setPending] = useState<(typeof PROVIDERS)[number] | null>(null);
  const [email, setEmail] = useState("");

  const connect = () => {
    if (!pending || !email.trim()) return;
    addAccount({
      id: `${pending.id}-${Date.now()}`,
      provider: pending.id,
      email: email.trim(),
    });
    toast.success(`${pending.name} connected`, { description: email.trim() });
    setPending(null);
    setEmail("");
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Connect email accounts</h1>
          <p className="text-sm text-muted-foreground">
            Add every mailbox your replies land in. You can add more anytime.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPending(p)}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition hover:border-brand/50 hover:bg-accent"
          >
            <div className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold ${p.color}`}>
              {p.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.desc}</div>
            </div>
            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </button>
        ))}
      </div>

      {accounts.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connected ({accounts.length})
          </div>
          <div className="space-y-2">
            {accounts.map((a) => {
              const p = PROVIDERS.find((x) => x.id === a.provider)!;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-background p-2.5"
                >
                  <Check className="h-4 w-4 text-success" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.email}</div>
                    <div className="text-xs text-muted-foreground">{p.name}</div>
                  </div>
                  <button
                    aria-label="Remove"
                    onClick={() => removeAccount(a.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate({ to: "/onboarding/team" })} className="rounded-lg">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/onboarding/business-type" })}
            className="rounded-lg"
          >
            Skip
          </Button>
          <Button
            onClick={() => navigate({ to: "/onboarding/business-type" })}
            className="rounded-lg"
          >
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {pending?.name}</DialogTitle>
            <DialogDescription>
              Enter the email address for this mailbox. In production we'll open the secure OAuth
              flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="connect-email">Email address</Label>
            <Input
              id="connect-email"
              type="email"
              placeholder="sales@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={connect} disabled={!email.trim()}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
