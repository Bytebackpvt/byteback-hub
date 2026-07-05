import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Users, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/stores/onboarding";

export const Route = createFileRoute("/onboarding/team")({
  component: TeamStep,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function TeamStep() {
  const navigate = useNavigate();
  const { invites, addInvite, removeInvite } = useOnboarding();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const v = value.trim();
    if (!v) return;
    if (!EMAIL_RE.test(v)) {
      setError("That doesn't look like a valid email.");
      return;
    }
    addInvite(v);
    setValue("");
    setError(null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invite your team</h1>
          <p className="text-sm text-muted-foreground">
            Add teammates who reply to leads. You can invite more later.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="invite">Team member emails</Label>
        <Input
          id="invite"
          placeholder="teammate@company.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={onKey}
          onBlur={commit}
          className="mt-1.5"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          Press Enter or comma to add. Skip for now if you're setting up solo.
        </p>
      </div>

      {invites.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {invites.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs"
            >
              {e}
              <button
                aria-label={`Remove ${e}`}
                onClick={() => removeInvite(e)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/onboarding/workspace" })}
          className="rounded-lg"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/onboarding/email-accounts" })}
            className="rounded-lg"
          >
            Skip
          </Button>
          <Button
            onClick={() => navigate({ to: "/onboarding/email-accounts" })}
            className="rounded-lg"
          >
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
