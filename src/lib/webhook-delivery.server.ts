import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type NotifPayload = {
  kind: string;
  title: string;
  body: string;
  link: string | null;
};

const WEBHOOK_PROVIDERS = [
  "slack_webhook",
  "teams_webhook",
  "discord_webhook",
  "generic_webhook",
  "zapier_webhook",
] as const;

function formatPayload(provider: string, n: NotifPayload): string {
  const linkLine = n.link ? `\n${n.link}` : "";
  switch (provider) {
    case "slack_webhook":
    case "teams_webhook":
      return JSON.stringify({ text: `*${n.title}*\n${n.body}${linkLine}` });
    case "discord_webhook":
      return JSON.stringify({ content: `**${n.title}**\n${n.body}${linkLine}` });
    default:
      return JSON.stringify({
        event: `byteback.${n.kind}`,
        title: n.title,
        body: n.body,
        link: n.link,
        ts: new Date().toISOString(),
      });
  }
}

/**
 * Fan out a notification to all connected outbound webhooks for a workspace.
 * Silent on failures — best-effort delivery.
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
    .in("provider", WEBHOOK_PROVIDERS as unknown as string[])
    .eq("status", "connected");
  const hooks = (data ?? []) as Array<{ provider: string; secret: string | null }>;
  if (hooks.length === 0) return;

  await Promise.all(
    hooks.flatMap((hook) => {
      const url = hook.secret;
      if (!url) return [];
      return notifications.map((n) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: formatPayload(hook.provider, n),
        }).catch(() => undefined),
      );
    }),
  );
}
