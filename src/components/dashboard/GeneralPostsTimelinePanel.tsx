import { useMemo, type ComponentType } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SocialPlatformKey } from "@/hooks/useSocialPlatformStats";
import type { SocialPost } from "@/types/network";
import {
  buildAllNetworksPostTimeline,
  sumPlatformTotalsFromTimelineBuckets,
  sumTimelineCounts,
  TIMELINE_YEAR_WINDOW,
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

/** Colores alineados con las tarjetas de red en Redes sociales. */
const STACK_META: {
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

export const GRANULARITY_OPTIONS: { value: TimelineGranularity; label: string; hint: string }[] = [
  { value: "day", label: "Por día", hint: "Cada barra es un día del mes y año seleccionados." },
  { value: "month", label: "Por mes", hint: "Doce barras: cada mes del año seleccionado (el mes del selector no aplica)." },
  {
    value: "year",
    label: "Por año",
    hint: `Barras por año: ventana de ${TIMELINE_YEAR_WINDOW} años hasta el año seleccionado.`,
  },
];

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: "11px",
} as const;

type Props = {
  posts: SocialPost[] | null;
  loading: boolean;
  year: number;
  month: number;
  granularity: TimelineGranularity;
  onGranularityChange: (g: TimelineGranularity) => void;
  /** Si es false, no se muestra el selector aquí (p. ej. control en la barra de pestañas). */
  embedGranularityControl?: boolean;
  /** "all" = las cuatro redes apiladas; una red concreta = solo esa red. */
  viewPlatform?: "all" | SocialPlatformKey;
};

export function GeneralPostsTimelinePanel({
  posts,
  loading,
  year,
  month,
  granularity,
  onGranularityChange,
  embedGranularityControl = true,
  viewPlatform = "all",
}: Props) {
  const platformFilter = viewPlatform === "all" ? undefined : viewPlatform;
  const stackVisual = useMemo(
    () => (platformFilter ? STACK_META.filter((m) => m.key === platformFilter) : STACK_META),
    [platformFilter],
  );
  const panelTitle =
    viewPlatform === "all"
      ? "Publicaciones en todas las redes"
      : `Publicaciones — ${STACK_META.find((m) => m.key === viewPlatform)?.label ?? viewPlatform}`;

  const buckets = useMemo(
    () => buildAllNetworksPostTimeline(posts ?? [], { granularity, year, month, platform: platformFilter }),
    [posts, granularity, year, month, platformFilter],
  );

  /** Misma ventana temporal sin filtrar red: sirve para % respecto al total general en vistas de una sola red. */
  const platformTotalsAllNetworks = useMemo(() => {
    const allBuckets = buildAllNetworksPostTimeline(posts ?? [], { granularity, year, month });
    return sumPlatformTotalsFromTimelineBuckets(allBuckets);
  }, [posts, granularity, year, month]);

  const total = useMemo(() => sumTimelineCounts(buckets), [buckets]);

  const platformTotals = useMemo(() => sumPlatformTotalsFromTimelineBuckets(buckets), [buckets]);

  const isSingleNetworkView = stackVisual.length === 1;

  const meta = GRANULARITY_OPTIONS.find((o) => o.value === granularity)!;

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm overflow-visible">
        <CardHeader className="pb-2 pt-4 px-4 space-y-2">
          <Skeleton className="h-5 w-64" />
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
        <div
          className={
            embedGranularityControl
              ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              : "space-y-1"
          }
        >
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">{panelTitle}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{meta.hint}</p>
          </div>
          {embedGranularityControl && (
            <div className="shrink-0 w-full sm:w-[min(100%,220px)]">
              <label className="sr-only" htmlFor="timeline-granularity">
                Agrupación del timeline
              </label>
              <Select
                value={granularity}
                onValueChange={(v) => onGranularityChange(v as TimelineGranularity)}
              >
                <SelectTrigger id="timeline-granularity" className="h-10 text-sm" aria-label="Agrupación del timeline">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRANULARITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {viewPlatform === "all" && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Total en este periodo:{" "}
            <span className="font-semibold text-foreground">{total.toLocaleString("es-MX")} posts</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-4 pt-0 space-y-3">
        <div className="rounded-lg border border-border/70 bg-muted/25 p-2 sm:p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Rendimiento por red en este periodo
          </p>
          <div
            className={cn(
              "grid gap-1.5 sm:gap-2",
              stackVisual.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2 lg:grid-cols-4",
            )}
          >
            {stackVisual.map(({ key, label, short, fill, Icon }) => {
              const n = platformTotals[key];
              const pctOfSlice =
                platformTotals.total > 0 ? (n / platformTotals.total) * 100 : 0;
              const pctOfAllNetworks =
                platformTotalsAllNetworks.total > 0
                  ? (platformTotalsAllNetworks[key] / platformTotalsAllNetworks.total) * 100
                  : 0;
              const pctLabel = isSingleNetworkView
                ? pctOfAllNetworks
                : pctOfSlice;
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
                    {n.toLocaleString("es-MX")}
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
              <p className="text-[9px] text-muted-foreground">Distribución del volumen (mismos datos que el gráfico)</p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/40">
                {stackVisual.map(({ key, fill }) => {
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

        <div className="w-full min-h-[180px] h-[min(240px,34vh)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={`posts-${granularity}-${year}-${month}-${viewPlatform}`}
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
                width={40}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                contentStyle={tooltipStyle}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as Record<string, unknown> | undefined;
                  const total = stackVisual.reduce((s, { key: k }) => s + Number(row?.[k] ?? 0), 0);
                  let title = String(label ?? "");
                  const item = row as { id?: string; label?: string } | undefined;
                  if (granularity === "day" && item?.id) {
                    const parts = item.id.split("-").map(Number);
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                      const [y, m, d] = parts;
                      title = format(new Date(y, m - 1, d), "d MMM yyyy", { locale: es });
                    }
                  } else if (granularity === "month") {
                    title = `Mes: ${item?.label ?? ""} ${year}`;
                  } else if (granularity === "year") {
                    title = `Año ${item?.label ?? ""}`;
                  }
                  return (
                    <div className="text-[11px] space-y-1.5 min-w-[140px]">
                      <p className="font-medium text-foreground border-b border-border/60 pb-1">{title}</p>
                      <p className="text-muted-foreground">
                        Total:{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                          {total.toLocaleString("es-MX")} posts
                        </span>
                      </p>
                      <ul className="space-y-0.5">
                        {stackVisual.map(({ key, label: platLabel, fill }) => {
                          const n = Number(row?.[key] ?? 0);
                          if (n <= 0) return null;
                          return (
                            <li key={key} className="flex justify-between gap-3 tabular-nums">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: fill }} />
                                <span className="text-foreground">{platLabel}</span>
                              </span>
                              <span className="font-medium text-foreground">{n.toLocaleString("es-MX")}</span>
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
              {stackVisual.map(({ key, label, fill }, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  stackId="timeline"
                  fill={fill}
                  radius={idx === stackVisual.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={granularity === "day" ? 12 : 28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
