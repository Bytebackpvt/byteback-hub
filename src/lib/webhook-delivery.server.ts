import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type NotifPayload = {
  kind: string;
  title: string;
  body: string;
  link: string | null;
};

/**
 * Fan out a notification to all connected outbound webhooks for a workspace
 * (Slack + Zapier). Silent on failures — this is best-effort delivery.
 */
export async function deliverToWebhooks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  notifications: NotifPayload[],
): Promise<void> {
  if (notifications.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("workspace_integrations")
    .select("provider, secret, status")
    .eq("workspace_id", workspaceId)
    .in("provider", ["slack_webhook", "zapier_webhook"])
    .eq("status", "connected");
  const hooks = (data ?? []) as Array<{ provider: string; secret: string | null }>;
  if (hooks.length === 0) return;

  await Promise.all(
    hooks.flatMap((hook) => {
      const url = hook.secret;
      if (!url) return [];
      return notifications.map((n) => {
        const body =
          hook.provider === "slack_webhook"
            ? JSON.stringify({
                text: `*${n.title}*\n${n.body}${n.link ? `\n${n.link}` : ""}`,
              })
            : JSON.stringify({
                event: `byteback.${n.kind}`,
                title: n.title,
                body: n.body,
                link: n.link,
                ts: new Date().toISOString(),
              });
        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }).catch(() => undefined);
      });
    }),
  );
}
