import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/stores/onboarding";

export const Route = createFileRoute("/onboarding/business-type")({
  component: BusinessTypeStep,
});

const TYPES = [
  { id: "it", label: "IT Company", emoji: "💻" },
  { id: "agency", label: "Agency", emoji: "🎯" },
  { id: "healthcare", label: "Healthcare", emoji: "🩺" },
  { id: "manufacturing", label: "Manufacturing", emoji: "🏭" },
  { id: "itad", label: "ITAD", emoji: "♻️" },
  { id: "refurb", label: "Refurbished Laptops", emoji: "💾" },
  { id: "rental", label: "Rental", emoji: "📦" },
  { id: "other", label: "Other", emoji: "✨" },
];

function BusinessTypeStep() {
  const navigate = useNavigate();
  const { businessType, setBusinessType } = useOnboarding();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">What best describes your business?</h1>
          <p className="text-sm text-muted-foreground">
            We'll tune AI classification for your industry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {TYPES.map((t) => {
          const active = businessType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setBusinessType(t.id)}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center text-sm transition ${
                active
                  ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                  : "border-border/70 bg-background hover:border-brand/50 hover:bg-accent"
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/onboarding/email-accounts" })}
          className="rounded-lg"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={() => navigate({ to: "/onboarding/done" })}
          disabled={!businessType}
          className="rounded-lg"
        >
          Continue <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
