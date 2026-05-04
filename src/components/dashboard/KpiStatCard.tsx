import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  sub?: ReactNode;
  isLoading?: boolean;
  valueClassName?: string;
};

export function KpiStatCard({ label, icon: Icon, value, sub, isLoading, valueClassName }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-colors hover:bg-muted/10">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70">
          <Icon className="h-4 w-4 text-muted-foreground/80" aria-hidden />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : (
        <div className="space-y-1">
          <p className={cn("text-2xl font-semibold tabular-nums tracking-tight text-foreground", valueClassName)}>
            {value ?? "—"}
          </p>
          {sub != null && sub !== "" && (
            <div className="text-xs text-muted-foreground">{sub}</div>
          )}
        </div>
      )}
    </div>
  );
}
