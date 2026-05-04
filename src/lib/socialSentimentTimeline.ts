import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SocialPost } from "@/types/network";
import type { SocialCommentRow, SocialPlatformKey } from "@/hooks/useSocialPlatformStats";
import type { TimelineGranularity } from "@/lib/allNetworksPostTimeline";

/** Debe coincidir con TIMELINE_YEAR_WINDOW en allNetworksPostTimeline (vista anual del timeline). */
const SENTIMENT_SCATTER_YEAR_WINDOW = 6;

/** Misma ventana que “post activo” en la red: solo posts con al menos 60 h desde publicación. */
export const MIN_HOURS_SINCE_POST_FOR_CHART = 60;

/** Meses para los selectores de periodo del gráfico de sentimiento (calendario). */
export const CHART_SELECT_MONTHS: { value: string; label: string }[] = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function getChartYearSelectOptions(): number[] {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4, y - 5];
}

/** Cantidad de días del mes calendario (mes 1–12). */
export function getDaysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const MS_PER_HOUR = 60 * 60 * 1000;

export type PostSentimentPoint = {
  /** Orden 1..N según fecha del post (dentro del filtro). */
  index: number;
  /**
   * Eje X del scatter según granularidad del timeline: día del mes (1–31), mes (1–12)
   * o año de publicación (p. ej. 2021).
   */
  scatterX: number;
  post_id: number;
  platform: SocialPlatformKey;
  posted_date: string;
  /** % de comentarios positivos en ese post (0 si no hay comentarios). */
  pctPositivo: number;
  commentCount: number;
};

export type SentimentMonthSummary = {
  postsInMonth: number;
  commentsInMonth: number;
  pctPositivoPromedio: number;
  positivos: number;
  neutros: number;
  negativos: number;
};

/** Alinea IDs numéricos (123 vs "123") y evita fallos de matching entre posts y comentarios por red. */
function normalizePostIdForKey(id: unknown): string {
  if (id === null || id === undefined) return "";
  const n = Number(id);
  if (Number.isFinite(n)) return String(n);
  return String(id).trim();
}

function postKey(platform: string, postId: unknown) {
  return `${String(platform).toLowerCase()}:${normalizePostIdForKey(postId)}`;
}

export function samePostId(a: unknown, b: unknown): boolean {
  return normalizePostIdForKey(a) === normalizePostIdForKey(b);
}

export function hoursSincePost(postedDate: string): number {
  const t = new Date(postedDate).getTime();
  if (Number.isNaN(t)) return NaN;
  return (Date.now() - t) / MS_PER_HOUR;
}

function isPostOldEnoughForChart(postedDate: string, minHours: number): boolean {
  const h = hoursSincePost(postedDate);
  if (Number.isNaN(h)) return false;
  return h >= minHours;
}

/** Año/mes del selector (Select puede entregar strings); invalida si no es un mes 1–12. */
function normalizePeriod(year: unknown, month: unknown): { year: number; month: number } | null {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function postMatchesSentimentGranularity(
  postedDate: string,
  granularity: TimelineGranularity,
  year: number,
  month: number,
): boolean {
  const d = new Date(postedDate);
  if (Number.isNaN(d.getTime())) return false;
  if (granularity === "day") {
    return d.getFullYear() === year && d.getMonth() === month - 1;
  }
  if (granularity === "month") {
    return d.getFullYear() === year;
  }
  const toYear = year;
  const fromYear = toYear - (SENTIMENT_SCATTER_YEAR_WINDOW - 1);
  const y = d.getFullYear();
  return y >= fromYear && y <= toYear;
}

function scatterXFromPostDate(postedDate: string, granularity: TimelineGranularity): number {
  const d = new Date(postedDate);
  if (Number.isNaN(d.getTime())) return 1;
  if (granularity === "day") return d.getDate();
  if (granularity === "month") return d.getMonth() + 1;
  return d.getFullYear();
}

/**
 * Un punto por post elegible (misma ventana temporal que el timeline de publicaciones) y ≥ `minHoursSincePost` h.
 * Eje X: día del mes, mes del año o año, según granularidad.
 */
export function buildPostSentimentPoints(
  posts: SocialPost[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
  opts: {
    platform: "all" | SocialPlatformKey;
    granularity: TimelineGranularity;
    year: number;
    month: number;
    minHoursSincePost?: number;
  },
): PostSentimentPoint[] {
  const { granularity } = opts;
  if (granularity === "day") {
    const period = normalizePeriod(opts.year, opts.month);
    if (!period) return [];
  } else if (!Number.isFinite(opts.year)) {
    return [];
  }

  const minH = opts.minHoursSincePost ?? MIN_HOURS_SINCE_POST_FOR_CHART;
  const y = opts.year;
  const m = opts.month;

  const filtered = posts.filter((p) => {
    if (opts.platform !== "all" && String(p.platform).toLowerCase() !== opts.platform) return false;
    if (!postMatchesSentimentGranularity(p.posted_date, granularity, y, m)) return false;
    return isPostOldEnoughForChart(p.posted_date, minH);
  });

  filtered.sort((a, b) => new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime());

  const points: PostSentimentPoint[] = [];
  let index = 0;
  for (const post of filtered) {
    const scatterX = scatterXFromPostDate(post.posted_date, granularity);

    const platKey = String(post.platform).toLowerCase() as SocialPlatformKey;
    const rows = (commentsByPlatform[platKey] ?? []).filter((c) => samePostId(post.post_id, c.post_id));
    index++;
    if (rows.length === 0) {
      points.push({
        index,
        scatterX,
        post_id: post.post_id,
        platform: platKey,
        posted_date: post.posted_date,
        pctPositivo: 0,
        commentCount: 0,
      });
      continue;
    }
    let pos = 0;
    for (const r of rows) {
      if ((r.sentimiento || "").toLowerCase() === "positivo") pos++;
    }
    points.push({
      index,
      scatterX,
      post_id: post.post_id,
      platform: platKey,
      posted_date: post.posted_date,
      pctPositivo: (pos / rows.length) * 100,
      commentCount: rows.length,
    });
  }
  return points;
}

/** Resumen alineado con los mismos posts que el gráfico (misma ventana temporal que el timeline, ≥60 h, red). */
export function getSentimentChartSummary(
  posts: SocialPost[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
  opts: {
    platform: "all" | SocialPlatformKey;
    granularity: TimelineGranularity;
    year: number;
    month: number;
    minHoursSincePost?: number;
  },
): SentimentMonthSummary {
  const { granularity } = opts;
  if (granularity === "day") {
    const period = normalizePeriod(opts.year, opts.month);
    if (!period) {
      return {
        postsInMonth: 0,
        commentsInMonth: 0,
        pctPositivoPromedio: 0,
        positivos: 0,
        neutros: 0,
        negativos: 0,
      };
    }
  } else if (!Number.isFinite(opts.year)) {
    return {
      postsInMonth: 0,
      commentsInMonth: 0,
      pctPositivoPromedio: 0,
      positivos: 0,
      neutros: 0,
      negativos: 0,
    };
  }

  const minH = opts.minHoursSincePost ?? MIN_HOURS_SINCE_POST_FOR_CHART;
  const y = opts.year;
  const m = opts.month;

  const eligibleKeys = new Set<string>();
  let postsVisible = 0;
  for (const p of posts) {
    if (opts.platform !== "all" && String(p.platform).toLowerCase() !== opts.platform) continue;
    if (!postMatchesSentimentGranularity(p.posted_date, granularity, y, m)) continue;
    if (!isPostOldEnoughForChart(p.posted_date, minH)) continue;
    postsVisible++;
    eligibleKeys.add(postKey(p.platform, p.post_id));
  }

  const platforms: SocialPlatformKey[] =
    opts.platform === "all" ? ["facebook", "instagram", "tiktok", "twitter"] : [opts.platform];

  let positivos = 0;
  let negativos = 0;
  let neutros = 0;
  let commentsTotal = 0;

  for (const plat of platforms) {
    for (const c of commentsByPlatform[plat] ?? []) {
      if (!eligibleKeys.has(postKey(plat, c.post_id))) continue;
      commentsTotal++;
      const sent = (c.sentimiento || "").toLowerCase();
      if (sent === "positivo") positivos++;
      else if (sent === "negativo") negativos++;
      else neutros++;
    }
  }

  const pctPositivoPromedio = commentsTotal > 0 ? (positivos / commentsTotal) * 100 : 0;

  return {
    postsInMonth: postsVisible,
    commentsInMonth: commentsTotal,
    pctPositivoPromedio,
    positivos,
    neutros,
    negativos,
  };
}

/** Punto para comparar sentimiento mes a mes (todas las redes). */
export type MonthlySentimentPoint = {
  key: string;
  /** Etiqueta corta, p. ej. "ene 2026". */
  labelShort: string;
  year: number;
  month: number;
  pctPositivo: number;
  commentsInMonth: number;
};

/**
 * Últimos `monthsBack` meses calendario (terminando en el mes actual).
 * % positivo = comentarios en posts publicados ese mes con ≥ `minHoursSincePost` h (por defecto 60 h), todas las redes.
 */
export function buildMonthlySentimentSeries(
  posts: SocialPost[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
  opts: { monthsBack: number; minHoursSincePost?: number },
): MonthlySentimentPoint[] {
  const minH = opts.minHoursSincePost ?? MIN_HOURS_SINCE_POST_FOR_CHART;
  const monthsBack = Math.max(1, opts.monthsBack);
  const now = new Date();
  const result: MonthlySentimentPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const s = getSentimentChartSummary(posts, commentsByPlatform, {
      platform: "all",
      granularity: "day",
      year,
      month,
      minHoursSincePost: minH,
    });
    result.push({
      key: `${year}-${month}`,
      labelShort: format(new Date(year, month - 1, 1), "MMM yyyy", { locale: es }),
      year,
      month,
      pctPositivo: s.pctPositivoPromedio,
      commentsInMonth: s.commentsInMonth,
    });
  }
  return result;
}
