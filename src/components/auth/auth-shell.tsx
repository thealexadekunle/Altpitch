import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Stark first-brand-impression shell: logo, one card, dark background, accent only on the
 * primary button inside. No testimonial walls, no split-screen stock art. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Target className="h-5 w-5 text-accent-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
