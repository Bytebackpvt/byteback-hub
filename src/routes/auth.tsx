import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ensureCurrentWorkspace } from "@/lib/workspace.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · ByteBack Inbox AI" },
      { name: "description", content: "Sign in to your ByteBack workspace." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const ensureWorkspace = useServerFn(ensureCurrentWorkspace);
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Bounce already-signed-in users
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) routeAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const routeAfterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await ensureWorkspace().catch(() => null);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/")) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/app" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in failed", { description: result.error.message });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    await routeAfterAuth();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter your email and password");
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Welcome to ByteBack — let's set up your workspace.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      await routeAfterAuth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-radial-brand" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandLink />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tab === "signup" ? "Create your workspace" : "Welcome back"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {tab === "signup"
                  ? "Up and running in under 5 minutes."
                  : "Sign in to your ByteBack inbox."}
              </p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>

              {(["signup", "signin"] as const).map((t) => (
                <TabsContent key={t} value={t} className="mt-5 space-y-3">
                  <Button
                    variant="outline"
                    disabled={loading}
                    className="w-full justify-center gap-2 rounded-lg"
                    onClick={handleGoogle}
                  >
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <div className="relative py-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
                    <span className="bg-card px-2">or with email</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {t === "signup" && (
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <Input
                          id="name"
                          placeholder="Jane Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor={`email-${t}`}>Work email</Label>
                      <Input
                        id={`email-${t}`}
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`pw-${t}`}>Password</Label>
                      <Input
                        id={`pw-${t}`}
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1.5"
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full rounded-lg">
                      {loading ? "Please wait…" : t === "signup" ? "Create workspace" : "Sign in"}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </form>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> SOC 2-ready
              </span>
              <span>GDPR compliant</span>
              <span>256-bit encryption</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
