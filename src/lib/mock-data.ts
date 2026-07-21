export type ThreadCategory =
  | "interested"
  | "meeting"
  | "objection"
  | "not-now"
  | "not-interested"
  | "ooo"
  | "unsubscribe"
  | "spam";

export type PriorityLevel = "hot" | "warm" | "low";

export type Thread = {
  id: string;
  from: { name: string; email: string; company: string };
  subject: string;
  preview: string;
  body: string;
  mailbox: string;
  receivedAt: string;
  activityAt?: string | null;
  unread: boolean;
  starred: boolean;
  category: ThreadCategory;
  priority: PriorityLevel;
  aiSummary: string;
  suggestedReply: string;
  assignedTo?: string;
  source?: string;
  direction?: "in" | "out";
};

export const MAILBOXES = [
  { id: "all", label: "All inboxes", color: "bg-brand" },
  { id: "jane@acme.io", label: "jane@acme.io", color: "bg-emerald-500" },
  { id: "sales@acme.io", label: "sales@acme.io", color: "bg-sky-500" },
  { id: "ops@acmehq.com", label: "ops@acmehq.com", color: "bg-amber-500" },
  { id: "hello@acme.co", label: "hello@acme.co", color: "bg-pink-500" },
];

export const CATEGORY_META: Record<
  ThreadCategory,
  { label: string; className: string; dot: string }
> = {
  interested: { label: "Interested", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  meeting: { label: "Meeting request", className: "bg-brand/10 text-brand", dot: "bg-brand" },
  objection: { label: "Objection", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  "not-now": { label: "Not now", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  "not-interested": { label: "Not interested", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  ooo: { label: "Out of office", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  unsubscribe: { label: "Unsubscribe", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  spam: { label: "Spam", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

export const PRIORITY_META: Record<PriorityLevel, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  warm: { label: "Warm", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

export const THREADS: Thread[] = [
  {
    id: "t1",
    from: { name: "Sarah Chen", email: "sarah@northwind.io", company: "Northwind Labs" },
    subject: "Re: Cutting deployment time by 40%",
    preview: "This is timely — we've been evaluating options this quarter. Can we jump on a 20-min call Thursday?",
    body: "Hi Jane,\n\nThis is timely — we've been evaluating options this quarter. Can we jump on a 20-min call Thursday? I'd like to loop in our CTO Mark.\n\nBest,\nSarah",
    mailbox: "jane@acme.io",
    receivedAt: "2m ago",
    unread: true,
    starred: true,
    category: "meeting",
    priority: "hot",
    aiSummary: "Ready to book a discovery call this week. Wants to include their CTO. High buying intent — decision this quarter.",
    suggestedReply: "Hi Sarah,\n\nThursday works — how about 2:00 PM ET? I'll send an invite that includes Mark. Looking forward to it.\n\nJane",
  },
  {
    id: "t2",
    from: { name: "David Park", email: "d.park@luminate.co", company: "Luminate Health" },
    subject: "Interested — pricing for 25 seats?",
    preview: "Loved the demo. Can you send over pricing for a 25-seat annual plan and SOC 2 documentation?",
    body: "Hi Jane,\n\nLoved the demo. Can you send over pricing for a 25-seat annual plan and SOC 2 documentation?\n\nThanks,\nDavid",
    mailbox: "sales@acme.io",
    receivedAt: "18m ago",
    unread: true,
    starred: false,
    category: "interested",
    priority: "hot",
    aiSummary: "Post-demo pricing request, 25 seats, needs SOC 2 report. Strong buying signal.",
    suggestedReply: "Hi David,\n\nGreat to hear! Sending our 25-seat annual pricing and SOC 2 report your way. Let me know if you'd like a follow-up call to walk through it.\n\nJane",
  },
  {
    id: "t3",
    from: { name: "Priya Ramanathan", email: "priya@meshwork.ai", company: "Meshwork AI" },
    subject: "Re: 15 minutes next week?",
    preview: "Timing isn't great this quarter but ping me in Q1. Definitely interested longer-term.",
    body: "Hi Jane,\n\nTiming isn't great this quarter but ping me in Q1. Definitely interested longer-term.\n\nP",
    mailbox: "jane@acme.io",
    receivedAt: "1h ago",
    unread: false,
    starred: false,
    category: "not-now",
    priority: "warm",
    aiSummary: "Not now — asks for Q1 follow-up. Warm lead, don't lose the thread.",
    suggestedReply: "Hi Priya,\n\nTotally understood. I've set a reminder for early January and will reach out then. Wishing you a great close to the year.\n\nJane",
  },
  {
    id: "t4",
    from: { name: "Marco Alvarez", email: "marco@fieldstone.com", company: "Fieldstone Capital" },
    subject: "Re: Reducing manual outreach 10x",
    preview: "We already use Instantly and Smartlead — how are you different?",
    body: "Hi Jane,\n\nWe already use Instantly and Smartlead — how are you different?\n\nMarco",
    mailbox: "sales@acme.io",
    receivedAt: "3h ago",
    unread: true,
    starred: false,
    category: "objection",
    priority: "warm",
    aiSummary: "Objection: already uses competing tools. Wants clear differentiation.",
    suggestedReply: "Hi Marco,\n\nGood question — we're not a sender, we're the AI reply-side layer that sits on top of Instantly and Smartlead. We unify replies across every mailbox and auto-classify them so nothing slips. Happy to show you 5 minutes side-by-side.\n\nJane",
  },
  {
    id: "t5",
    from: { name: "Emma Nakamura", email: "emma@brightside.co", company: "Brightside" },
    subject: "Auto-reply: Out of office until Nov 12",
    preview: "I'm out of office and will respond when I return.",
    body: "I'm out of office until Nov 12 and will respond when I return. For urgent matters, contact ops@brightside.co.",
    mailbox: "ops@acmehq.com",
    receivedAt: "4h ago",
    unread: false,
    starred: false,
    category: "ooo",
    priority: "low",
    aiSummary: "Auto-reply. Follow up Nov 12.",
    suggestedReply: "",
  },
  {
    id: "t6",
    from: { name: "Tomás Vega", email: "tomas@axiom.tech", company: "Axiom Tech" },
    subject: "Please remove me",
    preview: "Not the right fit. Please remove me from your list.",
    body: "Not the right fit. Please remove me from your list.",
    mailbox: "sales@acme.io",
    receivedAt: "5h ago",
    unread: false,
    starred: false,
    category: "unsubscribe",
    priority: "low",
    aiSummary: "Unsubscribe request — auto-suppressed across all mailboxes.",
    suggestedReply: "",
  },
  {
    id: "t7",
    from: { name: "Ava Sørensen", email: "ava@northlake.io", company: "Northlake" },
    subject: "Re: Quick intro",
    preview: "Sure — what's your availability next Tuesday afternoon?",
    body: "Sure — what's your availability next Tuesday afternoon?\n\nAva",
    mailbox: "hello@acme.co",
    receivedAt: "yesterday",
    unread: false,
    starred: true,
    category: "meeting",
    priority: "hot",
    aiSummary: "Booking a call for next Tuesday PM. Confirm slot.",
    suggestedReply: "Hi Ava,\n\nHow about Tuesday at 3:00 PM ET? Sending an invite now.\n\nJane",
  },
  {
    id: "t8",
    from: { name: "Reza Farahani", email: "reza@sundialgroup.io", company: "Sundial Group" },
    subject: "Circling back — any updates?",
    preview: "Just wanted to follow up on our conversation last month.",
    body: "Just wanted to follow up on our conversation last month. Any updates on the pilot?\n\nReza",
    mailbox: "jane@acme.io",
    receivedAt: "yesterday",
    unread: false,
    starred: false,
    category: "interested",
    priority: "warm",
    aiSummary: "Warm follow-up from previous conversation — pilot discussion.",
    suggestedReply: "Hi Reza,\n\nGreat timing — pilot spec is ready. Sending it over now.\n\nJane",
  },
];

export type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: "new" | "qualified" | "customer" | "churned";
  score: number;
  lastActivity: string;
};

export const CONTACTS: Contact[] = [
  { id: "c1", name: "Sarah Chen", email: "sarah@northwind.io", company: "Northwind Labs", title: "VP Engineering", status: "qualified", score: 92, lastActivity: "2m ago" },
  { id: "c2", name: "David Park", email: "d.park@luminate.co", company: "Luminate Health", title: "Head of Ops", status: "qualified", score: 88, lastActivity: "18m ago" },
  { id: "c3", name: "Priya Ramanathan", email: "priya@meshwork.ai", company: "Meshwork AI", title: "CEO", status: "new", score: 71, lastActivity: "1h ago" },
  { id: "c4", name: "Marco Alvarez", email: "marco@fieldstone.com", company: "Fieldstone Capital", title: "Partner", status: "new", score: 64, lastActivity: "3h ago" },
  { id: "c5", name: "Ava Sørensen", email: "ava@northlake.io", company: "Northlake", title: "COO", status: "qualified", score: 81, lastActivity: "yesterday" },
  { id: "c6", name: "Reza Farahani", email: "reza@sundialgroup.io", company: "Sundial Group", title: "Founder", status: "customer", score: 96, lastActivity: "yesterday" },
  { id: "c7", name: "Kenji Tanaka", email: "kenji@vertexlabs.io", company: "Vertex Labs", title: "CTO", status: "new", score: 58, lastActivity: "2 days ago" },
  { id: "c8", name: "Nadia Osei", email: "nadia@brightsun.co", company: "Brightsun", title: "Director of Sales", status: "customer", score: 91, lastActivity: "2 days ago" },
];

export type PipelineStage = "discovery" | "demo" | "proposal" | "negotiation" | "closed";

export type Deal = {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  stage: PipelineStage;
  probability: number;
  closeDate: string;
};

export const STAGES: { id: PipelineStage; label: string; accent: string }[] = [
  { id: "discovery", label: "Discovery", accent: "border-t-sky-500" },
  { id: "demo", label: "Demo", accent: "border-t-brand" },
  { id: "proposal", label: "Proposal", accent: "border-t-amber-500" },
  { id: "negotiation", label: "Negotiation", accent: "border-t-emerald-500" },
  { id: "closed", label: "Closed Won", accent: "border-t-emerald-600" },
];

export const DEALS: Deal[] = [
  { id: "d1", title: "Northwind — 40 seats", company: "Northwind Labs", contact: "Sarah Chen", value: 48000, stage: "demo", probability: 60, closeDate: "Dec 15" },
  { id: "d2", title: "Luminate — 25 seats annual", company: "Luminate Health", contact: "David Park", value: 30000, stage: "proposal", probability: 75, closeDate: "Nov 30" },
  { id: "d3", title: "Meshwork — Q1 pilot", company: "Meshwork AI", contact: "Priya Ramanathan", value: 12000, stage: "discovery", probability: 25, closeDate: "Jan 15" },
  { id: "d4", title: "Fieldstone — displace Instantly", company: "Fieldstone Capital", contact: "Marco Alvarez", value: 22000, stage: "discovery", probability: 30, closeDate: "Dec 20" },
  { id: "d5", title: "Northlake — expansion", company: "Northlake", contact: "Ava Sørensen", value: 18000, stage: "negotiation", probability: 85, closeDate: "Nov 22" },
  { id: "d6", title: "Sundial — renewal", company: "Sundial Group", contact: "Reza Farahani", value: 36000, stage: "closed", probability: 100, closeDate: "Nov 12" },
  { id: "d7", title: "Brightsun — upsell", company: "Brightsun", contact: "Nadia Osei", value: 14000, stage: "closed", probability: 100, closeDate: "Nov 10" },
  { id: "d8", title: "Vertex Labs — starter", company: "Vertex Labs", contact: "Kenji Tanaka", value: 9000, stage: "demo", probability: 45, closeDate: "Dec 10" },
];

export type Task = {
  id: string;
  title: string;
  due: string;
  priority: "high" | "med" | "low";
  done: boolean;
  linkedTo: string;
};

export const TASKS: Task[] = [
  { id: "k1", title: "Send SOC 2 report to David Park", due: "Today", priority: "high", done: false, linkedTo: "Luminate Health" },
  { id: "k2", title: "Schedule call with Sarah + CTO", due: "Today", priority: "high", done: false, linkedTo: "Northwind Labs" },
  { id: "k3", title: "Send pilot spec to Reza", due: "Tomorrow", priority: "med", done: false, linkedTo: "Sundial Group" },
  { id: "k4", title: "Reply to Marco with differentiation", due: "Tomorrow", priority: "med", done: false, linkedTo: "Fieldstone" },
  { id: "k5", title: "Renewal check-in — Brightsun", due: "Fri", priority: "low", done: true, linkedTo: "Brightsun" },
  { id: "k6", title: "Q1 reminder for Priya", due: "Jan 5", priority: "low", done: false, linkedTo: "Meshwork AI" },
];

export const ANALYTICS = {
  totalReplies: 342,
  hotLeads: 47,
  meetingsBooked: 18,
  avgResponseTime: "1h 24m",
  weekly: [
    { day: "Mon", replies: 42, hot: 6 },
    { day: "Tue", replies: 58, hot: 9 },
    { day: "Wed", replies: 51, hot: 7 },
    { day: "Thu", replies: 63, hot: 11 },
    { day: "Fri", replies: 47, hot: 8 },
    { day: "Sat", replies: 22, hot: 3 },
    { day: "Sun", replies: 59, hot: 3 },
  ],
  categoryBreakdown: [
    { name: "Interested", value: 92, color: "hsl(160 60% 45%)" },
    { name: "Meeting", value: 47, color: "hsl(274 70% 60%)" },
    { name: "Objection", value: 38, color: "hsl(35 90% 55%)" },
    { name: "Not now", value: 71, color: "hsl(210 70% 55%)" },
    { name: "Not interested", value: 54, color: "hsl(0 70% 55%)" },
    { name: "Auto/OOO", value: 40, color: "hsl(220 10% 55%)" },
  ],
};
