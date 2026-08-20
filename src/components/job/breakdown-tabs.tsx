import { AlertTriangle, EyeOff, HelpCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/score-bar";
import { Rationale } from "@/components/rationale";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { JobAnalysis } from "@/lib/types";

const SEVERITY_CLASS: Record<string, string> = {
  low: "border-border bg-secondary text-muted-foreground",
  medium: "border-warning/40 bg-warning/15 text-warning",
  high: "border-destructive/40 bg-destructive/15 text-danger",
};

export function BreakdownTabs({ job }: { job: JobAnalysis }) {
  return (
    <Tabs defaultValue="deliverables">
      <TabsList>
        <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
        <TabsTrigger value="client">Client profile</TabsTrigger>
        <TabsTrigger value="risks">Red flags</TabsTrigger>
        <TabsTrigger value="psychology">Psychology</TabsTrigger>
        <TabsTrigger value="scores">Score breakdown</TabsTrigger>
        <TabsTrigger value="questions">Client questions</TabsTrigger>
      </TabsList>

      <TabsContent value="deliverables">
        <Card>
          <CardContent className="space-y-3 p-5">
            {job.deliverables.map((d, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                {d.isHidden && <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                <div className="space-y-1">
                  <div className="text-sm text-foreground">
                    {d.isHidden && <Badge variant="warning" className="mr-2 align-middle">Hidden requirement</Badge>}
                    {d.text}
                  </div>
                  {d.rationale && <p className="text-xs text-muted-foreground">{d.rationale}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="client">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Payment" value={job.clientProfile.paymentVerified ? "Verified" : "Unverified"} />
              {job.clientProfile.spendTier && <Stat label="Spend" value={job.clientProfile.spendTier} />}
              {job.clientProfile.rating != null && <Stat label="Rating" value={job.clientProfile.rating.toFixed(1)} />}
              {job.clientProfile.jobsPosted != null && <Stat label="Jobs posted" value={String(job.clientProfile.jobsPosted)} />}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Decision style</p>
              <p className="text-sm text-foreground">{job.clientProfile.decisionStyle}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inferred values</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {job.clientProfile.inferredValues.map((v) => (
                  <Badge key={v} variant="muted">{v}</Badge>
                ))}
              </div>
            </div>
            {job.clientProfile.hiringHistory && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Hiring history</p>
                <p className="text-sm text-foreground">{job.clientProfile.hiringHistory}</p>
              </div>
            )}
            <Rationale text={job.clientProfile.rationale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="risks">
        <Card>
          <CardContent className="space-y-3 p-5">
            {job.redFlags.length === 0 && (
              <p className="text-sm text-muted-foreground">No notable red flags detected.</p>
            )}
            {job.redFlags.map((flag, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{flag.title}</p>
                  <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase", SEVERITY_CLASS[flag.severity])}>
                    {flag.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
                <Rationale text={flag.rationale} />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="psychology">
        <Card>
          <CardContent className="space-y-4 p-5">
            <PsychList label="Fears" items={job.psychology.fears} />
            <PsychList label="Desired outcomes" items={job.psychology.desiredOutcomes} />
            <PsychList label="Trust triggers" items={job.psychology.trustTriggers} />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Best opening angle</p>
              <p className="text-sm text-foreground">{job.psychology.bestOpeningAngle}</p>
            </div>
            <Rationale text={job.psychology.rationale} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scores">
        <Card>
          <CardContent className="space-y-4 p-5">
            {job.scoreBreakdown.map((s) => (
              <div key={s.label} className="space-y-1">
                <ScoreBar score={s.score} label={s.label} />
                <Rationale text={s.rationale} />
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Competition estimate</p>
              <p className="text-sm text-foreground">{job.competitionRationale}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="questions">
        <Card>
          <CardContent className="space-y-2 p-5">
            {job.clientQuestions.length === 0 ? (
              <EmptyState
                icon={HelpCircle}
                title="No questions from this client"
                description="Nothing detected in the post, and none added manually before analyzing."
              />
            ) : (
              job.clientQuestions.map((q) => (
                <div key={q.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <p className="flex-1 text-sm text-foreground">{q.text}</p>
                  <Badge variant={q.source === "manual" ? "accent" : "muted"} className="shrink-0">
                    {q.source === "manual" ? "You added" : "Auto-detected"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function PsychList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-foreground">· {item}</li>
        ))}
      </ul>
    </div>
  );
}
