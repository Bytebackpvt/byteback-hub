
-- 1. Integration catalog (public read, admin-managed content)
CREATE TABLE public.integration_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  category TEXT NOT NULL,
  logo_slug TEXT,
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live','beta','coming_soon')),
  auth_type TEXT NOT NULL DEFAULT 'oauth' CHECK (auth_type IN ('oauth','api_key','webhook','builtin')),
  docs_url TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_catalog TO anon, authenticated;
GRANT ALL ON public.integration_catalog TO service_role;
ALTER TABLE public.integration_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog readable by anyone" ON public.integration_catalog FOR SELECT USING (true);
CREATE TRIGGER trg_integration_catalog_updated_at BEFORE UPDATE ON public.integration_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Integration waitlist requests
CREATE TABLE public.integration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES public.integration_catalog(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_id)
);
GRANT SELECT, INSERT, DELETE ON public.integration_requests TO authenticated;
GRANT ALL ON public.integration_requests TO service_role;
ALTER TABLE public.integration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members view requests" ON public.integration_requests
  FOR SELECT TO authenticated
  USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role,'admin'::workspace_role,'member'::workspace_role,'viewer'::workspace_role]));
CREATE POLICY "workspace members create requests" ON public.integration_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role,'admin'::workspace_role,'member'::workspace_role]));
CREATE POLICY "admins delete requests" ON public.integration_requests
  FOR DELETE TO authenticated
  USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role,'admin'::workspace_role]));

-- 3. Extend workspace_integrations with health fields
ALTER TABLE public.workspace_integrations
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_msg TEXT,
  ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy','degraded','error','unknown')),
  ADD COLUMN IF NOT EXISTS mailbox_count INT NOT NULL DEFAULT 0;

-- 4. Seed catalog
INSERT INTO public.integration_catalog (id, name, tagline, category, logo_slug, status, auth_type, sort_order) VALUES
  -- Email providers
  ('google_workspace','Google Workspace','Sync every Gmail mailbox in your Workspace and reply from ByteBack.','email','google',  'live','oauth',10),
  ('gmail','Gmail','Connect a personal or business Gmail account in one click.','email','gmail','live','oauth',11),
  ('microsoft_365','Microsoft 365','Two-way sync with Microsoft 365 mailboxes across your tenant.','email','microsoft','coming_soon','oauth',20),
  ('outlook','Outlook','Connect an Outlook.com or work Outlook mailbox.','email','outlook','coming_soon','oauth',21),
  ('exchange','Exchange','On-prem Exchange EWS integration for legacy environments.','email','exchange','coming_soon','oauth',22),
  ('zoho_mail','Zoho Mail','Sync Zoho mailboxes and unify replies in one inbox.','email','zoho','coming_soon','oauth',30),
  ('imap','IMAP','Connect any IMAP mailbox with app-password or OAuth.','email','imap','beta','api_key',40),
  ('smtp','SMTP','Send outbound mail via any SMTP relay.','email','smtp','beta','api_key',41),
  ('yahoo_mail','Yahoo Mail','Connect Yahoo mailboxes over OAuth.','email','yahoo','coming_soon','oauth',42),
  ('icloud_mail','iCloud Mail','iCloud mailbox sync with app-specific password.','email','icloud','coming_soon','api_key',43),
  ('proton_mail','Proton Mail','Encrypted Proton mailbox sync via bridge.','email','proton','coming_soon','api_key',44),
  ('fastmail','Fastmail','Fastmail IMAP + JMAP integration.','email','fastmail','coming_soon','api_key',45),
  -- Cold email
  ('instantly','Instantly.ai','Pull replies, campaigns, and analytics from Instantly in real time.','cold_email','instantly','live','api_key',10),
  ('smartlead','Smartlead.ai','Smartlead campaign sync and unified reply management.','cold_email','smartlead','coming_soon','api_key',20),
  ('apollo','Apollo.io','Apollo sequence + lead enrichment sync.','cold_email','apollo','coming_soon','oauth',21),
  ('lemlist','Lemlist','Lemlist sequence + reply sync.','cold_email','lemlist','coming_soon','api_key',22),
  ('saleshandy','Saleshandy','Saleshandy campaign + engagement sync.','cold_email','saleshandy','coming_soon','api_key',23),
  ('mailshake','Mailshake','Mailshake campaign + reply sync.','cold_email','mailshake','coming_soon','api_key',24),
  ('reply_io','Reply.io','Reply.io multichannel campaign sync.','cold_email','reply','coming_soon','api_key',25),
  ('woodpecker','Woodpecker','Woodpecker campaign + reply sync.','cold_email','woodpecker','coming_soon','api_key',26),
  ('quickmail','QuickMail','QuickMail campaign + reply sync.','cold_email','quickmail','coming_soon','api_key',27),
  -- CRM
  ('hubspot','HubSpot','Sync deals, contacts, and companies with HubSpot CRM.','crm','hubspot','coming_soon','oauth',10),
  ('zoho_crm','Zoho CRM','Push leads and activity into Zoho CRM.','crm','zoho','coming_soon','oauth',11),
  ('salesforce','Salesforce','Enterprise-grade Salesforce sync for accounts, opportunities, contacts.','crm','salesforce','coming_soon','oauth',12),
  ('freshsales','Freshsales','Freshsales sync for deals and contacts.','crm','freshsales','coming_soon','oauth',13),
  ('pipedrive','Pipedrive','Pipedrive pipeline + activity sync.','crm','pipedrive','coming_soon','oauth',14),
  ('close_crm','Close','Close CRM sync for leads, calls, opportunities.','crm','close','coming_soon','oauth',15),
  ('monday_crm','Monday CRM','Monday.com CRM board sync.','crm','monday','coming_soon','oauth',16),
  ('copper','Copper CRM','Copper contact + opportunity sync.','crm','copper','coming_soon','oauth',17),
  ('highlevel','HighLevel','HighLevel (GHL) sub-account sync.','crm','highlevel','coming_soon','api_key',18),
  -- Team collab
  ('slack','Slack','Post hot-lead alerts and reminders into Slack channels.','chat','slack','live','webhook',10),
  ('microsoft_teams','Microsoft Teams','Deliver alerts to Teams channels via Incoming Webhook.','chat','teams','live','webhook',11),
  ('discord','Discord','Send lead alerts to a Discord channel.','chat','discord','live','webhook',12),
  ('telegram','Telegram','Bot-based Telegram alerts.','chat','telegram','coming_soon','api_key',13),
  ('whatsapp_business','WhatsApp Business','Reply to WhatsApp inbound leads (roadmap).','chat','whatsapp','coming_soon','oauth',14),
  ('google_chat','Google Chat','Post alerts into a Google Chat space.','chat','google-chat','coming_soon','webhook',15),
  -- Calendar
  ('google_calendar','Google Calendar','Book meetings and see availability from your Google Calendar.','calendar','google-calendar','coming_soon','oauth',10),
  ('microsoft_calendar','Microsoft Calendar','Book meetings against Microsoft 365 calendars.','calendar','microsoft','coming_soon','oauth',11),
  ('calendly','Calendly','Attach Calendly links to replies and log booked meetings.','calendar','calendly','coming_soon','oauth',12),
  ('cal_com','Cal.com','Open-source scheduling with Cal.com.','calendar','calcom','coming_soon','oauth',13),
  ('zoom','Zoom','Auto-create Zoom links when scheduling.','calendar','zoom','coming_soon','oauth',14),
  ('google_meet','Google Meet','Auto-create Meet links when scheduling.','calendar','google-meet','coming_soon','oauth',15),
  ('teams_meeting','Microsoft Teams Meeting','Auto-create Teams meeting links.','calendar','teams','coming_soon','oauth',16),
  -- Storage
  ('google_drive','Google Drive','Attach files from Drive to replies and store lead assets.','storage','google-drive','coming_soon','oauth',10),
  ('dropbox','Dropbox','Attach Dropbox files to conversations.','storage','dropbox','coming_soon','oauth',11),
  ('onedrive','OneDrive','Attach OneDrive files to conversations.','storage','onedrive','coming_soon','oauth',12),
  ('box','Box','Enterprise Box file attachments.','storage','box','coming_soon','oauth',13),
  -- AI
  ('openai','OpenAI','Bring your own OpenAI key for classification and reply drafting.','ai','openai','coming_soon','api_key',10),
  ('anthropic','Claude','Bring your own Anthropic key for Claude-powered replies.','ai','anthropic','coming_soon','api_key',11),
  ('gemini','Gemini','Bring your own Gemini key for classification and drafting.','ai','gemini','coming_soon','api_key',12),
  ('perplexity','Perplexity','Perplexity-powered research on inbound leads.','ai','perplexity','coming_soon','api_key',13),
  -- Automation
  ('zapier','Zapier','Forward every ByteBack event to a Zap.','automation','zapier','live','webhook',10),
  ('make','Make.com','Forward events to Make.com scenarios.','automation','make','live','webhook',11),
  ('n8n','n8n','Forward events to n8n workflows.','automation','n8n','live','webhook',12),
  ('generic_webhook','Custom Webhook','POST every ByteBack event as JSON to any HTTPS endpoint.','automation','webhook','live','webhook',20),
  ('rest_api','REST API','Query and mutate ByteBack data via a REST endpoint (roadmap).','automation','api','coming_soon','api_key',21),
  ('graphql_api','GraphQL API','GraphQL access to ByteBack data (roadmap).','automation','graphql','coming_soon','api_key',22);
