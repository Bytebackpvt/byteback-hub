import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getInviteByToken, acceptInvite } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [{ title: "Join workspace — ByteBack" }, { name: "robots", content: "noindex" }],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const fetchInvite = useServerFn(getInviteByToken);
  const doAccept = useServerFn(acceptInvite);
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  const inviteQ = useQuery({
    queryKey: ["invite", token],
    queryFn: () => fetchInvite({ data: { token } }),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessionEmail(s?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const invite = inviteQ.data;
  const loading = inviteQ.isLoading || sessionEmail === undefined;

  async function handleAccept() {
    setAccepting(true);
    try {
      await doAccept({ data: { token } });
      toast.success("Welcome to the team!");
      router.invalidate();
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/40">
      <Card className="w-full max-w-md p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !invite?.found ? (
          <div className="text-center space-y-3">
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Invite not found</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has been revoked.
            </p>
            <Link to="/" className="text-sm underline">Back to home</Link>
          </div>
        ) : invite.acceptedAt ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
            <h1 className="text-xl font-semibold">Already accepted</h1>
            <p className="text-sm text-muted-foreground">This invite has already been used.</p>
            <Link to="/app" className="text-sm underline">Go to app</Link>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <Mail className="h-10 w-10 mx-auto text-brand" />
              <h1 className="text-xl font-semibold">Join {invite.workspaceName}</h1>
              <p className="text-sm text-muted-foreground">
                You've been invited as <b>{invite.role}</b> to{" "}
                <b>{invite.workspaceName}</b> on ByteBack.
              </p>
              <p className="text-xs text-muted-foreground">
                Invite sent to <b>{invite.email}</b>
              </p>
            </div>

            {sessionEmail === null ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Sign in as <b>{invite.email}</b> to accept this invite.
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    window.location.href = `/auth?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`;
                  }}
                >
                  Sign in / Sign up
                </Button>
              </div>
            ) : sessionEmail.toLowerCase() !== invite.email.toLowerCase() ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-destructive">
                  You're signed in as <b>{sessionEmail}</b>, but this invite is for{" "}
                  <b>{invite.email}</b>.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  Sign out and try again
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept invite"}
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
