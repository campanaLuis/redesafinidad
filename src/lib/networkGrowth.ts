import type { NetworkMember } from "@/types/network";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  startOfDay,
  startOfMonth,
  startOfYear,
  endOfMonth,
  format,
  min,
  max,
  isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";

export type GrowthMode = "day" | "month" | "year";

export interface GrowthPoint {
  key: string;
  label: string;
  nuevos: number;
  acumulado: number;
  axisLabel?: string;
  showMonthDelta?: boolean;
  monthDelta?: number;
}

export function buildUserGrowthSeries(
  members: NetworkMember[],
  mode: GrowthMode,
): { points: GrowthPoint[]; firstJoin: Date | null; lastJoin: Date | null } {
  const dates = members
    .map((m) => m.created_at)
    .filter(Boolean)
    .map((s) => new Date(String(s)))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (dates.length === 0) {
    return { points: [], firstJoin: null, lastJoin: null };
  }

  const firstJoin = min(dates);
  const lastJoin = max(dates);

  const bucketKey = (d: Date) =>
    mode === "day"
      ? format(startOfDay(d), "yyyy-MM-dd")
      : mode === "month"
        ? format(startOfMonth(d), "yyyy-MM")
        : format(startOfYear(d), "yyyy");

  const counts = new Map<string, number>();
  for (const d of dates) {
    const k = bucketKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const rangeKeys =
    mode === "day"
      ? eachDayOfInterval({
          start: startOfDay(firstJoin),
          end: startOfDay(lastJoin),
        }).map((d) => format(d, "yyyy-MM-dd"))
      : mode === "month"
      ? eachMonthOfInterval({
          start: startOfMonth(firstJoin),
          end: startOfMonth(lastJoin),
        }).map((d) => format(d, "yyyy-MM"))
      : eachYearOfInterval({
          start: startOfYear(firstJoin),
          end: startOfYear(lastJoin),
        }).map((d) => format(d, "yyyy"));

  let cum = 0;
  const monthCounts = new Map<string, number>();
  if (mode === "day") {
    for (const d of dates) {
      const monthKey = format(startOfMonth(d), "yyyy-MM");
      monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
    }
  }

  const points: GrowthPoint[] = rangeKeys.map((k, index) => {
    const nuevos = counts.get(k) ?? 0;
    cum += nuevos;
    const label =
      mode === "day"
        ? format(new Date(`${k}T12:00:00`), "d MMM yyyy", { locale: es })
        : mode === "month"
        ? format(new Date(`${k}T12:00:00`), "MMM yyyy", { locale: es })
        : k;
    if (mode !== "day") return { key: k, label, nuevos, acumulado: cum };

    const d = new Date(`${k}T12:00:00`);
    const isFirstPoint = index === 0;
    const axisLabel = isFirstPoint || d.getDate() === 1 ? format(d, "MMM yyyy", { locale: es }) : "";
    const monthKey = format(startOfMonth(d), "yyyy-MM");
    const nextKey = rangeKeys[index + 1];
    const nextDate = nextKey ? new Date(`${nextKey}T12:00:00`) : null;
    const showMonthDelta = !nextDate || format(startOfMonth(nextDate), "yyyy-MM") !== monthKey;

    return {
      key: k,
      label,
      nuevos,
      acumulado: cum,
      axisLabel,
      showMonthDelta,
      monthDelta: showMonthDelta ? monthCounts.get(monthKey) ?? 0 : undefined,
    };
  });

  return { points, firstJoin, lastJoin };
}

/** Altas con `created_at` dentro del mes calendario actual */
export function countJoinedInCurrentMonth(members: NetworkMember[]): number {
  const now = new Date();
  const interval = { start: startOfMonth(now), end: endOfMonth(now) };
  return members.filter((m) => {
    if (!m.created_at) return false;
    const d = new Date(String(m.created_at));
    if (Number.isNaN(d.getTime())) return false;
    return isWithinInterval(d, interval);
  }).length;
}

/** Crecimiento % del total acumulado entre el cierre de un mes y el siguiente: ((acum₂ − acum₁) / acum₁) × 100 */
export interface MonthOverMonthGrowthRow {
  fromLabel: string;
  toLabel: string;
  percent: number | null;
}

export function computeMonthOverMonthGrowth(points: GrowthPoint[]): MonthOverMonthGrowthRow[] {
  if (points.length < 2) return [];
  const rows: MonthOverMonthGrowthRow[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const prev = points[i].acumulado;
    const next = points[i + 1].acumulado;
    let percent: number | null;
    if (prev > 0) {
      percent = ((next - prev) / prev) * 100;
    } else {
      percent = next > 0 ? null : 0;
    }
    rows.push({
      fromLabel: points[i].label,
      toLabel: points[i + 1].label,
      percent,
    });
  }
  return rows;
}
