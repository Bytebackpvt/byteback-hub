import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/stores/onboarding";

export const Route = createFileRoute("/onboarding/workspace")({
  component: WorkspaceStep,
});

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function WorkspaceStep() {
  const navigate = useNavigate();
  const { workspaceName, workspaceSlug, setWorkspace } = useOnboarding();
  const [name, setName] = useState(workspaceName);
  const [slug, setSlug] = useState(workspaceSlug);
  const [touchedSlug, setTouchedSlug] = useState(!!workspaceSlug);

  useEffect(() => {
    if (!touchedSlug) setSlug(slugify(name));
  }, [name, touchedSlug]);

  const canContinue = name.trim().length > 1;

  const next = () => {
    setWorkspace(name.trim(), slug || slugify(name));
    navigate({ to: "/onboarding/team" });
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="text-sm text-muted-foreground">
            One workspace per company. You can invite teammates next.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input
            id="ws-name"
            placeholder="Acme Outreach"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="ws-slug">Workspace URL</Label>
          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border border-input">
            <span className="grid place-items-center bg-muted px-3 text-sm text-muted-foreground">
              byteback.ai/
            </span>
            <Input
              id="ws-slug"
              value={slug}
              onChange={(e) => {
                setTouchedSlug(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="acme"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} disabled={!canContinue} className="rounded-lg">
          Continue <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
