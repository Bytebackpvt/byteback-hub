// Universal provider registry. Adding a new integration = one entry here.
// Kept in a client-safe module so both server fns and the UI can import it.

export type AuthKind = "oauth" | "api_key" | "webhook_out" | "webhook_in" | "builtin";
export type Capability =
  | "ingest_email"
  | "send_email"
  | "crm_sync"
  | "notify"
  | "sheets"
  | "storage"
  | "calendar";

export type FieldSpec = {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  type: "text" | "password" | "url" | "email";
  secret?: boolean; // stored in `secret` column (encrypted). Otherwise stored in `config`.
  required?: boolean;
  pattern?: string;
};

export type ProviderEntry = {
  id: string; // stable id, also used as workspace_integrations.provider
  name: string;
  tagline: string;
  category:
    | "email"
    | "cold_email"
    | "crm"
    | "chat"
    | "calendar"
    | "storage"
    | "ai"
    | "automation"
    | "sheets";
  logo_slug: string | null; // simpleicons slug
  status: "live" | "beta" | "coming_soon";
  auth_kind: AuthKind;
  capabilities: Capability[];
  fields: FieldSpec[]; // empty for oauth / builtin
  docs_url?: string;
  connect_hint?: string; // one-liner shown above the form
  // Optional external connect URL for oauth providers we hand off to existing flows.
  oauth_route?: string;
};

export const PROVIDER_REGISTRY: ProviderEntry[] = [
  // ============ Cold email ============
  {
    id: "instantly",
    name: "Instantly",
    tagline: "Sync replies from your Instantly cold-email campaigns.",
    category: "cold_email",
    logo_slug: null,
    status: "live",
    auth_kind: "api_key",
    capabilities: ["ingest_email"],
    fields: [
      {
        key: "api_key",
        label: "Instantly API key",
        placeholder: "instantly_ai_...",
        type: "password",
        secret: true,
        required: true,
        help: "Instantly → Settings → Integrations → API. Requires a v2 API key.",
      },
    ],
    docs_url: "https://developer.instantly.ai/",
    connect_hint: "Paste your Instantly v2 API key. We'll pull replies into your inbox.",
  },
  {
    id: "smartlead",
    name: "Smartlead",
    tagline: "Import replies + campaign stats from Smartlead.",
    category: "cold_email",
    logo_slug: null,
    status: "beta",
    auth_kind: "api_key",
    capabilities: ["ingest_email"],
    fields: [
      { key: "api_key", label: "Smartlead API key", type: "password", secret: true, required: true },
    ],
    docs_url: "https://api.smartlead.ai/reference",
  },
  {
    id: "apollo",
    name: "Apollo.io",
    tagline: "Enrich contacts and sync sequences.",
    category: "cold_email",
    logo_slug: "apollographql",
    status: "beta",
    auth_kind: "api_key",
    capabilities: ["crm_sync"],
    fields: [
      { key: "api_key", label: "Apollo API key", type: "password", secret: true, required: true },
    ],
    docs_url: "https://docs.apollo.io/reference",
  },

  // ============ Email (OAuth) ============
  {
    id: "gmail",
    name: "Gmail",
    tagline: "Connect any Gmail or Google Workspace mailbox.",
    category: "email",
    logo_slug: "gmail",
    status: "live",
    auth_kind: "oauth",
    capabilities: ["ingest_email", "send_email"],
    fields: [],
    oauth_route: "/app/email-sources",
    connect_hint: "One-click OAuth. We only read + label mail you already receive.",
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    tagline: "Connect Outlook and Microsoft 365 mailboxes.",
    category: "email",
    logo_slug: "microsoftoutlook",
    status: "coming_soon",
    auth_kind: "oauth",
    capabilities: ["ingest_email", "send_email"],
    fields: [],
  },

  // ============ CRM ============
  {
    id: "hubspot",
    name: "HubSpot",
    tagline: "Two-way sync of contacts, companies and deals.",
    category: "crm",
    logo_slug: "hubspot",
    status: "beta",
    auth_kind: "api_key",
    capabilities: ["crm_sync"],
    fields: [
      {
        key: "api_key",
        label: "Private App token",
        type: "password",
        secret: true,
        required: true,
        help: "HubSpot → Settings → Integrations → Private Apps.",
      },
    ],
    docs_url: "https://developers.hubspot.com/docs/api/private-apps",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    tagline: "Push replied leads into your Pipedrive pipeline.",
    category: "crm",
    logo_slug: "pipedrive",
    status: "beta",
    auth_kind: "api_key",
    capabilities: ["crm_sync"],
    fields: [
      { key: "api_key", label: "Pipedrive API token", type: "password", secret: true, required: true },
      { key: "company_domain", label: "Company domain", placeholder: "yourco", type: "text", required: true, help: "The subdomain in your Pipedrive URL." },
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    tagline: "Enterprise CRM sync.",
    category: "crm",
    logo_slug: "salesforce",
    status: "coming_soon",
    auth_kind: "oauth",
    capabilities: ["crm_sync"],
    fields: [],
  },

  // ============ Chat / notify ============
  {
    id: "slack",
    name: "Slack",
    tagline: "Get lead alerts in a Slack channel.",
    category: "chat",
    logo_slug: "slack",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      {
        key: "webhook_url",
        label: "Incoming webhook URL",
        placeholder: "https://hooks.slack.com/services/...",
        type: "url",
        secret: true,
        required: true,
        help: "Slack → Apps → Incoming Webhooks → Add to workspace.",
      },
      { key: "channel_label", label: "Channel (for your reference)", placeholder: "#leads", type: "text" },
    ],
    docs_url: "https://api.slack.com/messaging/webhooks",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    tagline: "Post lead alerts to a Teams channel.",
    category: "chat",
    logo_slug: "microsoftteams",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "Incoming webhook URL", type: "url", secret: true, required: true },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    tagline: "Notify a Discord channel on hot replies.",
    category: "chat",
    logo_slug: "discord",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", secret: true, required: true },
    ],
  },

  // ============ Automation ============
  {
    id: "zapier",
    name: "Zapier",
    tagline: "Trigger any Zap from ByteBack events.",
    category: "automation",
    logo_slug: "zapier",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "Zapier catch-hook URL", type: "url", secret: true, required: true },
    ],
  },
  {
    id: "generic_webhook",
    name: "Custom webhook",
    tagline: "POST every event to any HTTPS endpoint.",
    category: "automation",
    logo_slug: null,
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "Endpoint URL", type: "url", secret: true, required: true },
      { key: "signing_secret", label: "Signing secret (optional)", type: "password", secret: false, help: "Sent as x-byteback-signature header (HMAC-SHA256)." },
    ],
  },
  {
    id: "make",
    name: "Make (Integromat)",
    tagline: "Route ByteBack events into any Make scenario.",
    category: "automation",
    logo_slug: "make",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "Make webhook URL", type: "url", secret: true, required: true },
    ],
  },
  {
    id: "n8n",
    name: "n8n",
    tagline: "Send events to a self-hosted or cloud n8n workflow.",
    category: "automation",
    logo_slug: "n8n",
    status: "live",
    auth_kind: "webhook_out",
    capabilities: ["notify"],
    fields: [
      { key: "webhook_url", label: "n8n webhook URL", type: "url", secret: true, required: true },
    ],
  },

  // ============ Sheets / storage ============
  {
    id: "google_sheets",
    name: "Google Sheets",
    tagline: "Mirror replies + leads to a spreadsheet in real time.",
    category: "sheets",
    logo_slug: "googlesheets",
    status: "beta",
    auth_kind: "oauth",
    capabilities: ["sheets"],
    fields: [],
    oauth_route: "/app/integrations/webhooks",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    tagline: "Attach files from Drive to threads.",
    category: "storage",
    logo_slug: "googledrive",
    status: "coming_soon",
    auth_kind: "oauth",
    capabilities: ["storage"],
    fields: [],
  },

  // ============ Inbound webhook ============
  {
    id: "inbound_email",
    name: "Inbound email webhook",
    tagline: "Forward mail from any provider by posting to our endpoint.",
    category: "email",
    logo_slug: null,
    status: "live",
    auth_kind: "webhook_in",
    capabilities: ["ingest_email"],
    fields: [],
    connect_hint: "Copy the inbound URL below into your provider's mail-forwarding webhook.",
  },
];

export function getProvider(id: string): ProviderEntry | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}

export function providersByCategory(): Record<string, ProviderEntry[]> {
  const out: Record<string, ProviderEntry[]> = {};
  for (const p of PROVIDER_REGISTRY) (out[p.category] ??= []).push(p);
  return out;
}
