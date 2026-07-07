import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, PartyPopper, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/stores/onboarding";
import { finishOnboarding } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/onboarding/done")({
  component: DoneStep,
});

function DoneStep() {
  const navigate = useNavigate();
  const { workspaceName, workspaceSlug, invites, accounts, businessType, reset } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const finish = useServerFn(finishOnboarding);

  const goDashboard = async () => {
    setSaving(true);
    try {
      await finish({
        data: {
          workspaceName: workspaceName || "My Workspace",
          workspaceSlug: workspaceSlug || "",
          businessType: businessType || "",
          invites,
          accounts: accounts.map((a) => ({ provider: a.provider, email: a.email })),
        },
      });
      reset();
      toast.success("Workspace ready. Welcome to ByteBack.");
      navigate({ to: "/app" });
    } catch (err) {
      const anyErr = err as { message?: string; details?: string; hint?: string } | null;
      const msg =
        anyErr?.message ||
        anyErr?.details ||
        anyErr?.hint ||
        (typeof err === "string" ? err : "Could not finish setup");
      console.error("Onboarding finish error:", err);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/30"
      >
        <PartyPopper className="h-6 w-6" />
      </motion.div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        {workspaceName ? `${workspaceName} is ready.` : "You're all set."}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your unified inbox is warm. AI classification is live.
      </p>

      <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2 text-left">
        <div className="rounded-lg border border-border/70 bg-background p-3">
          <div className="text-xl font-semibold">{accounts.length}</div>
          <div className="text-[11px] text-muted-foreground">Mailboxes</div>
        </div>
        <div className="rounded-lg border border-border/70 bg-background p-3">
          <div className="text-xl font-semibold">{invites.length + 1}</div>
          <div className="text-[11px] text-muted-foreground">Teammates</div>
        </div>
        <div className="rounded-lg border border-border/70 bg-background p-3">
          <div className="text-xl font-semibold">{businessType ? "✓" : "—"}</div>
          <div className="text-[11px] text-muted-foreground">AI tuned</div>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-sm items-start gap-2 rounded-lg bg-muted/50 p-3 text-left text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        <span>
          Tomorrow at 8 AM you'll get your first AI daily summary of every reply across every
          mailbox.
        </span>
      </div>

      <Button className="mt-6 rounded-lg px-5" size="lg" onClick={goDashboard} disabled={saving}>
        {saving ? "Setting up…" : "Enter ByteBack"} <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
