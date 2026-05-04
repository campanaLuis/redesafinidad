import { useMemo, type CSSProperties, type ComponentType } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SocialCommentRow, SocialPlatformKey } from "@/hooks/useSocialPlatformStats";
import type { SocialPost } from "@/types/network";
import {
  buildAllNetworksSentimentCommentTimeline,
  sumPlatformCommentTotalsForSentimentPeriod,
  sumSentimentTimelineCommentCounts,
  TIMELINE_YEAR_WINDOW,
  type SentimentCommentBucket,
  type TimelineGranularity,
} from "@/lib/allNetworksPostTimeline";
import { cn } from "@/lib/utils";
import { Facebook, Instagram, Twitter } from "lucide-react";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/** Misma presentación que en publicaciones: totales por red = comentarios aquí. */
const PLATFORM_PERF_META: {
  key: SocialPlatformKey;
  label: string;
  short: string;
  fill: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "facebook", label: "Facebook", short: "FB", fill: "#2563eb", Icon: Facebook },
  { key: "instagram", label: "Instagram", short: "IG", fill: "#ec4899", Icon: Instagram },
  { key: "tiktok", label: "TikTok", short: "TT", fill: "#71717a", Icon: TikTokIcon },
  { key: "twitter", label: "X", short: "X", fill: "#0ea5e9", Icon: Twitter },
];

const SENTIMENT_STACK: { key: keyof Pick<SentimentCommentBucket, "negativo" | "neutro" | "positivo">; label: string; fill: string }[] = [
  { key: "negativo", label: "Negativo", fill: "#ef4444" },
  { key: "neutro", label: "Neutro", fill: "#fbbf24" },
  { key: "positivo", label: "Positivo", fill: "#22c55e" },
];

/** Orden en el tooltip (positivo → neutro → negativo). */
const TOOLTIP_SENTIMENT_ORDER: typeof SENTIMENT_STACK = [
  { key: "positivo", label: "Positivo", fill: "#22c55e" },
  { key: "neutro", label: "Neutro", fill: "#fbbf24" },
  { key: "negativo", label: "Negativo", fill: "#ef4444" },
];

const tooltipStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--popover))",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.12), 0 4px 6px -4px rgb(0 0 0 / 0.08)",
  padding: "10px 12px",
  fontSize: 11,
  opacity: 1,
};

type Props = {
  posts: SocialPost[] | null;
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]> | null;
  loading: boolean;
  year: number;
  month: number;
  granularity: TimelineGranularity;
  /** "all" = métricas por red; una red = solo esa red. */
  viewPlatform?: "all" | SocialPlatformKey;
};

function pctOf(n: number, total: number): number {
  if (total <= 0) return 0;
  return (n / total) * 100;
}

export function GeneralSentimentCommentsTimelinePanel({
  posts,
  commentsByPlatform,
  loading,
  year,
  month,
  granularity,
  viewPlatform = "all",
}: Props) {
  const platformFilter = viewPlatform === "all" ? undefined : viewPlatform;
  const perfMeta = useMemo(
    () =>
      platformFilter
        ? PLATFORM_PERF_META.filter((m) => m.key === platformFilter)
        : PLATFORM_PERF_META,
    [platformFilter],
  );
  const panelTitle =
    viewPlatform === "all"
      ? "Sentimiento de comentarios (todas las redes)"
      : `Sentimiento de comentarios — ${PLATFORM_PERF_META.find((m) => m.key === viewPlatform)?.label ?? viewPlatform}`;

  const buckets = useMemo((): SentimentCommentBucket[] => {
    if (!posts?.length || !commentsByPlatform) return [];
    return buildAllNetworksSentimentCommentTimeline(posts, commentsByPlatform, {
      granularity,
      year,
      month,
      platform: platformFilter,
    });
  }, [posts, commentsByPlatform, granularity, year, month, platformFilter]);

  /** Suma de comentarios en los mismos buckets que alimentan el gráfico (cambia con periodo y pestaña). */
  const totalCommentsInChart = useMemo(() => sumSentimentTimelineCommentCounts(buckets), [buckets]);

  const platformTotals = useMemo((): Record<SocialPlatformKey, number> & { total: number } => {
    if (!posts?.length || !commentsByPlatform) {
      return { facebook: 0, instagram: 0, tiktok: 0, twitter: 0, total: 0 };
    }
    return sumPlatformCommentTotalsForSentimentPeriod(posts, commentsByPlatform, {
      granularity,
      year,
      month,
      platform: platformFilter,
    });
  }, [posts, commentsByPlatform, granularity, year, month, platformFilter]);

  const platformTotalsAllNetworks = useMemo((): Record<SocialPlatformKey, number> & { total: number } => {
    if (!posts?.length || !commentsByPlatform) {
      return { facebook: 0, instagram: 0, tiktok: 0, twitter: 0, total: 0 };
    }
    return sumPlatformCommentTotalsForSentimentPeriod(posts, commentsByPlatform, {
      granularity,
      year,
      month,
    });
  }, [posts, commentsByPlatform, granularity, year, month]);

  const isSingleNetworkView = perfMeta.length === 1;

  const metaHint =
    granularity === "day"
      ? `Cada barra = comentarios por día del mes seleccionado (${year}).`
      : granularity === "month"
        ? `Doce barras: un mes del año ${year}.`
        : `Ventana de ${TIMELINE_YEAR_WINDOW} años hasta ${year}.`;

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm overflow-visible">
        <CardHeader className="pb-2 pt-4 px-4 space-y-2">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-4 pt-0 space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-[min(220px,32vh)] min-h-[180px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm overflow-visible">
      <CardHeader className="pb-2 pt-4 px-4 space-y-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{panelTitle}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Misma agrupación de periodo que el gráfico de publicaciones. La altura de cada barra es el total de
            comentarios en ese tramo; el apilado reparte positivos, neutros y negativos (fecha de publicación del post).
          </p>
          <p className="text-[11px] text-muted-foreground/90">{metaHint}</p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums pt-1">
          Comentarios en el periodo visualizado:{" "}
          <span className="font-semibold text-foreground">{totalCommentsInChart.toLocaleString("es-MX")}</span>
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-4 pt-0 space-y-3">
        <div className="rounded-lg border border-border/70 bg-muted/25 p-2 sm:p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Rendimiento por red en este periodo
          </p>
          <div
            className={cn(
              "grid gap-1.5 sm:gap-2",
              perfMeta.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2 lg:grid-cols-4",
            )}
          >
            {perfMeta.map(({ key, label, short, fill, Icon }) => {
              const n = platformTotals[key];
              /** Una sola red: el total debe coincidir con la suma de barras del gráfico. */
              const displayCount = isSingleNetworkView ? totalCommentsInChart : n;
              const pctOfSlice = platformTotals.total > 0 ? (n / platformTotals.total) * 100 : 0;
              const pctOfAllNetworks =
                platformTotalsAllNetworks.total > 0
                  ? (platformTotalsAllNetworks[key] / platformTotalsAllNetworks.total) * 100
                  : 0;
              const pctLabel = isSingleNetworkView ? pctOfAllNetworks : pctOfSlice;
              const pctCaption = isSingleNetworkView
                ? "% del total en todas las redes (mismo periodo)"
                : "% del total en este periodo";
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-md border bg-card/80 px-2 py-2 sm:px-2.5 min-w-0",
                    "border-l-[3px] shadow-sm",
                  )}
                  style={{ borderLeftColor: fill }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: fill }} aria-hidden />
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
                      {short} · {label}
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-bold tabular-nums text-foreground leading-tight">
                    {displayCount.toLocaleString("es-MX")}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 leading-snug">
                    {platformTotals.total > 0 && platformTotalsAllNetworks.total > 0 ? (
                      <>
                        {pctLabel.toLocaleString("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 0 })}{" "}
                        {pctCaption}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              );
            })}
          </div>
          {platformTotals.total > 0 && !isSingleNetworkView && (
            <div className="space-y-1 pt-0.5">
              <p className="text-[9px] text-muted-foreground">
                Distribución de comentarios por red (mismo periodo y criterio que el gráfico)
              </p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/40">
                {perfMeta.map(({ key, fill }) => {
                  const n = platformTotals[key];
                  const w = platformTotals.total > 0 ? (n / platformTotals.total) * 100 : 0;
                  if (w <= 0) return null;
                  return (
                    <div
                      key={key}
                      className="h-full min-w-0 transition-[width] duration-300"
                      style={{ width: `${w}%`, backgroundColor: fill }}
                      title={`${key}: ${w.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          key={`sentiment-chart-wrap-${granularity}-${year}-${month}-${viewPlatform}`}
          className="w-full min-h-[180px] h-[min(240px,34vh)]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={`comments-${granularity}-${year}-${month}-${viewPlatform}`}
              data={buckets}
              margin={{ top: 8, right: 6, left: 0, bottom: granularity === "day" ? 24 : 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                interval={granularity === "day" && buckets.length > 16 ? 1 : 0}
                angle={granularity === "day" ? -32 : 0}
                textAnchor={granularity === "day" ? "end" : "middle"}
                height={granularity === "day" ? 48 : 28}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
                domain={[0, "auto"]}
                tickFormatter={(v) => Number(v).toLocaleString("es-MX")}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                contentStyle={tooltipStyle}
                wrapperStyle={{ outline: "none", opacity: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as SentimentCommentBucket | undefined;
                  if (!row) return null;
                  const t = row.count;
                  let title = row.label;
                  if (granularity === "day" && row.id) {
                    const parts = row.id.split("-").map(Number);
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                      const [y, mo, d] = parts;
                      title = format(new Date(y, mo - 1, d), "d MMM yyyy", { locale: es });
                    }
                  } else if (granularity === "month") {
                    title = `${row.label} ${year}`;
                  } else if (granularity === "year") {
                    title = `Año ${row.label}`;
                  }
                  return (
                    <div className="text-[11px] space-y-1.5 min-w-[160px] text-popover-foreground">
                      <p className="font-medium border-b border-border pb-1">{title}</p>
                      <p className="text-muted-foreground">
                        Comentarios:{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                          {t.toLocaleString("es-MX")}
                        </span>
                      </p>
                      <ul className="space-y-0.5">
                        {TOOLTIP_SENTIMENT_ORDER.map(({ key, label, fill }) => {
                          const n = row[key];
                          if (n <= 0) return null;
                          const share = pctOf(n, t);
                          return (
                            <li key={key} className="flex justify-between gap-3 tabular-nums">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: fill }} />
                                <span className="text-foreground">{label}</span>
                              </span>
                              <span className="text-foreground">
                                {n.toLocaleString("es-MX")}{" "}
                                <span className="text-muted-foreground">({formatPct(share)}%)</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingTop: 4 }}
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
              />
              {SENTIMENT_STACK.map(({ key, label, fill }, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  stackId="sentiment"
                  fill={fill}
                  radius={idx === SENTIMENT_STACK.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={granularity === "day" ? 12 : 28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 px-2 leading-snug">
          Eje vertical: número de comentarios (altura total de la barra = comentarios en ese periodo). Capas: negativo ·
          neutro · positivo.
        </p>
      </CardContent>
    </Card>
  );
}

function formatPct(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}
