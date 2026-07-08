import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

/** Return the current workspace's inbound webhook token + URL bases. */
export const getInboundInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { workspaceId: null, token: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("workspaces")
      .select("id, name, inbound_token")
      .eq("id", workspaceId)
      .maybeSingle();
    return {
      workspaceId,
      name: data?.name ?? null,
      token: (data?.inbound_token as string | null) ?? null,
    };
  });
