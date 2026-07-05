import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · ByteBack Inbox AI" },
      { name: "description", content: "Sign in to your ByteBack workspace." },
      { property: "og:title", content: "Sign in · ByteBack Inbox AI" },
      { property: "og:description", content: "Sign in to your ByteBack workspace." },
    ],
  }),
  component: AuthPage,
});

type Step = "form" | "otp" | "twofa";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z"/>
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/>
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/>
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");

  const proceed = () => {
    toast.success("Welcome to ByteBack — let's set up your workspace.");
    navigate({ to: "/onboarding/workspace" });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your work email");
    setStep("twofa");
  };

  const onOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your work email");
    setStep("otp");
    toast.message("6-digit code sent", { description: `Check ${email}` });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
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
            {step === "form" && (
              <>
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
                        className="w-full justify-center gap-2 rounded-lg"
                        onClick={proceed}
                      >
                        <GoogleIcon /> Continue with Google
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-center gap-2 rounded-lg"
                        onClick={proceed}
                      >
                        <MicrosoftIcon /> Continue with Microsoft
                      </Button>

                      <div className="relative py-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
                        <span className="bg-card px-2">or with email</span>
                      </div>

                      <form onSubmit={onSubmit} className="space-y-3">
                        <div>
                          <Label htmlFor="email">Work email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1.5"
                            required
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <button
                              type="button"
                              onClick={onOtp}
                              className="text-xs text-brand hover:underline"
                            >
                              Use email code instead
                            </button>
                          </div>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="mt-1.5"
                          />
                        </div>
                        <Button type="submit" className="w-full rounded-lg">
                          {t === "signup" ? "Create workspace" : "Sign in"}
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
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" /> 2FA supported
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> GDPR compliant
                  </span>
                </div>
              </>
            )}

            {step === "otp" && (
              <div className="text-center">
                <Mail className="mx-auto h-8 w-8 text-brand" />
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground">{email}</span>.
                </p>
                <div className="mt-6 flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="mt-6 w-full rounded-lg" onClick={proceed} disabled={otp.length < 6}>
                  Continue
                </Button>
                <button
                  onClick={() => setStep("form")}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different method
                </button>
              </div>
            )}

            {step === "twofa" && (
              <div className="text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-brand" />
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                  Two-factor authentication
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter the code from your authenticator app.
                </p>
                <div className="mt-6 flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  className="mt-6 w-full rounded-lg"
                  onClick={proceed}
                  disabled={code.length < 6}
                >
                  Verify & continue
                </Button>
                <button
                  onClick={() => setStep("form")}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
