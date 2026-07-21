import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary", accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
