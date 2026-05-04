import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { KpiStatCard } from "@/components/dashboard/KpiStatCard";
import { MemberDetailDialog } from "@/components/dashboard/MemberDetailDialog";
import { InlineBadge, PlatformPill } from "@/components/dashboard/VisualBadges";
import { useCommentsData } from "@/hooks/useCommentsData";
import { useDashboardNetwork } from "@/hooks/useDashboardNetwork";
import { useSocialPlatformStats } from "@/hooks/useSocialPlatformStats";
import { aggregateMemberCommentStats } from "@/lib/memberCommentStats";
import type { NetworkMember } from "@/types/network";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listSidebarCardClass,
  splitListLayoutClass,
  splitLeftClass,
  compactRowClass,
  splitPageKickerClass,
  splitPageTitleClass,
  splitPageDescClass,
} from "@/lib/appUi";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Share2, Trophy, Users, TrendingUp, MessageCircle,
} from "lucide-react";

const PAGE_SIZE = 30;
type SortKey = "rank" | "name" | "direct" | "totalNetwork" | "commentsTotal";

export default function RankingPage() {
  const { members, totalUsers, isLoading, isError } = useDashboardNetwork();
  const [detailMember, setDetailMember] = useState<NetworkMember | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const {
    data: commentsMap,
    isLoading: commentsLoading,
    isError: commentsError,
  } = useCommentsData(members);
  const detailSummaries = detailMember ? commentsMap?.get(String(detailMember.id)) : undefined;
  const { commentsByPlatform, isLoading: socialLoading } = useSocialPlatformStats(members);

  const commentStats = useMemo(
    () => aggregateMemberCommentStats(members, commentsByPlatform),
    [commentsByPlatform, members],
  );

  const ranked = useMemo(() => {
    const base = [...members].sort((a, b) => (b.total_descendants_count ?? 0) - (a.total_descendants_count ?? 0));
    const getComments = (m: NetworkMember) => commentStats.get(m.id);
    const compare = (a: NetworkMember, b: NetworkMember) => {
      switch (sortKey) {
        case "name":          return a.nombre.localeCompare(b.nombre, "es");
        case "direct":        return (a.direct_descendants_count ?? 0) - (b.direct_descendants_count ?? 0);
        case "totalNetwork":
        case "rank":          return (a.total_descendants_count ?? 0) - (b.total_descendants_count ?? 0);
        case "commentsTotal": return (getComments(a)?.commentsTotal ?? 0) - (getComments(b)?.commentsTotal ?? 0);
        default:              return 0;
      }
    };
    base.sort((a, b) => {
      const result = compare(a, b);
      return sortDir === "asc" ? result : -result;
    });
    return base;
  }, [commentStats, members, sortDir, sortKey]);

  const topDirectInviter = useMemo(
    () =>
      members.reduce<NetworkMember | null>((best, m) => {
        if (!best) return m;
        return (m.direct_descendants_count ?? 0) > (best.direct_descendants_count ?? 0) ? m : best;
      }, null),
    [members],
  );
  const topCommenter = useMemo(
    () =>
      members.reduce<NetworkMember | null>((best, m) => {
        if (!best) return m;
        return (commentStats.get(m.id)?.commentsTotal ?? 0) > (commentStats.get(best.id)?.commentsTotal ?? 0)
          ? m
          : best;
      }, null),
    [commentStats, members],
  );

  /* ── totales por plataforma para mini-chart ── */
  const platformTotals = useMemo(() => {
    let tw = 0, ig = 0, fb = 0, tt = 0;
    for (const stat of commentStats.values()) {
      tw += stat.commentsTwitter ?? 0;
      ig += stat.commentsInstagram ?? 0;
      fb += stat.commentsFacebook ?? 0;
      tt += stat.commentsTiktok ?? 0;
    }
    const arr = [
      { key: "twitter",   total: tw, color: "bg-sky-500" },
      { key: "instagram", total: ig, color: "bg-pink-500" },
      { key: "facebook",  total: fb, color: "bg-blue-600" },
      { key: "tiktok",    total: tt, color: "bg-foreground" },
    ];
    return arr.sort((a, b) => b.total - a.total);
  }, [commentStats]);
  const maxPlatformTotal = platformTotals[0]?.total ?? 1;

  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => ranked.slice(pageOffset, pageOffset + PAGE_SIZE),
    [pageOffset, ranked],
  );

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), Math.max(1, Math.ceil(ranked.length / PAGE_SIZE))));
  }, [ranked.length]);

  function daysSinceJoined(member: NetworkMember | null): number {
    if (!member) return 1;
    const t = new Date(member.created_at).getTime();
    if (Number.isNaN(t)) return 1;
    return Math.max(1, Math.ceil((Date.now() - t) / 86_400_000));
  }
  function avgPerDay(total: number, member: NetworkMember | null): string {
    if (!member) return "—";
    return (total / daysSinceJoined(member)).toLocaleString("es-MX", {
      maximumFractionDigits: 2, minimumFractionDigits: 0,
    });
  }

  return (
    <DashboardShell title="Ranking">
      <MemberDetailDialog
        member={detailMember}
        open={detailMember != null}
        onOpenChange={(o) => { if (!o) setDetailMember(null); }}
        commentSummaries={detailSummaries}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        allMembers={members}
      />

      <div className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Ranking</h1>
        <p className={splitPageDescClass}>Top de invitaciones y participación en redes</p>
      </div>

      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda ══ */}
        <div className={splitLeftClass}>
          {/* KPIs principales */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KpiStatCard
              label="Total"
              icon={Users}
              value={<span className="text-blue-700 dark:text-blue-300">{totalUsers.toLocaleString("es-MX")}</span>}
              isLoading={isLoading}
            />
            <KpiStatCard
              label="Líder"
              icon={TrendingUp}
              value={<span className="text-amber-700 dark:text-amber-300">{ranked[0]?.nombre ?? "—"}</span>}
              isLoading={isLoading || socialLoading}
              sub={ranked[0] ? <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{(ranked[0].total_descendants_count ?? 0).toLocaleString("es-MX")} en su red</InlineBadge> : undefined}
              valueClassName="!text-base font-semibold truncate"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <KpiStatCard
              label="Más invitados directos"
              icon={Share2}
              value={<span className="text-violet-700 dark:text-violet-300">{topDirectInviter?.nombre ?? "—"}</span>}
              isLoading={isLoading}
              sub={
                topDirectInviter ? (
                  <div className="flex flex-wrap gap-1.5">
                    <InlineBadge className="bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      {(topDirectInviter.direct_descendants_count ?? 0).toLocaleString("es-MX")} directos
                    </InlineBadge>
                    <InlineBadge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      {avgPerDay(topDirectInviter.direct_descendants_count ?? 0, topDirectInviter)} por día
                    </InlineBadge>
                  </div>
                ) : undefined
              }
              valueClassName="!text-base font-semibold truncate"
            />
            <KpiStatCard
              label="Más comentarios en redes"
              icon={TrendingUp}
              value={<span className="text-rose-700 dark:text-rose-300">{topCommenter?.nombre ?? "—"}</span>}
              isLoading={isLoading || socialLoading}
              sub={
                topCommenter ? (
                  <div className="flex flex-wrap gap-1.5">
                    <InlineBadge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">
                      {(commentStats.get(topCommenter.id)?.commentsTotal ?? 0).toLocaleString("es-MX")} comentarios
                    </InlineBadge>
                    <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {avgPerDay(commentStats.get(topCommenter.id)?.commentsTotal ?? 0, topCommenter)} por día
                    </InlineBadge>
                  </div>
                ) : undefined
              }
              valueClassName="!text-base font-semibold truncate"
            />
          </div>

          {/* Distribución por plataforma */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Comentarios por plataforma
            </p>
            {socialLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {platformTotals.map(({ key, total, color }) => (
                  <li key={key} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <PlatformPill platform={key as "twitter" | "instagram" | "facebook" | "tiktok"} compact />
                      <span className="tabular-nums text-xs font-medium text-foreground">{total.toLocaleString("es-MX")}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${(total / maxPlatformTotal) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        {/* ══ Columna derecha: lista compacta ══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={listSidebarCardClass}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Top ranking</p>
              {!isLoading && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {ranked.length.toLocaleString("es-MX")}
                </span>
              )}
            </div>
            <select
              value={`${sortKey}-${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split("-") as [SortKey, "asc" | "desc"];
                setSortKey(k); setSortDir(d); setPage(1);
              }}
              className="h-7 rounded-md border border-border/60 bg-muted/30 px-1.5 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Ordenar"
            >
              <option value="rank-desc">Red total ↓</option>
              <option value="rank-asc">Red total ↑</option>
              <option value="direct-desc">Directos ↓</option>
              <option value="commentsTotal-desc">Comentarios ↓</option>
              <option value="name-asc">Nombre A → Z</option>
            </select>
          </div>

          {isLoading && (
            <div className="space-y-px p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          )}
          {isError && (
            <p className="py-12 text-center text-sm text-destructive">Error al cargar el ranking.</p>
          )}

          {!isLoading && !isError && (
            <>
              <ul className="flex-1 min-h-0 divide-y divide-border/30 overflow-y-auto">
                {pageRows.map((m, i) => {
                  const absoluteIndex = pageOffset + i;
                  const stats = commentStats.get(m.id);
                  const medal = absoluteIndex === 0 ? "🥇" : absoluteIndex === 1 ? "🥈" : absoluteIndex === 2 ? "🥉" : null;
                  return (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: Math.min(i * 0.012, 0.2) } }}
                    >
                      <button
                        type="button"
                        onClick={() => setDetailMember(m)}
                        className={cn(compactRowClass, "cursor-pointer")}
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums",
                          medal
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {medal ?? absoluteIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{m.nombre}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3 text-blue-500" />
                              <span className="tabular-nums font-medium text-blue-700 dark:text-blue-300">
                                {(m.total_descendants_count ?? 0).toLocaleString("es-MX")}
                              </span>
                              red
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Share2 className="h-3 w-3 text-violet-500" />
                              <span className="tabular-nums font-medium text-violet-700 dark:text-violet-300">
                                {(m.direct_descendants_count ?? 0).toLocaleString("es-MX")}
                              </span>
                              dir
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-3 w-3 text-emerald-500" />
                              <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-300">
                                {(stats?.commentsTotal ?? 0).toLocaleString("es-MX")}
                              </span>
                              com
                            </span>
                          </div>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, ranked.length)}</span>
                  {" "}/{" "}
                  <span className="tabular-nums font-medium text-foreground">{ranked.length.toLocaleString("es-MX")}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded-md border-border/60 p-0"
                    disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="min-w-[3.5rem] text-center text-[11px] tabular-nums text-muted-foreground">{safePage}/{totalPages}</span>
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded-md border-border/60 p-0"
                    disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
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
