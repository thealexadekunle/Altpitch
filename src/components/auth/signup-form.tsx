"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { recordAuthEvent } from "@/lib/audit-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

const TURNSTILE_ENABLED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    if (TURNSTILE_ENABLED && !turnstileToken) return;
    setSubmitting(true);
    const { error } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Sign up failed.");
      return;
    }
    recordAuthEvent("auth.signup", email.trim());
    // requireEmailVerification is off (see lib/auth/auth.ts) — the session is live immediately.
    // First login goes to Knowledge Base: Altpitch is useless until it has content, so its
    // empty state is the onboarding.
    router.push("/knowledge");
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/knowledge" });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Judgment, not generation.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Name</Label>
          <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Note: signup goes
            straight through authClient.signUp.email() client-side, no server route in front of
            it — the token is captured here but nothing verifies it server-side yet (see
            lib/turnstile.ts). Real enforcement needs a server route in this path. */}
        <TurnstileWidget onVerify={setTurnstileToken} />

        <Button type="submit" className="w-full" disabled={submitting || (TURNSTILE_ENABLED && !turnstileToken)}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading}>
        {googleLoading ? <Loader2 className="animate-spin" /> : null}
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
