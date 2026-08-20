import { throwForFailedResponse } from "@/lib/data/api-error";

export interface InsightView {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
}

export async function getInsights(): Promise<InsightView[]> {
  const res = await fetch("/api/insights");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load insights.");
  const body = await res.json();
  return body.insights;
}

export async function dismissInsight(id: string): Promise<void> {
  const res = await fetch(`/api/insights/${id}/dismiss`, { method: "POST" });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't dismiss insight.");
}
