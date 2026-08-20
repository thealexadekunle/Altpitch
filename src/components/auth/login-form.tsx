"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Set only if signInWithPassword succeeds but the account has a verified TOTP factor —
  // Better Auth still issues the session, so the app gates on `twoFactorRedirect` itself
  // before treating sign-in as complete.
  const [awaitingTotp, setAwaitingTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [verifyingTotp, setVerifyingTotp] = useState(false);

  async function completeLogin() {
    recordAuthEvent("auth.login");
    router.push(next);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (TURNSTILE_ENABLED && !turnstileToken) return;
    setSubmitting(true);
    const { data, error } = await authClient.signIn.email({
      email: email.trim(),
      password,
      fetchOptions: turnstileToken ? { headers: { "x-turnstile-token": turnstileToken } } : undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Sign in failed.");
      return;
    }
    if ("twoFactorRedirect" in data && data.twoFactorRedirect) {
      setAwaitingTotp(true);
      return;
    }
    await completeLogin();
  }

  async function handleVerifyTotp(e: React.FormEvent) {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setVerifyingTotp(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: totpCode });
    setVerifyingTotp(false);
    if (error) {
      toast.error(error.message ?? "Invalid code.");
      return;
    }
    await completeLogin();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  if (awaitingTotp) {
    return (
      <AuthShell title="Enter your 2FA code" subtitle="One more step for this account.">
        <form onSubmit={handleVerifyTotp} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="totp-code">6-digit code</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </div>
          <Button type="submit" className="w-full" disabled={verifyingTotp || totpCode.length !== 6}>
            {verifyingTotp ? <Loader2 className="animate-spin" /> : null}
            Verify
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in to Altpitch" subtitle="Judgment, not generation.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <TurnstileWidget onVerify={setTurnstileToken} />

        <Button type="submit" className="w-full" disabled={submitting || (TURNSTILE_ENABLED && !turnstileToken)}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          Sign in
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
        No account?{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
