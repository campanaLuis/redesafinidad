import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHART_SELECT_MONTHS,
  getDaysInCalendarMonth,
  MIN_HOURS_SINCE_POST_FOR_CHART,
  type PostSentimentPoint,
  type SentimentMonthSummary,
} from "@/lib/socialSentimentTimeline";
import { TIMELINE_YEAR_WINDOW } from "@/lib/allNetworksPostTimeline";
import type { TimelineGranularity } from "@/lib/allNetworksPostTimeline";
import type { SocialPlatformKey } from "@/hooks/useSocialPlatformStats";

function pct(n: number) {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function pointFill(y: number) {
  if (y >= 60) return "#22c55e";
  if (y >= 41) return "#fbbf24";
  return "#ef4444";
}

/** 0% → rojo, 100% → verde (matiz HSL); luminosidad intermedia para claro/oscuro. */
function pctPositivoColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  const hue = (p / 100) * 132;
  return `hsl(${hue} 70% 46%)`;
}

const DOT_R = 5.5;

const tooltipPanelStyle = {
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: "11px",
} as const;

const PLATFORM_LABEL: Record<SocialPlatformKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
};

const PLATFORM_SHORT: Record<SocialPlatformKey, string> = {
  facebook: "FB",
  instagram: "IG",
  tiktok: "TikTok",
  twitter: "X",
};

/** Marcas en el eje X (días 1…N del mes) sin amontonar etiquetas. */
function getDayAxisTicks(maxDay: number): number[] {
  if (maxDay <= 1) return [1];
  const step = Math.max(1, Math.ceil(maxDay / 7));
  const ticks: number[] = [1];
  for (let d = 1 + step; d < maxDay; d += step) ticks.push(d);
  if (ticks[ticks.length - 1] !== maxDay) ticks.push(maxDay);
  return [...new Set(ticks)].sort((a, b) => a - b);
}

type ChartRow = PostSentimentPoint & { fill: string };

function formatPostDate(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function PostScatterDot(props: { cx?: number; cy?: number; payload?: ChartRow }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={DOT_R}
      fill={payload?.fill ?? "hsl(var(--primary))"}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
}

function scatterPlatformLabel(platform: "all" | SocialPlatformKey): string {
  if (platform === "all") return "Todas las redes sociales";
  return PLATFORM_LABEL[platform];
}

type Props = {
  points: PostSentimentPoint[];
  summary: SentimentMonthSummary | null;
  loading: boolean;
  /** Red activa (misma que la pestaña superior en la página). */
  platform: "all" | SocialPlatformKey;
  /** Misma granularidad que el selector de periodo del timeline (día / mes / año). */
  granularity: TimelineGranularity;
  year: number;
  month: number;
};

export function SocialSentimentScatterPanel({
  points,
  summary,
  loading,
  platform,
  granularity,
  year,
  month,
}: Props) {
  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        fill:
          p.commentCount === 0 ? "hsl(var(--muted-foreground) / 0.85)" : pointFill(p.pctPositivo),
      })),
    [points],
  );

  const daysInMonth = getDaysInCalendarMonth(year, month);
  const fromTimelineYear = year - (TIMELINE_YEAR_WINDOW - 1);

  const xAxis = useMemo(() => {
    if (granularity === "day") {
      return {
        domain: [1, daysInMonth] as [number, number],
        ticks: getDayAxisTicks(daysInMonth),
        label: "Día del mes (publicación)",
        tickFormatter: (v: number) => String(v),
        angle: -28,
        bottomMargin: 92,
      };
    }
    if (granularity === "month") {
      return {
        domain: [1, 12] as [number, number],
        ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        label: "Mes de publicación",
        tickFormatter: (v: number) =>
          format(new Date(year, v - 1, 1), "MMM", { locale: es }),
        angle: -28,
        bottomMargin: 88,
      };
    }
    const ticks: number[] = [];
    for (let y = fromTimelineYear; y <= year; y++) ticks.push(y);
    return {
      domain: [fromTimelineYear, year] as [number, number],
      ticks,
      label: "Año de publicación",
      tickFormatter: (v: number) => String(v),
      angle: 0,
      bottomMargin: 56,
    };
  }, [granularity, daysInMonth, year, fromTimelineYear]);

  const platformLabel = scatterPlatformLabel(platform);
  const monthLabel = CHART_SELECT_MONTHS.find((m) => m.value === String(month))?.label ?? String(month);

  const emptyPeriodDescription = useMemo(() => {
    if (granularity === "day") {
      return (
        <>
          <span className="font-medium text-foreground">
            {monthLabel} {year}
          </span>
        </>
      );
    }
    if (granularity === "month") {
      return (
        <>
          el año <span className="font-medium text-foreground">{year}</span>
        </>
      );
    }
    return (
      <>
        {fromTimelineYear}–<span className="font-medium text-foreground">{year}</span>
      </>
    );
  }, [granularity, monthLabel, year, fromTimelineYear]);

  const sentimentBreakdownPct = useMemo(() => {
    if (!summary || summary.commentsInMonth <= 0) return null;
    const t = summary.commentsInMonth;
    return {
      positivo: (summary.positivos / t) * 100,
      neutro: (summary.neutros / t) * 100,
      negativo: (summary.negativos / t) * 100,
    };
  }, [summary]);

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm overflow-visible">
        <CardHeader className="pb-2 pt-5 px-5 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-full max-w-md" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 pt-0">
          <Skeleton className="h-[min(360px,42vh)] min-h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm overflow-visible">
      <CardHeader className="pb-2 pt-5 px-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Sentimiento por Post</h2>
          <p className="text-xs text-muted-foreground">
            Red y periodo del timeline se eligen arriba (por día, por mes o por año). El eje horizontal sigue esa
            misma vista. Solo entran posts con al menos {MIN_HOURS_SINCE_POST_FOR_CHART} h desde su fecha de
            publicación.
          </p>
        </div>

        {summary && (
          <div className="space-y-3 pt-1 border-t border-border/50">
            <div className="flex items-start justify-between gap-4 text-xs">
              <span className="text-foreground font-medium shrink min-w-0">{platformLabel}</span>
              <span className="shrink-0 text-right text-muted-foreground leading-relaxed tabular-nums">
                {summary.postsInMonth.toLocaleString("es-MX")} posts
                <span className="text-muted-foreground/70"> · </span>
                {summary.commentsInMonth.toLocaleString("es-MX")} comentarios
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-4 border-border/80 shadow-none bg-card hover:bg-muted/20 transition-colors min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sentimiento del periodo</p>
                <p
                  className="text-4xl font-bold tracking-tight tabular-nums mt-1"
                  style={{ color: pctPositivoColor(summary.pctPositivoPromedio) }}
                >
                  {pct(summary.pctPositivoPromedio)}%
                </p>
              </Card>
              <Card className="p-4 border-border/80 shadow-none bg-card hover:bg-muted/20 transition-colors min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Desglose comentarios</p>
                {sentimentBreakdownPct ? (
                  <ul className="space-y-1.5 text-xs mt-2">
                    <li className="flex justify-between gap-3 tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Positivos</span>
                      <span className="text-foreground font-semibold">{pct(sentimentBreakdownPct.positivo)}%</span>
                    </li>
                    <li className="flex justify-between gap-3 tabular-nums">
                      <span className="text-amber-600 dark:text-amber-500 font-medium">Neutros</span>
                      <span className="text-foreground font-semibold">{pct(sentimentBreakdownPct.neutro)}%</span>
                    </li>
                    <li className="flex justify-between gap-3 tabular-nums">
                      <span className="text-red-600 dark:text-red-400 font-medium">Negativos</span>
                      <span className="text-foreground font-semibold">{pct(sentimentBreakdownPct.negativo)}%</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">Sin comentarios en el periodo.</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6 pt-0 overflow-visible">
        {chartData.length === 0 ? (
          <div className="h-[min(360px,42vh)] min-h-[260px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            No hay datos en <span className="font-medium text-foreground">{platformLabel}</span> para {emptyPeriodDescription}{" "}
            (posts con ≥{MIN_HOURS_SINCE_POST_FOR_CHART} h desde la publicación).
          </div>
        ) : (
          <div className="w-full min-h-[280px] h-[min(400px,50vh)]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                key={`sentiment-${platform}-${granularity}-${year}-${month}`}
                margin={{ top: 16, right: 14, left: 2, bottom: xAxis.bottomMargin }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="scatterX"
                  domain={xAxis.domain}
                  ticks={xAxis.ticks}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  axisLine={false}
                  angle={xAxis.angle}
                  textAnchor={xAxis.angle === 0 ? "middle" : "end"}
                  height={granularity === "year" ? 48 : 78}
                  tickMargin={10}
                  allowDecimals={false}
                  tickFormatter={xAxis.tickFormatter}
                  label={{
                    value: xAxis.label,
                    position: "bottom",
                    offset: granularity === "year" ? 22 : 36,
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="pctPositivo"
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(v) => `${v}%`}
                  width={44}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={tooltipPanelStyle}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as ChartRow;
                    const periodLine =
                      granularity === "day"
                        ? `Día ${p.scatterX}`
                        : granularity === "month"
                          ? format(new Date(year, p.scatterX - 1, 1), "MMMM yyyy", { locale: es })
                          : `Año ${p.scatterX}`;
                    return (
                      <div className="text-[11px] max-w-[240px]">
                        <p className="font-medium text-foreground mb-1">
                          {periodLine} · {PLATFORM_SHORT[p.platform]} · post {p.post_id}
                        </p>
                        <p className="text-muted-foreground">{formatPostDate(p.posted_date)}</p>
                        <p className="text-muted-foreground mt-1">
                          % positivos en el post:{" "}
                          <span className="text-foreground font-semibold tabular-nums">{pct(p.pctPositivo)}%</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {p.commentCount === 0 ? (
                            <span className="text-amber-600 dark:text-amber-500">Sin comentarios registrados</span>
                          ) : (
                            <>
                              Comentarios analizados:{" "}
                              <span className="text-foreground font-medium tabular-nums">
                                {p.commentCount.toLocaleString("es-MX")}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter isAnimationActive={false} data={chartData} shape={PostScatterDot} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground text-center mt-3 px-2 leading-snug">
              Eje horizontal:{" "}
              {granularity === "day"
                ? "día del mes de publicación"
                : granularity === "month"
                  ? "mes del año de publicación"
                  : "año de publicación"}
              . Eje vertical: % de comentarios <span className="text-foreground font-medium">positivos</span> en ese
              post.
            </p>
          </div>
        )}

        {chartData.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 text-[11px] text-muted-foreground pt-0.5">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/70" />
              Sin comentarios (0%)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              Post ≥60% comentarios positivos
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              41–59% (mixto)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              ≤40% positivos
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
