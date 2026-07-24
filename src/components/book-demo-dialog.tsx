import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BookDemoDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim() || !form.email.trim()) {
      setErr("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/book-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          // reset after close animation
          setTimeout(() => {
            setSent(false);
            setErr(null);
            setForm({ name: "", email: "", company: "", message: "" });
          }, 200);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Request received</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Anjali from ByteBack will reach out within one business day to schedule your walkthrough.
            </p>
            <Button className="mt-5 w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book a demo</DialogTitle>
              <DialogDescription>
                Tell us a bit about you — we'll send a calendar link within one business day.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bd-name">Name</Label>
                <Input
                  id="bd-name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd-email">Work email</Label>
                <Input
                  id="bd-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd-company">Company</Label>
                <Input
                  id="bd-company"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Company name (optional)"
                  maxLength={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bd-message">What would you like to see?</Label>
                <Textarea
                  id="bd-message"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. Instantly + Gmail unified inbox for a 5-person team"
                  rows={3}
                  maxLength={2000}
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Request demo"
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                We'll only use your details to schedule this demo.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
