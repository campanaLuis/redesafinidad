import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSentimentPieCard } from "@/components/dashboard/DashboardSentimentPieCard";
import type { OverallSentiment } from "@/lib/aggregateCommentSentiment";

const restKpis = [
  { label: "Pipeline", value: "38", sub: "ofertas", trend: "up" as const },
  { label: "Rent efectivo", value: "$2.4M", sub: "MTD", trend: "up" as const },
];

interface DashboardKpiRowProps {
  totalSeguidores: number;
  /** Altas en el mes calendario actual (según `created_at`) */
  sumadosEsteMes: number;
  seguidoresLoading: boolean;
  seguidoresError: boolean;
  overallSentiment: OverallSentiment | null;
  sentimentLoading: boolean;
  sentimentError: boolean;
}

export function DashboardKpiRow({
  totalSeguidores,
  sumadosEsteMes,
  seguidoresLoading,
  seguidoresError,
  overallSentiment,
  sentimentLoading,
  sentimentError,
}: DashboardKpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
      <Card className="h-full flex flex-col p-4 border-border/80 shadow-none bg-card hover:bg-muted/20 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Seguidores
          </span>
          <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        </div>
        {seguidoresLoading && <Skeleton className="h-8 w-24 mt-1" />}
        {!seguidoresLoading && seguidoresError && (
          <p className="text-xl font-semibold text-destructive">—</p>
        )}
        {!seguidoresLoading && !seguidoresError && (
          <div className="space-y-1">
            <p className="text-xl font-semibold text-foreground tracking-tight tabular-nums">
              {totalSeguidores.toLocaleString("es-MX")}
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{sumadosEsteMes.toLocaleString("es-MX")} <span className="font-normal text-muted-foreground">este mes</span>
            </p>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] font-normal px-1.5 py-0 h-5 bg-muted text-muted-foreground"
          >
            {seguidoresError ? "Error al cargar" : seguidoresLoading ? "…" : "Total en base"}
          </Badge>
        </div>
      </Card>

      <DashboardSentimentPieCard
        sentiment={overallSentiment}
        loading={sentimentLoading}
        error={sentimentError}
      />

      {restKpis.map((k) => (
        <Card
          key={k.label}
          className="h-full flex flex-col p-4 border-border/80 shadow-none bg-card hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {k.label}
            </span>
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          </div>
          <p className="text-xl font-semibold text-foreground tracking-tight tabular-nums">{k.value}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[10px] font-normal px-1.5 py-0 h-5 bg-muted text-muted-foreground"
            >
              {k.sub}
            </Badge>
            {k.trend === "up" && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">↑</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
