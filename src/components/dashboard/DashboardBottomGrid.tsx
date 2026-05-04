import {
  LineChart,
  Line,
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { computeMonthOverMonthGrowth, type GrowthPoint } from "@/lib/networkGrowth";
import type { MonthlySentimentPoint } from "@/lib/socialSentimentTimeline";

const trendData = [
  { x: 1, a: 12, b: 18 },
  { x: 2, a: 15, b: 14 },
  { x: 3, a: 10, b: 20 },
  { x: 4, a: 18, b: 16 },
  { x: 5, a: 14, b: 22 },
];

const concentrationData = [
  { cat: "A", bar: 40, line: 35 },
  { cat: "B", bar: 55, line: 48 },
  { cat: "C", bar: 35, line: 42 },
  { cat: "D", bar: 48, line: 45 },
];

const pink = "hsl(340 75% 48%)";
const blue = "hsl(210 79% 46%)";

function formatMomPercent(p: number | null): string {
  if (p === null) return "—";
  const sign = p > 0 ? "+" : "";
  const abs = Math.abs(p);
  const decimals = abs >= 100 || abs % 1 === 0 ? 0 : 1;
  return `${sign}${p.toLocaleString("es-MX", { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}%`;
}

interface DashboardBottomGridProps {
  growthPoints: GrowthPoint[];
  growthLoading: boolean;
  growthError: boolean;
  sentimentSeries: MonthlySentimentPoint[] | null;
  sentimentLoading: boolean;
  sentimentError: boolean;
}

function sentimentBarFill(pct: number, hasComments: boolean): string {
  if (!hasComments) return "hsl(var(--muted) / 0.45)";
  const p = Math.max(0, Math.min(100, pct));
  const hue = (p / 100) * 132;
  return `hsl(${hue} 70% 46%)`;
}

export function DashboardBottomGrid({
  growthPoints,
  growthLoading,
  growthError,
  sentimentSeries,
  sentimentLoading,
  sentimentError,
}: DashboardBottomGridProps) {
  const momRows = computeMonthOverMonthGrowth(growthPoints);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="py-3 px-4 pb-0">
          <h3 className="text-sm font-semibold text-foreground">Tendencia de cartera</h3>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="x" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: "11px",
                  }}
                />
                <Line type="monotone" dataKey="a" stroke={pink} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="b" stroke={blue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="py-3 px-4 pb-0">
          <h3 className="text-sm font-semibold text-foreground">Concentración de inquilinos</h3>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={concentrationData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="cat" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: "11px",
                  }}
                />
                <Bar dataKey="bar" fill={blue} radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line type="monotone" dataKey="line" stroke={pink} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="py-3 px-4 pb-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug">Sentimiento en redes (por mes)</h3>
          <p className="text-[11px] text-muted-foreground font-normal leading-snug">
            % de comentarios positivos (Facebook, Instagram, TikTok, X). Mismo criterio que en Redes sociales: posts con
            al menos 60 h desde su publicación.
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-2">
          {sentimentLoading && (
            <div className="h-[200px] flex items-center justify-center">
              <Skeleton className="h-[160px] w-full rounded-md" />
            </div>
          )}
          {!sentimentLoading && sentimentError && (
            <div className="h-[200px] flex items-center justify-center text-xs text-destructive text-center px-2">
              No se pudo cargar el sentimiento de comentarios.
            </div>
          )}
          {!sentimentLoading && !sentimentError && sentimentSeries && sentimentSeries.length === 0 && (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground text-center px-2">
              Sin datos de periodos.
            </div>
          )}
          {!sentimentLoading && !sentimentError && sentimentSeries && sentimentSeries.length > 0 && (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentSeries} margin={{ top: 8, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis
                    dataKey="labelShort"
                    tick={{ fontSize: 9 }}
                    interval={sentimentSeries.length > 8 ? 1 : 0}
                    angle={-28}
                    textAnchor="end"
                    height={52}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    width={36}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "11px",
                    }}
                    formatter={(value: number, _name, item) => {
                      const payload = item?.payload as MonthlySentimentPoint | undefined;
                      const n = payload?.commentsInMonth ?? 0;
                      if (n === 0) return [`Sin comentarios en el periodo`, "% positivos"];
                      return [`${value.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`, "% comentarios positivos"];
                    }}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as MonthlySentimentPoint | undefined;
                      return p ? `${p.labelShort} · ${(p.commentsInMonth ?? 0).toLocaleString("es-MX")} comentarios` : "";
                    }}
                  />
                  <Bar dataKey="pctPositivo" name="% positivos" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {sentimentSeries.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={sentimentBarFill(entry.pctPositivo, entry.commentsInMonth > 0)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm flex flex-col min-h-[200px]">
        <CardHeader className="py-3 px-4 pb-0 shrink-0">
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            Crecimiento % del total (mes a mes)
          </h3>
          <p className="text-[11px] text-muted-foreground font-normal mt-1">
            Variación del acumulado de seguidores respecto al mes anterior.
          </p>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-2 flex-1 min-h-0">
          {growthLoading && (
            <div className="h-[200px] space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {!growthLoading && growthError && (
            <div className="h-[200px] flex items-center justify-center text-xs text-destructive text-center px-2">
              No se pudo calcular el crecimiento.
            </div>
          )}
          {!growthLoading && !growthError && momRows.length === 0 && (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground text-center px-2">
              Se necesitan al menos dos meses con datos.
            </div>
          )}
          {!growthLoading && !growthError && momRows.length > 0 && (
            <ScrollArea className="h-[200px] pr-3">
              <ul className="space-y-2.5 text-xs">
                {momRows.map((row) => {
                  const pct = row.percent;
                  const positive = pct !== null && pct > 0;
                  const negative = pct !== null && pct < 0;
                  return (
                    <li
                      key={`${row.fromLabel}-${row.toLabel}`}
                      className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0"
                    >
                      <span className="text-muted-foreground leading-snug shrink min-w-0">
                        <span className="text-foreground font-medium">{row.fromLabel}</span>
                        <span className="mx-1 text-muted-foreground/80">→</span>
                        <span className="text-foreground font-medium">{row.toLabel}</span>
                      </span>
                      <span
                        className={`shrink-0 tabular-nums font-semibold ${
                          pct === null
                            ? "text-muted-foreground"
                            : positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : negative
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                        }`}
                      >
                        {formatMomPercent(pct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
