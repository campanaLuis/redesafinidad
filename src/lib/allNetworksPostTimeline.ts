import type { SocialCommentRow, SocialPlatformKey } from "@/hooks/useSocialPlatformStats";
import type { SocialPost } from "@/types/network";
import { samePostId } from "@/lib/socialSentimentTimeline";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CHART_SELECT_MONTHS, getDaysInCalendarMonth } from "@/lib/socialSentimentTimeline";

export type TimelineGranularity = "day" | "month" | "year";

/** Orden de apilado (abajo → arriba en el gráfico). */
export const TIMELINE_STACK_PLATFORMS: SocialPlatformKey[] = ["facebook", "instagram", "tiktok", "twitter"];

function emptyPlatformCounts(): Record<SocialPlatformKey, number> {
  return { facebook: 0, instagram: 0, tiktok: 0, twitter: 0 };
}

function addPostToCounts(cell: Record<SocialPlatformKey, number>, platform: string) {
  const k = String(platform).toLowerCase() as SocialPlatformKey;
  if (k in cell) cell[k] += 1;
}

export type PostTimelineBucket = {
  id: string;
  label: string;
  /** Total de posts en el bucket (suma de redes). */
  count: number;
  facebook: number;
  instagram: number;
  tiktok: number;
  twitter: number;
};

/** Años mostrados en vista anual: ventana terminando en `year` (inclusive). */
export const TIMELINE_YEAR_WINDOW = 6;

function parsePostDate(postedDate: string): Date | null {
  const d = new Date(postedDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Si `platform` está definido, solo se consideran posts de esa red. */
function filterPostsByPlatform<T extends { p: SocialPost }>(
  rows: T[],
  platform: SocialPlatformKey | undefined,
): T[] {
  if (!platform) return rows;
  const pl = platform.toLowerCase();
  return rows.filter((x) => String(x.p.platform).toLowerCase() === pl);
}

/**
 * Cuenta posts de todas las redes en buckets según granularidad.
 * - day: cada día del mes/año del calendario.
 * - month: cada mes del año.
 * - year: cada año en una ventana de {YEAR_WINDOW} años terminando en `year`.
 */
export function buildAllNetworksPostTimeline(
  posts: SocialPost[],
  opts: { granularity: TimelineGranularity; year: number; month: number; platform?: SocialPlatformKey },
): PostTimelineBucket[] {
  const { granularity, year, month, platform } = opts;

  let validPosts = posts
    .map((p) => ({ p, d: parsePostDate(p.posted_date) }))
    .filter((x): x is { p: SocialPost; d: Date } => x.d !== null);
  validPosts = filterPostsByPlatform(validPosts, platform);

  if (granularity === "day") {
    const days = getDaysInCalendarMonth(year, month);
    const cells = new Map<number, Record<SocialPlatformKey, number>>();
    for (let d = 1; d <= days; d++) cells.set(d, emptyPlatformCounts());
    for (const { p, d } of validPosts) {
      if (d.getFullYear() !== year || d.getMonth() !== month - 1) continue;
      const dom = d.getDate();
      const cell = cells.get(dom);
      if (cell) addPostToCounts(cell, p.platform);
    }
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const c = cells.get(day)!;
      const count = c.facebook + c.instagram + c.tiktok + c.twitter;
      return {
        id: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        label: String(day),
        count,
        ...c,
      };
    });
  }

  if (granularity === "month") {
    const cells = new Map<number, Record<SocialPlatformKey, number>>();
    for (let m = 1; m <= 12; m++) cells.set(m, emptyPlatformCounts());
    for (const { p, d } of validPosts) {
      if (d.getFullYear() !== year) continue;
      const mv = d.getMonth() + 1;
      const cell = cells.get(mv);
      if (cell) addPostToCounts(cell, p.platform);
    }
    return CHART_SELECT_MONTHS.map((m) => {
      const mv = Number(m.value);
      const c = cells.get(mv)!;
      const count = c.facebook + c.instagram + c.tiktok + c.twitter;
      return {
        id: `${year}-${m.value}`,
        label: format(new Date(year, mv - 1, 1), "MMM", { locale: es }),
        count,
        ...c,
      };
    });
  }

  const toYear = year;
  const fromYear = toYear - (TIMELINE_YEAR_WINDOW - 1);
  const cells = new Map<number, Record<SocialPlatformKey, number>>();
  for (let y = fromYear; y <= toYear; y++) cells.set(y, emptyPlatformCounts());
  for (const { p, d } of validPosts) {
    const y = d.getFullYear();
    if (y < fromYear || y > toYear) continue;
    const cell = cells.get(y);
    if (cell) addPostToCounts(cell, p.platform);
  }
  const n = toYear - fromYear + 1;
  return Array.from({ length: n }, (_, i) => {
    const y = fromYear + i;
    const c = cells.get(y)!;
    const count = c.facebook + c.instagram + c.tiktok + c.twitter;
    return { id: String(y), label: String(y), count, ...c };
  });
}

export function sumTimelineCounts(buckets: PostTimelineBucket[]): number {
  return buckets.reduce((s, b) => s + b.count, 0);
}

/** Totales por red en todo el periodo del timeline (suma de buckets). */
export function sumPlatformTotalsFromTimelineBuckets(
  buckets: PostTimelineBucket[],
): Record<SocialPlatformKey, number> & { total: number } {
  const acc = emptyPlatformCounts();
  let total = 0;
  for (const b of buckets) {
    acc.facebook += b.facebook;
    acc.instagram += b.instagram;
    acc.tiktok += b.tiktok;
    acc.twitter += b.twitter;
    total += b.count;
  }
  return { ...acc, total };
}

export type SentimentCommentBucket = {
  id: string;
  label: string;
  positivo: number;
  neutro: number;
  negativo: number;
  /** Total comentarios en el bucket. */
  count: number;
};

function emptySentimentCell(): { positivo: number; neutro: number; negativo: number } {
  return { positivo: 0, neutro: 0, negativo: 0 };
}

function addSentimentFromComments(
  cell: { positivo: number; neutro: number; negativo: number },
  platform: string,
  postId: number,
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
) {
  const platKey = String(platform).toLowerCase() as SocialPlatformKey;
  const rows = (commentsByPlatform[platKey] ?? []).filter((c) => samePostId(postId, c.post_id));
  for (const r of rows) {
    const s = (r.sentimiento || "").toLowerCase();
    if (s === "positivo") cell.positivo++;
    else if (s === "negativo") cell.negativo++;
    else cell.neutro++;
  }
}

/**
 * Comentarios agrupados por sentimiento según la **fecha de publicación del post** (mismos buckets que el timeline de posts).
 */
export function buildAllNetworksSentimentCommentTimeline(
  posts: SocialPost[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
  opts: { granularity: TimelineGranularity; year: number; month: number; platform?: SocialPlatformKey },
): SentimentCommentBucket[] {
  const { granularity, year, month, platform } = opts;

  let validPosts = posts
    .map((p) => ({ p, d: parsePostDate(p.posted_date) }))
    .filter((x): x is { p: SocialPost; d: Date } => x.d !== null);
  validPosts = filterPostsByPlatform(validPosts, platform);

  if (granularity === "day") {
    const days = getDaysInCalendarMonth(year, month);
    const cells = new Map<number, { positivo: number; neutro: number; negativo: number }>();
    for (let d = 1; d <= days; d++) cells.set(d, emptySentimentCell());
    for (const { p, d } of validPosts) {
      if (d.getFullYear() !== year || d.getMonth() !== month - 1) continue;
      const dom = d.getDate();
      const cell = cells.get(dom);
      if (cell) addSentimentFromComments(cell, p.platform, p.post_id, commentsByPlatform);
    }
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const c = cells.get(day)!;
      const count = c.positivo + c.neutro + c.negativo;
      return {
        id: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        label: String(day),
        count,
        ...c,
      };
    });
  }

  if (granularity === "month") {
    const cells = new Map<number, { positivo: number; neutro: number; negativo: number }>();
    for (let m = 1; m <= 12; m++) cells.set(m, emptySentimentCell());
    for (const { p, d } of validPosts) {
      if (d.getFullYear() !== year) continue;
      const mv = d.getMonth() + 1;
      const cell = cells.get(mv);
      if (cell) addSentimentFromComments(cell, p.platform, p.post_id, commentsByPlatform);
    }
    return CHART_SELECT_MONTHS.map((m) => {
      const mv = Number(m.value);
      const c = cells.get(mv)!;
      const count = c.positivo + c.neutro + c.negativo;
      return {
        id: `${year}-${m.value}`,
        label: format(new Date(year, mv - 1, 1), "MMM", { locale: es }),
        count,
        ...c,
      };
    });
  }

  const toYear = year;
  const fromYear = toYear - (TIMELINE_YEAR_WINDOW - 1);
  const cells = new Map<number, { positivo: number; neutro: number; negativo: number }>();
  for (let y = fromYear; y <= toYear; y++) cells.set(y, emptySentimentCell());
  for (const { p, d } of validPosts) {
    const y = d.getFullYear();
    if (y < fromYear || y > toYear) continue;
    const cell = cells.get(y);
    if (cell) addSentimentFromComments(cell, p.platform, p.post_id, commentsByPlatform);
  }
  const n = toYear - fromYear + 1;
  return Array.from({ length: n }, (_, i) => {
    const y = fromYear + i;
    const c = cells.get(y)!;
    const count = c.positivo + c.neutro + c.negativo;
    return { id: String(y), label: String(y), count, ...c };
  });
}

export function sumSentimentTimelineCommentCounts(buckets: SentimentCommentBucket[]): number {
  return buckets.reduce((s, b) => s + b.count, 0);
}

function addCommentCountForPost(
  acc: Record<SocialPlatformKey, number>,
  platform: string,
  postId: number,
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
) {
  const platKey = String(platform).toLowerCase() as SocialPlatformKey;
  const n = (commentsByPlatform[platKey] ?? []).filter((c) => samePostId(postId, c.post_id)).length;
  acc[platKey] += n;
}

/**
 * Total de comentarios por red en el mismo periodo que el timeline de sentimiento (fecha de publicación del post).
 */
export function sumPlatformCommentTotalsForSentimentPeriod(
  posts: SocialPost[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
  opts: { granularity: TimelineGranularity; year: number; month: number; platform?: SocialPlatformKey },
): Record<SocialPlatformKey, number> & { total: number } {
  const acc = emptyPlatformCounts();
  const { granularity, year, month, platform } = opts;
  const validPosts = filterPostsByPlatform(
    posts
      .map((p) => ({ p, d: parsePostDate(p.posted_date) }))
      .filter((x): x is { p: SocialPost; d: Date } => x.d !== null),
    platform,
  );

  for (const { p, d } of validPosts) {
    if (granularity === "day") {
      if (d.getFullYear() !== year || d.getMonth() !== month - 1) continue;
    } else if (granularity === "month") {
      if (d.getFullYear() !== year) continue;
    } else {
      const toYear = year;
      const fromYear = toYear - (TIMELINE_YEAR_WINDOW - 1);
      const y = d.getFullYear();
      if (y < fromYear || y > toYear) continue;
    }
    addCommentCountForPost(acc, p.platform, p.post_id, commentsByPlatform);
  }

  const total = acc.facebook + acc.instagram + acc.tiktok + acc.twitter;
  return { ...acc, total };
}
