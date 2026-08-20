"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/** Two-factor auth for admin accounts, via Better Auth's twoFactor plugin — no custom secret
 * storage or code-verification crypto here, Better Auth owns the factor and the assurance-level
 * check at sign-in (see login-form.tsx's TOTP step, lib/admin/require-admin.ts's server check). */
export default function AdminSecurityPage() {
  const { data: session, isPending } = authClient.useSession();
  const [enrolling, setEnrolling] = useState(false);
  const [password, setPassword] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const twoFactorEnabled = session?.user && "twoFactorEnabled" in session.user ? Boolean(session.user.twoFactorEnabled) : false;

  useEffect(() => {
    return () => setQrDataUrl(null);
  }, []);

  async function handleStartEnroll() {
    if (!password) {
      toast.error("Enter your password to start.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({ password, issuer: "Altpitch" });
      if (error) throw new Error(error.message);
      setSecret(new URL(data.totpURI).searchParams.get("secret"));
      setBackupCodes(data.backupCodes);
      setQrDataUrl(await QRCode.toDataURL(data.totpURI));
      setEnrolling(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start 2FA enrollment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) throw new Error(error.message);
      toast.success("2FA enabled. Save your backup codes somewhere safe — they won't be shown again.");
      setEnrolling(false);
      setQrDataUrl(null);
      setCode("");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!disablePassword) {
      toast.error("Enter your password to disable 2FA.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password: disablePassword });
      if (error) throw new Error(error.message);
      toast.success("2FA disabled.");
      setDisablePassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disable 2FA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">Two-factor authentication for your own admin account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authenticator app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending && <Skeleton className="h-9 w-40" />}

          {!isPending && twoFactorEnabled && !enrolling && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" />
                2FA is enabled.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="disable-password">Password</Label>
                <Input id="disable-password" type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleDisable} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldX />}
                Disable 2FA
              </Button>
            </div>
          )}

          {!isPending && !twoFactorEnabled && !enrolling && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">2FA is not enabled on this account.</p>
              <div className="space-y-1.5">
                <Label htmlFor="enable-password">Password</Label>
                <Input id="enable-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button onClick={handleStartEnroll} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Enable 2FA
              </Button>
            </div>
          )}

          {enrolling && (
            <div className="space-y-3">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- locally generated data: URI, not a remote image
                <img src={qrDataUrl} alt="2FA QR code" className="mx-auto h-40 w-40 rounded-md bg-white p-2" />
              )}
              {secret && (
                <p className="break-all text-center text-xs text-muted-foreground">
                  Can&apos;t scan? Enter manually: <span className="font-mono text-foreground">{secret}</span>
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="totp-code">6-digit code</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
              </div>
              <Button className="w-full" onClick={handleVerify} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Confirm and enable
              </Button>
              {backupCodes && (
                <div className="rounded-md border border-border bg-secondary/30 p-3">
                  <p className="mb-1.5 text-xs font-medium text-foreground">Backup codes — save these now</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs text-muted-foreground">
                    {backupCodes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
