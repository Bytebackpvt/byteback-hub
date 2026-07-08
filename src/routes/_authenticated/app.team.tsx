import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Mail, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  cancelInvite,
  inviteMember,
  listTeam,
  removeMember,
  updateMemberRole,
  type MemberRow,
  type InviteRow,
} from "@/lib/team.functions";

type Role = "owner" | "admin" | "member" | "viewer";

const ROLE_DESC: Record<Role, string> = {
  owner: "Full control, billing, delete workspace",
  admin: "Manage team, email accounts, and workspace settings",
  member: "Create and edit tasks, leads, and inbox actions",
  viewer: "Read-only access to everything",
};

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({
    meta: [
      { title: "Team & Roles — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const callList = useServerFn(listTeam);
  const callInvite = useServerFn(inviteMember);
  const callUpdate = useServerFn(updateMemberRole);
  const callRemove = useServerFn(removeMember);
  const callCancel = useServerFn(cancelInvite);

  const qc = useQueryClient();
  const teamQuery = useQuery({ queryKey: ["team"], queryFn: () => callList() });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const inviteMut = useMutation({
    mutationFn: () => callInvite({ data: { email: inviteEmail.trim(), role: inviteRole } }),
    onSuccess: (res) => {
      toast.success(
        res.added
          ? "Teammate added to workspace."
          : res.emailed
          ? "Invitation email sent."
          : "Invite saved — email couldn't be delivered, share the signup link manually.",
      );

      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to invite"),
  });

  const updateMut = useMutation({
    mutationFn: (v: { memberId: string; role: Role }) => callUpdate({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update role"),
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => callRemove({ data: { memberId } }),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove"),
  });

  const cancelMut = useMutation({
    mutationFn: (inviteId: string) => callCancel({ data: { inviteId } }),
    onSuccess: () => {
      toast.success("Invite cancelled");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to cancel"),
  });

  const data = teamQuery.data;
  const isAdmin = data?.myRole === "owner" || data?.myRole === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team & Roles</h1>
        <p className="text-sm text-muted-foreground">
          Control who can see and act on your workspace data.
        </p>
      </header>

      {isAdmin && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" /> Invite teammate
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              inviteMut.mutate();
            }}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <div className="min-w-0">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMut.isPending}>
              {inviteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {ROLE_DESC[inviteRole]}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-card">
        <header className="flex items-center gap-2 border-b border-border/60 p-4 text-sm font-semibold">
          <Users className="h-4 w-4" /> Members
          {data?.members && <span className="text-muted-foreground">({data.members.length})</span>}
        </header>
        {teamQuery.isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {(data?.members ?? []).map((m) => (
              <MemberRowUI
                key={m.id}
                member={m}
                canManage={isAdmin}
                myRole={data?.myRole ?? null}
                onRoleChange={(role) => updateMut.mutate({ memberId: m.id, role })}
                onRemove={() => {
                  if (confirm(`Remove ${m.full_name || m.email || "this member"} from the workspace?`)) {
                    removeMut.mutate(m.id);
                  }
                }}
                busy={updateMut.isPending || removeMut.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (data?.invites?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card">
          <header className="flex items-center gap-2 border-b border-border/60 p-4 text-sm font-semibold">
            <Mail className="h-4 w-4" /> Pending invites
          </header>
          <ul className="divide-y divide-border/50">
            {(data?.invites ?? []).map((i: InviteRow) => (
              <li key={i.id} className="flex items-center gap-3 p-4">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{i.email}</div>
                  <div className="text-xs capitalize text-muted-foreground">{i.role} · pending sign-up</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelMut.mutate(i.id)}
                  disabled={cancelMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-muted/40 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4" /> Role permissions
        </div>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          {(Object.keys(ROLE_DESC) as Role[]).map((r) => (
            <div key={r} className="rounded-lg border border-border/50 bg-background p-3">
              <dt className="text-sm font-medium capitalize">{r}</dt>
              <dd className="mt-0.5 text-muted-foreground">{ROLE_DESC[r]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function MemberRowUI({
  member,
  canManage,
  myRole,
  onRoleChange,
  onRemove,
  busy,
}: {
  member: MemberRow;
  canManage: boolean;
  myRole: Role | null;
  onRoleChange: (role: Role) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const initials =
    (member.full_name || member.email || "?")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  const isOwner = member.role === "owner";
  // Admins cannot edit other admins or the owner; owner can edit anyone except themselves' role
  const canEditRole =
    canManage &&
    !isOwner &&
    !(myRole === "admin" && member.role === "admin");

  return (
    <li className="flex items-center gap-3 p-4">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name ?? member.email ?? ""} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {member.full_name || member.email || "Unnamed"}
        </div>
        {member.full_name && member.email && (
          <div className="truncate text-xs text-muted-foreground">{member.email}</div>
        )}
      </div>
      {canEditRole ? (
        <Select
          value={member.role}
          onValueChange={(v) => onRoleChange(v as Role)}
          disabled={busy}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
            isOwner ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
          )}
        >
          {member.role}
        </span>
      )}
      {canManage && !isOwner && (
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={busy} aria-label={`Remove ${member.email ?? "member"}`} title="Remove member">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </li>
  );
}
