"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Save, LogOut, CreditCard, ChevronRight } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/data";
import { authClient } from "@/lib/auth/client";
import { recordAuthEvent } from "@/lib/audit-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserSettings } from "@/lib/types";

const TIMEZONES = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Lisbon", "Asia/Kolkata", "Asia/Manila"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "PHP", "BRL"];
const TONES = ["professional", "conversational", "direct", "warm"] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [avoidPhrasesText, setAvoidPhrasesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setAvoidPhrasesText(s.writingStyle.avoidPhrases.join(", "));
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const patch: UserSettings = {
        ...settings,
        writingStyle: {
          ...settings.writingStyle,
          avoidPhrases: avoidPhrasesText.split(",").map((p) => p.trim()).filter(Boolean),
        },
      };
      const updated = await updateSettings(patch);
      setSettings(updated);
      toast.success("Settings saved.");
    } catch {
      toast.error("Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    recordAuthEvent("auth.logout");
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile, writing style, and defaults.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input id="settings-name" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-title">Title</Label>
              <Input id="settings-title" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-timezone">Timezone</Label>
              <Select id="settings-timezone" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-currency">Default currency</Label>
              <Select id="settings-currency" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Writing style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-tone">Tone</Label>
              <Select
                id="settings-tone"
                value={settings.writingStyle.tone}
                onChange={(e) =>
                  setSettings({ ...settings, writingStyle: { ...settings.writingStyle, tone: e.target.value as typeof TONES[number] } })
                }
              >
                {TONES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-max-words">Max proposal words</Label>
              <Input
                id="settings-max-words"
                type="number"
                value={settings.writingStyle.maxProposalWords}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    writingStyle: { ...settings.writingStyle, maxProposalWords: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="settings-formality">Formality</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{settings.writingStyle.formality}/100</span>
            </div>
            <input
              id="settings-formality"
              type="range"
              min={0}
              max={100}
              value={settings.writingStyle.formality}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  writingStyle: { ...settings.writingStyle, formality: Number(e.target.value) },
                })
              }
              className="w-full accent-accent"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-opening">Preferred opening</Label>
            <Textarea
              id="settings-opening"
              value={settings.writingStyle.preferredOpening}
              onChange={(e) =>
                setSettings({ ...settings, writingStyle: { ...settings.writingStyle, preferredOpening: e.target.value } })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-avoid-phrases">Phrases to avoid (comma separated)</Label>
            <Input id="settings-avoid-phrases" value={avoidPhrasesText} onChange={(e) => setAvoidPhrasesText(e.target.value)} placeholder="e.g. I am writing to express interest" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-answer-length">Default answer length</Label>
            <Select
              id="settings-answer-length"
              value={settings.writingStyle.answerLength}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  writingStyle: { ...settings.writingStyle, answerLength: e.target.value as "concise" | "standard" },
                })
              }
            >
              <option value="concise">Concise (40–70 words)</option>
              <option value="standard">Standard (70–100 words)</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Screening answers target this range, hard ceiling 120 words either way.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/billing"
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:bg-secondary/40"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Plan &amp; usage
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            Sign out
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
