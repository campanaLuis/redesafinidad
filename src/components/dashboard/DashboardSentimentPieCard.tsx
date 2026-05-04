import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { OverallSentiment } from "@/lib/aggregateCommentSentiment";

const SLICES = [
  { key: "positivo" as const, label: "Positivo", fill: "#22c55e" },
  { key: "neutro" as const, label: "Neutro", fill: "#eab308" },
  { key: "negativo" as const, label: "Negativo", fill: "#ef4444" },
];

function pctFmt(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function SentimentTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { name: string; pct: number };
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="tabular-nums text-muted-foreground">{pctFmt(p.pct)}%</p>
    </div>
  );
}

interface DashboardSentimentPieCardProps {
  sentiment: OverallSentiment | null;
  loading: boolean;
  error: boolean;
}

export function DashboardSentimentPieCard({ sentiment, loading, error }: DashboardSentimentPieCardProps) {
  const pieData =
    sentiment && sentiment.total > 0
      ? SLICES.map((s) => ({
          name: s.label,
          value: sentiment.counts[s.key],
          pct: sentiment.pct[s.key],
          fill: s.fill,
        })).filter((d) => d.value > 0)
      : [];

  return (
    <Card className="h-full p-4 border-border/80 shadow-none bg-card hover:bg-muted/20 transition-colors overflow-hidden flex flex-col min-h-[120px]">
      <div className="flex items-start justify-between gap-2 mb-1 shrink-0">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Sentimiento
        </span>
        <Info className="h-3.5 w-3.5 shrink-0 invisible pointer-events-none" aria-hidden />
      </div>

      {loading && (
        <div className="flex gap-3 items-center justify-center flex-1">
          <Skeleton className="h-[100px] w-[100px] rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-[140px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive text-center py-4 flex-1 flex items-center justify-center">
          No se pudo cargar.
        </p>
      )}

      {!loading && !error && sentiment && sentiment.total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 flex-1 flex items-center justify-center">
          Sin datos
        </p>
      )}

      {!loading && !error && sentiment && sentiment.total > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-center flex-1">
          <div className="h-[100px] w-full sm:w-[110px] shrink-0 mx-auto sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={44}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<SentimentTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-1.5 text-xs min-w-0 max-w-[160px] mx-auto sm:mx-0">
            {SLICES.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.fill }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground truncate">{s.label}</span>
                </span>
                <span className="tabular-nums font-semibold text-foreground shrink-0">
                  {pctFmt(sentiment.pct[s.key])}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
