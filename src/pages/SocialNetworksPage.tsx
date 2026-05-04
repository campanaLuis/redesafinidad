import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useSocialContentData } from "@/hooks/useSocialContentData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ThumbsUp, MessageSquare, Share2, Users,
  TrendingUp, BarChart3, ChevronLeft, ChevronRight,
  ExternalLink, Facebook, Instagram, Twitter,
} from "lucide-react";
import {
  listSidebarCardClass,
  splitListLayoutClass,
  splitLeftClass,
  splitPageKickerClass,
  splitPageTitleClass,
  splitPageDescClass,
} from "@/lib/appUi";

/* ─── TikTok icon ─────────────────────────────────────────────── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */
function fmt(n: number) { return Math.round(n).toLocaleString("es-MX"); }
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}
function pct(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 100)}%` : "0%"; }
function dateStr(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

/* ─── Platform helpers ─────────────────────────────────────────── */
const PLATFORM_ICON: Record<string, React.ElementType> = {
  facebook: Facebook, instagram: Instagram, twitter: Twitter, tiktok: TikTokIcon,
};
const PLATFORM_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  facebook: { bg: "bg-blue-50 dark:bg-blue-950",   text: "text-blue-600 dark:text-blue-400",   bar: "bg-blue-500" },
  instagram:{ bg: "bg-pink-50 dark:bg-pink-950",   text: "text-pink-600 dark:text-pink-400",   bar: "bg-pink-500" },
  twitter:  { bg: "bg-sky-50 dark:bg-sky-950",     text: "text-sky-600 dark:text-sky-400",     bar: "bg-sky-500" },
  tiktok:   { bg: "bg-slate-100 dark:bg-slate-800",text: "text-slate-700 dark:text-slate-300", bar: "bg-slate-500" },
};
function platformColor(p: string) {
  return PLATFORM_COLOR[p.toLowerCase()] ?? { bg: "bg-muted", text: "text-muted-foreground", bar: "bg-muted-foreground" };
}
function platformLabel(p: string) {
  const labels: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", twitter: "Twitter / X", tiktok: "TikTok" };
  return labels[p.toLowerCase()] ?? p;
}

/* ─── Avatar colors for accounts ─────────────────────────────── */
const ACCT_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-rose-500","bg-amber-500"];
function acctColor(name: string) {
  const n = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ACCT_COLORS[n % ACCT_COLORS.length];
}

/* ─── Sentiment badge ─────────────────────────────────────────── */
function SentimentBadge({ s }: { s: string | null }) {
  if (!s) return null;
  const lower = s.toLowerCase();
  const cls = lower === "positivo"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    : lower === "negativo"
    ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
    : "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize", cls)}>{s}</span>;
}

/* ─── Engagement bar ───────────────────────────────────────────── */
function EngagementBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={cn("absolute inset-y-0 left-0 rounded-full", color)}
      />
    </div>
  );
}

/* ─── Pagination state ─────────────────────────────────────────── */
const PAGE_SIZE = 25;

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function SocialNetworksPage() {
  const { posts, total, computed, isLoading, isError } = useSocialContentData();
  const [tablePage, setTablePage] = useState(1);

  const topPosts    = computed?.topPosts ?? [];
  const totalPages  = Math.max(1, Math.ceil(topPosts.length / PAGE_SIZE));
  const safePage    = Math.min(tablePage, totalPages);
  const pageOffset  = (safePage - 1) * PAGE_SIZE;
  const pageRows    = useMemo(() => topPosts.slice(pageOffset, pageOffset + PAGE_SIZE), [topPosts, pageOffset]);
  void posts;

  return (
    <DashboardShell title="Redes Sociales">

      {/* ── Encabezado ── */}
      <div className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Redes Sociales</h1>
        <p className={splitPageDescClass}>Monitoreo de contenido en plataformas digitales</p>
      </div>

      {isError && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el contenido de redes sociales.
        </div>
      )}

      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda: KPIs + breakdowns ══ */}
        <div className={splitLeftClass}>
          {/* KPIs principales */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-3 xl:grid-cols-4"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
                <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Publicaciones</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-12 rounded-md" /> : (
                  <p className="text-xl font-semibold tabular-nums text-foreground">{fmt(total)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950">
                <ThumbsUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Likes</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-14 rounded-md" /> : (
                  <p className="text-xl font-semibold tabular-nums text-foreground">{fmtK(computed?.totalLikes ?? 0)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950">
                <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Comentarios</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-14 rounded-md" /> : (
                  <p className="text-xl font-semibold tabular-nums text-foreground">{fmtK(computed?.totalComments ?? 0)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Engagement</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-14 rounded-md" /> : (
                  <p className="text-xl font-semibold tabular-nums text-foreground">{fmtK(computed?.totalEngagement ?? 0)}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Cuentas + Plataformas */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 gap-4 xl:grid-cols-2"
          >
            {/* ── Cuentas monitoreadas ── */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Cuentas monitoreadas</p>
              </div>
              {isLoading ? (
                <div className="space-y-3">{Array.from({length:2}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl"/>)}</div>
              ) : (
                <div className="space-y-3">
                  {computed?.accountStats.map((a, i) => (
                    <div key={a.username} className="rounded-xl border border-border/40 bg-muted/30 p-3">
                      <div className="mb-2 flex items-center gap-2.5">
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", ACCT_COLORS[i % ACCT_COLORS.length])}>
                          {a.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">@{a.username}</p>
                          <p className="text-[11px] text-muted-foreground">{a.posts} publicaciones</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Likes</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">{fmtK(a.likes)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Coments.</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">{fmtK(a.comments)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Engmnt.</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">{fmtK(a.engagement)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Plataformas ── */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Por plataforma</p>
              </div>
              {isLoading ? (
                <div className="space-y-3">{Array.from({length:2}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>
              ) : (
                <ul className="space-y-3">
                  {computed?.platformStats.map(ps => {
                    const PIcon = PLATFORM_ICON[ps.platform.toLowerCase()] ?? Share2;
                    const clr   = platformColor(ps.platform);
                    const totalEng = computed.platformStats.reduce((s, x) => s + x.engagement, 0);
                    return (
                      <li key={ps.platform}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg", clr.bg)}>
                              <PIcon className={cn("h-3.5 w-3.5", clr.text)} />
                            </div>
                            <span className="text-sm font-medium text-foreground">{platformLabel(ps.platform)}</span>
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground">{ps.posts} posts · {fmtK(ps.engagement)}</span>
                        </div>
                        <EngagementBar value={ps.engagement} max={totalEng} color={clr.bar} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>

          {/* Distribución mensual + sentimiento */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Actividad mensual</p>
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>
            ) : computed?.monthlyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de fecha.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {computed?.monthlyStats.map(ms => {
                  const maxPosts = Math.max(...(computed.monthlyStats.map(x=>x.posts)));
                  return (
                    <div key={ms.month} className="rounded-xl border border-border/40 bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{ms.label}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{ms.posts} posts</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" /> {fmtK(ms.likes)}
                        <span className="ml-auto"><MessageSquare className="inline h-3 w-3" /> {fmtK(ms.comments)}</span>
                      </div>
                      <div className="mt-1.5">
                        <EngagementBar value={ms.posts} max={maxPosts} color="bg-primary/50" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sentimiento */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sentimiento</p>
              {isLoading ? <Skeleton className="h-12 rounded-xl" /> : (
                <div className="space-y-1.5">
                  {Object.entries(computed?.sentimentMap ?? {}).map(([s, count]) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-[11px] capitalize text-muted-foreground truncate">{s}</span>
                      <div className="flex-1">
                        <EngagementBar
                          value={count}
                          max={total}
                          color={s.toLowerCase()==="positivo" ? "bg-emerald-400" : s.toLowerCase()==="negativo" ? "bg-rose-400" : "bg-muted-foreground/30"}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{count}</span>
                    </div>
                  ))}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {pct(computed?.withSentiment ?? 0, total)} con sentimiento analizado
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ══ Columna derecha: top publicaciones ══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={listSidebarCardClass}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Top publicaciones</p>
              {!isLoading && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {topPosts.length}
                </span>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2 p-3">
              {Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-20 w-full rounded-lg" style={{opacity:1-i*0.12}}/>)}
            </div>
          )}

          {!isLoading && isError && (
            <p className="py-12 text-center text-sm text-destructive">Error al cargar.</p>
          )}

          {!isLoading && !isError && topPosts.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Sin publicaciones.</p>
          )}

          {!isLoading && !isError && topPosts.length > 0 && (
            <>
              <ul className="flex-1 min-h-0 divide-y divide-border/30 overflow-y-auto">
                {pageRows.map((p, i) => {
                  const eng = p.likes + p.comments_count;
                  const uname = p.username ?? "—";
                  const PIcon = PLATFORM_ICON[p.platform?.toLowerCase() ?? ""] ?? Share2;
                  const clr   = platformColor(p.platform ?? "");
                  return (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: Math.min(i * 0.02, 0.2) } }}
                      className="px-3 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", acctColor(uname))}>
                          {uname.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-xs font-medium text-foreground">@{uname}</p>
                              <div className={cn("flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5", clr.bg)}>
                                <PIcon className={cn("h-2.5 w-2.5", clr.text)} />
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{dateStr(p.posted_date)}</span>
                          </div>
                          {p.content?.trim() && (
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={p.content}>
                              {p.content}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] tabular-nums">
                            <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                              <ThumbsUp className="h-2.5 w-2.5" /> {fmtK(p.likes)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400">
                              <MessageSquare className="h-2.5 w-2.5" /> {fmtK(p.comments_count)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <TrendingUp className="h-2.5 w-2.5" /> {fmtK(eng)}
                            </span>
                            <SentimentBadge s={p.sentiment} />
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Ver
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, topPosts.length)}</span>
                  {" "}/{" "}
                  <span className="tabular-nums font-medium text-foreground">{topPosts.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded-md border-border/60 p-0"
                    disabled={safePage <= 1} onClick={() => setTablePage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="min-w-[3.5rem] text-center text-[11px] tabular-nums text-muted-foreground">{safePage}/{totalPages}</span>
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded-md border-border/60 p-0"
                    disabled={safePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}
