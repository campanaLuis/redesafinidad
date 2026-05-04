import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GrowthPoint } from "@/lib/networkGrowth";

const LINE_COLOR = "hsl(var(--primary))";

type LabelContentProps = {
  x?: string | number;
  y?: string | number;
  value?: string | number;
  index?: number;
  payload?: GrowthPoint;
};

interface UserGrowthChartProps {
  points: GrowthPoint[];
  firstJoin: Date | null;
  lastJoin: Date | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

function formatRange(from: Date | null, to: Date | null): string {
  if (!from || !to) return "";
  try {
    const a = format(from, "d MMM yyyy", { locale: es });
    const b = format(to, "d MMM yyyy", { locale: es });
    return `Desde ${a} hasta ${b}`;
  } catch {
    return "";
  }
}

/** Arriba: nuevos del mes en verde +N. Debajo: total acumulado. Ambos sobre el punto. */
function renderPointLabels(props: LabelContentProps, points: GrowthPoint[]) {
  const { x, y, value, payload, index } = props;
  const nx = Number(x);
  const ny = Number(y);
  const acumulado = typeof value === "number" ? value : Number(value);
  const row = payload ?? (typeof index === "number" ? points[index] : undefined);
  if (!row?.showMonthDelta) return null;
  const nuevosMes = row?.monthDelta ?? 0;
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(acumulado)) return null;
  const growthStr = `${nuevosMes >= 0 ? "+" : ""}${nuevosMes.toLocaleString("es-MX")}`;
  return (
    <g className="pointer-events-none select-none">
      <text
        x={nx}
        y={ny - 18}
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
        className="tabular-nums fill-emerald-600 dark:fill-emerald-400"
      >
        {growthStr}
      </text>
    </g>
  );
}

export function UserGrowthChart({
  points,
  firstJoin,
  lastJoin,
  isLoading,
  isError,
  errorMessage,
}: UserGrowthChartProps) {
  return (
    <Card className="border-border/80 shadow-sm overflow-visible">
      <CardHeader className="pb-2 pt-5 px-5 space-y-1">
        <h2 className="text-base font-semibold text-foreground">Crecimiento de usuarios en la red</h2>
        <p className="text-xs text-muted-foreground">
          Vista diaria acumulada. {formatRange(firstJoin, lastJoin) || "Acumulado real día a día según fecha de registro."}
        </p>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6 pt-0 overflow-visible">
        {isLoading && (
          <div className="h-[min(360px,42vh)] min-h-[260px] flex flex-col justify-center gap-3 px-2">
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </div>
        )}
        {!isLoading && isError && (
          <div className="h-[min(360px,42vh)] min-h-[260px] flex items-center justify-center text-sm text-destructive px-4 text-center">
            {errorMessage ?? "No se pudieron cargar los datos de la red."}
          </div>
        )}
        {!isLoading && !isError && points.length === 0 && (
          <div className="h-[min(360px,42vh)] min-h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            No hay fechas de registro para graficar.
          </div>
        )}
        {!isLoading && !isError && points.length > 0 && (
          <div className="h-[min(440px,50vh)] w-full min-h-[320px] overflow-visible px-2 sm:px-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ top: 34, right: 18, left: 10, bottom: 18 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis
                  dataKey="key"
                  tickFormatter={(value: string, index: number) => {
                    const row = points[index];
                    return row?.axisLabel ?? "";
                  }}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  height={44}
                  minTickGap={22}
                  padding={{ left: 8, right: 8 }}
                  tickMargin={10}
                />
                <YAxis
                  width={48}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as GrowthPoint;
                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-foreground mb-1">{row.label}</p>
                        <p className="text-muted-foreground">
                          Nuevos en el día:{" "}
                          <span className="text-foreground font-medium tabular-nums">{row.nuevos}</span>
                        </p>
                        {row.showMonthDelta && row.monthDelta != null && (
                          <p className="text-muted-foreground mt-0.5">
                            Nuevos en el mes:{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                              +{row.monthDelta.toLocaleString("es-MX")}
                            </span>
                          </p>
                        )}
                        <p className="text-muted-foreground mt-0.5">
                          Total acumulado:{" "}
                          <span className="text-foreground font-medium tabular-nums">
                            {row.acumulado.toLocaleString("es-MX")}
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="acumulado"
                  name="acumulado"
                  stroke={LINE_COLOR}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
                >
                  <LabelList
                    dataKey="acumulado"
                    content={(p: LabelContentProps) => renderPointLabels(p, points)}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {!isLoading && !isError && points.length > 0 && (
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">
            La línea muestra el acumulado real día a día. Los cambios mensuales se señalan al cierre de cada mes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
