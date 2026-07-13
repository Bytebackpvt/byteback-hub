import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { disconnectAllAccounts, deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/app/settings/account")({
  head: () => ({
    meta: [
      { title: "Account & Data — ByteBack" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Disconnect your Google/Gmail account or permanently delete your ByteBack account and all associated data.",
      },
    ],
  }),
  component: AccountSettingsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load: {String(error)}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function AccountSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const disconnectFn = useServerFn(disconnectAllAccounts);
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: (r) => {
      toast.success(`Disconnected ${r.disconnected} account(s). Google tokens revoked.`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn(),
    onSuccess: async (r) => {
      if (!r.ok) {
        toast.error(r.error ?? "Failed to delete account");
        return;
      }
      toast.success("Your account and all data have been permanently deleted.");
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Account &amp; data</h1>
        <p className="text-sm text-muted-foreground">
          Manage your connected accounts and permanently delete your ByteBack account.
        </p>
      </div>

      {/* Disconnect Google */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            <div>
              <CardTitle>Disconnect Google / Gmail</CardTitle>
              <CardDescription>
                Revoke ByteBack's access to every connected Google account. We call
                Google's OAuth revoke endpoint, delete the stored refresh token, and stop
                all Gmail syncing immediately. Your ByteBack account stays active.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Tokens revoked at <code>oauth2.googleapis.com/revoke</code></li>
            <li>All OAuth connection rows deleted from our database</li>
            <li>Historic emails synced before disconnect are purged within 30 days</li>
            <li>You can reconnect anytime from Email Sources</li>
          </ul>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Disconnect all connected Google accounts?")) disconnectMut.mutate();
            }}
            disabled={disconnectMut.isPending}
          >
            {disconnectMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldOff className="mr-2 h-4 w-4" />
            )}
            Disconnect all Google accounts
          </Button>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Delete account</CardTitle>
              <CardDescription>
                Permanently delete your ByteBack account and every piece of data associated
                with it. This action cannot be undone.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="font-medium text-destructive">What gets deleted</div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Your login (auth user) — you will be signed out everywhere</li>
              <li>All connected Gmail / OAuth tokens (revoked with Google first)</li>
              <li>All workspaces you own — including emails, contacts, tasks, notes,
                pipeline, notifications, and AI embeddings</li>
              <li>Your membership in any shared workspaces</li>
            </ul>
            <div className="mt-2 text-xs text-muted-foreground">
              Deletion is immediate and irreversible. Backups are purged within 30 days.
            </div>
          </div>

          {!showDelete ? (
            <Button variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete my account
            </Button>
          ) : (
            <div className="space-y-2 rounded-md border border-destructive/40 p-3">
              <Label htmlFor="confirm" className="text-sm">
                Type <b>DELETE</b> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={confirmText !== "DELETE" || deleteMut.isPending}
                  onClick={() => deleteMut.mutate()}
                >
                  {deleteMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Permanently delete
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDelete(false);
                    setConfirmText("");
                  }}
                  disabled={deleteMut.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Prefer email? Send a deletion request to{" "}
        <a className="underline" href="mailto:privacy@byteback.digital">
          privacy@byteback.digital
        </a>{" "}
        — we action requests within 30 days.
      </p>
    </div>
  );
}
