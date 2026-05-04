import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { KpiStatCard } from "@/components/dashboard/KpiStatCard";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardNetwork } from "@/hooks/useDashboardNetwork";
import { useSocialPlatformStats } from "@/hooks/useSocialPlatformStats";
import { useEventosProximos } from "@/hooks/useEventosData";
import { useModuleCountsData } from "@/hooks/useModuleCountsData";
import { aggregateOverallSentiment } from "@/lib/aggregateCommentSentiment";
import { cardSurface, fitScrollClass } from "@/lib/appUi";
import { aggregateMemberCommentStats } from "@/lib/memberCommentStats";
import {
  avgRegistrationsPerDay,
  directInviteDistribution,
  registeredCommentsPercentOfTotal,
} from "@/lib/rankingKpis";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  CalendarPlus,
  Facebook,
  Instagram,
  MapPinned,
  MessageSquare,
  MessageSquareText,
  Radar,
  Share2,
  Shield,
  TrendingUp,
  Twitter,
  UserCheck,
  Users,
} from "lucide-react";

function TikTokBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const PLATFORM_META = {
  twitter: { Icon: Twitter, className: "text-sky-500", chipClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  instagram: { Icon: Instagram, className: "text-pink-600", chipClass: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  facebook: { Icon: Facebook, className: "text-blue-600", chipClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  tiktok: { Icon: TikTokBrandIcon, className: "text-foreground", chipClass: "bg-foreground/10 text-foreground" },
} as const;

type PlatformKey = keyof typeof PLATFORM_META;

function formatPct(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("es-MX", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}%`;
}

function formatCompactNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-MX", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function sentimentTone(pct: number): string {
  if (pct >= 55) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 35) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function toneSurface(tone: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate") {
  const tones = {
    blue: "border-blue-200/80 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/20",
    emerald: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20",
    amber: "border-amber-200/80 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20",
    rose: "border-rose-200/80 bg-rose-50/70 dark:border-rose-900/70 dark:bg-rose-950/20",
    violet: "border-violet-200/80 bg-violet-50/70 dark:border-violet-900/70 dark:bg-violet-950/20",
    slate: "border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20",
  } as const;
  return tones[tone];
}

function InlineBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>
      {children}
    </span>
  );
}

function PlatformChip({
  platform,
  withLabel = false,
}: {
  platform: PlatformKey;
  withLabel?: boolean;
}) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.Icon;
  return (
    <InlineBadge className={cn("shrink-0", meta.chipClass)}>
      <Icon className={cn("h-3.5 w-3.5", meta.className)} aria-hidden />
      {withLabel ? <span className="capitalize">{platform === "twitter" ? "X" : platform}</span> : null}
    </InlineBadge>
  );
}

function SectionMetric({
  label,
  value,
  hint,
  valueClassName,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  return (
    <div className={cn("space-y-1.5 rounded-xl border px-4 py-3", toneSurface(tone))}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className={cn("text-sm font-semibold text-foreground", valueClassName)}>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function ModuleKpiBlock({ label, value, icon: Icon, color, delay = 0, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; delay?: number; loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-5 shadow-sm"
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {loading
          ? <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
          : <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value.toLocaleString("es-MX")}</p>
        }
      </div>
    </motion.div>
  );
}

export default function DashboardHome() {
  const {
    members,
    totalUsers,
    sumadosEsteMes,
    growthPoints,
    firstJoin,
    lastJoin,
    isLoading,
    isError,
    error: networkError,
  } = useDashboardNetwork();

  const errorMessage = networkError instanceof Error
    ? networkError.message
    : networkError
      ? String(networkError)
      : null;
  const { data: moduleCounts, isLoading: moduleLoading } = useModuleCountsData();
  const {
    stats: socialStats,
    commentsByPlatform,
    isLoading: socialLoading,
    isError: socialError,
  } = useSocialPlatformStats(members);
  const {
    data: upcomingEvents,
    isLoading: eventsLoading,
    isError: eventsError,
  } = useEventosProximos();

  const dashboardStats = useMemo(() => {
    try {
    const withSocial = members.filter(
      (m) => m.twitter_username || m.instagram_username || m.facebook_username || m.tiktok_username,
    ).length;
    const withPhone = members.filter((m) => m.telefono != null && String(m.telefono).trim() !== "").length;
    const withLocation = members.filter((m) => m.colonia?.trim() && m.codigopostal != null).length;

    const coloniaMap = new Map<string, number>();
    const cpMap = new Map<number, number>();
    for (const m of members) {
      const colonia = m.colonia?.trim();
      if (colonia) coloniaMap.set(colonia, (coloniaMap.get(colonia) ?? 0) + 1);
      const cp = Number(m.codigopostal);
      if (Number.isFinite(cp) && cp >= 10000) cpMap.set(cp, (cpMap.get(cp) ?? 0) + 1);
    }

    let topColonia = "—";
    let topColoniaCount = 0;
    for (const [colonia, count] of coloniaMap) {
      if (count > topColoniaCount) {
        topColonia = colonia;
        topColoniaCount = count;
      }
    }

    let topCP = "—";
    let topCPCount = 0;
    for (const [cp, count] of cpMap) {
      if (count > topCPCount) {
        topCP = String(cp);
        topCPCount = count;
      }
    }

    const directDist = directInviteDistribution(members);
    const avgDay = avgRegistrationsPerDay(members);
    const leader = [...members].sort(
      (a, b) => (b.total_descendants_count ?? 0) - (a.total_descendants_count ?? 0),
    )[0];

    const memberCommentStats = aggregateMemberCommentStats(members, commentsByPlatform);
    const membersWhoCommented = [...memberCommentStats.values()].filter((row) => row.commentsTotal > 0).length;
    const totalCommentParticipations = [...memberCommentStats.values()].reduce(
      (acc, row) => acc + row.participacionesPosts,
      0,
    );

    const overallSentiment = aggregateOverallSentiment(commentsByPlatform);
    const registeredCommentPct = registeredCommentsPercentOfTotal(socialStats);

    const topPostsPlatform = socialStats
      ? [...socialStats].sort((a, b) => b.totalPosts - a.totalPosts)[0] ?? null
      : null;
    const topCommentsPlatform = socialStats
      ? [...socialStats].sort((a, b) => b.totalComments - a.totalComments)[0] ?? null
      : null;
    const topPositivePlatform = socialStats
      ? [...socialStats].sort((a, b) => b.sentimentPct.positivo - a.sentimentPct.positivo)[0] ?? null
      : null;

    return {
      withSocial,
      withPhone,
      withLocation,
      uniqueColonias: coloniaMap.size,
      uniqueCPs: cpMap.size,
      topColonia,
      topColoniaCount,
      topCP,
      topCPCount,
      directDist,
      avgDay,
      leader,
      membersWhoCommented,
      totalCommentParticipations,
      overallSentiment,
      registeredCommentPct,
      topPostsPlatform,
      topCommentsPlatform,
      topPositivePlatform,
    };
    } catch (e) {
      console.error("[DashboardHome] Error calculando stats:", e);
      return {
        withSocial: 0, withPhone: 0, withLocation: 0,
        uniqueColonias: 0, uniqueCPs: 0,
        topColonia: "—", topColoniaCount: 0,
        topCP: "—", topCPCount: 0,
        directDist: null, avgDay: null, leader: null,
        membersWhoCommented: 0, totalCommentParticipations: 0,
        overallSentiment: null, registeredCommentPct: 0,
        topPostsPlatform: null, topCommentsPlatform: null, topPositivePlatform: null,
      };
    }
  }, [commentsByPlatform, members, socialStats]);

  const upcomingEvent = upcomingEvents?.[0] ?? null;

  const primaryKpis = [
    {
      label: "Total seguidores",
      icon: Users,
      value: <span className="text-blue-700 dark:text-blue-300">{totalUsers.toLocaleString("es-MX")}</span>,
      sub: isLoading ? null : <InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">+{sumadosEsteMes.toLocaleString("es-MX")} este mes</InlineBadge>,
    },
    {
      label: "Altas promedio / día",
      icon: TrendingUp,
      value: <span className="text-emerald-700 dark:text-emerald-300">{dashboardStats.avgDay != null ? formatCompactNumber(dashboardStats.avgDay, 1) : "—"}</span>,
      sub: firstJoin ? <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Desde {new Date(firstJoin).toLocaleDateString("es-MX")}</InlineBadge> : null,
    },
    {
      label: "Con al menos 1 invitado",
      icon: Share2,
      value: (
        <span className="text-violet-700 dark:text-violet-300">
          {formatPct(
            dashboardStats.directDist
              ? (dashboardStats.directDist.countOneOrMore / dashboardStats.directDist.total) * 100
              : null,
          )}
        </span>
      ),
      sub: dashboardStats.directDist
        ? <InlineBadge className="bg-violet-500/10 text-violet-700 dark:text-violet-300">{dashboardStats.directDist.countOneOrMore.toLocaleString("es-MX")} seguidores activando</InlineBadge>
        : null,
    },
    {
      label: "Último registro",
      icon: CalendarPlus,
      value: <span className="text-amber-700 dark:text-amber-300">{members[0]?.nombre?.split(" ")[0] ?? "—"}</span>,
      sub: lastJoin ? <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{new Date(lastJoin).toLocaleDateString("es-MX")}</InlineBadge> : null,
    },
  ];

  const secondaryKpis = [
    {
      label: "Con redes sociales",
      icon: Radar,
      value: <span className="text-pink-700 dark:text-pink-300">{formatPct(totalUsers > 0 ? (dashboardStats.withSocial / totalUsers) * 100 : 0)}</span>,
      sub: <InlineBadge className="bg-pink-500/10 text-pink-700 dark:text-pink-300">{dashboardStats.withSocial.toLocaleString("es-MX")} perfiles</InlineBadge>,
    },
    {
      label: "Ya comentaron",
      icon: MessageSquareText,
      value: <span className="text-rose-700 dark:text-rose-300">{formatPct(totalUsers > 0 ? (dashboardStats.membersWhoCommented / totalUsers) * 100 : 0)}</span>,
      sub: <InlineBadge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">{dashboardStats.membersWhoCommented.toLocaleString("es-MX")} seguidores activos</InlineBadge>,
    },
    {
      label: "Colonias cubiertas",
      icon: MapPinned,
      value: <span className="text-sky-700 dark:text-sky-300">{dashboardStats.uniqueColonias.toLocaleString("es-MX")}</span>,
      sub:
        dashboardStats.topColonia !== "—"
          ? <InlineBadge className="bg-sky-500/10 text-sky-700 dark:text-sky-300">{dashboardStats.topColonia} · {dashboardStats.topColoniaCount.toLocaleString("es-MX")}</InlineBadge>
          : "Sin colonia líder",
    },
    {
      label: "Próximo evento",
      icon: CalendarClock,
      value: <span className="text-indigo-700 dark:text-indigo-300">{upcomingEvent?.nombre ?? "—"}</span>,
      sub: upcomingEvent ? <InlineBadge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">{new Date(upcomingEvent.fecha_inicio).toLocaleDateString("es-MX")}</InlineBadge> : "Sin eventos futuros",
    },
  ];

  return (
    <DashboardShell title="Panel">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Módulo</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Panel general</h1>
      </motion.div>

      {/* Module counts */}
      <div className="shrink-0 space-y-2">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Módulos activos
        </motion.p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ModuleKpiBlock label="Beneficiarios"      value={moduleCounts?.beneficiarios    ?? 0} icon={UserCheck}     color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"     delay={0.06} loading={moduleLoading} />
          <ModuleKpiBlock label="Ejército Digital"   value={moduleCounts?.ejercitoDigital  ?? 0} icon={Shield}        color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" delay={0.12} loading={moduleLoading} />
          <ModuleKpiBlock label="Atención Ciudadana" value={moduleCounts?.atencionCiudadana ?? 0} icon={MessageSquare} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" delay={0.18} loading={moduleLoading} />
        </div>
      </div>

      {/* Contenido scroleable: KPIs + crecimiento + tarjetas */}
      <div className={fitScrollClass}>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {primaryKpis.map(({ label, icon, value, sub }) => (
          <KpiStatCard key={label} label={label} icon={icon} value={value} sub={sub ?? undefined} isLoading={isLoading} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {secondaryKpis.map(({ label, icon, value, sub }) => (
          <KpiStatCard key={label} label={label} icon={icon} value={value} sub={sub} isLoading={isLoading || eventsLoading} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <UserGrowthChart
          points={growthPoints}
          firstJoin={firstJoin}
          lastJoin={lastJoin}
          isLoading={isLoading}
          isError={isError}
          errorMessage={errorMessage}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <Card className={cn(cardSurface, "shadow-none")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activación de la red</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </>
            ) : (
              <>
                <SectionMetric
                  label="Sin invitar"
                  tone="amber"
                  value={
                    <span className="text-amber-700 dark:text-amber-300">
                      {formatPct(
                        dashboardStats.directDist
                          ? (dashboardStats.directDist.countZero / dashboardStats.directDist.total) * 100
                          : null,
                      )}
                    </span>
                  }
                  hint={
                    dashboardStats.directDist
                      ? <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{dashboardStats.directDist.countZero.toLocaleString("es-MX")} seguidores</InlineBadge>
                      : undefined
                  }
                />
                <SectionMetric
                  label="Exactamente 1 invitado"
                  tone="blue"
                  value={
                    <span className="text-blue-700 dark:text-blue-300">
                      {formatPct(
                        dashboardStats.directDist
                          ? (dashboardStats.directDist.countExactlyOne / dashboardStats.directDist.total) * 100
                          : null,
                      )}
                    </span>
                  }
                  hint={
                    dashboardStats.directDist
                      ? <InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">{dashboardStats.directDist.countExactlyOne.toLocaleString("es-MX")} seguidores</InlineBadge>
                      : undefined
                  }
                />
                <SectionMetric
                  label="Líder actual"
                  tone="violet"
                  value={<span className="text-violet-700 dark:text-violet-300">{dashboardStats.leader?.nombre ?? "—"}</span>}
                  hint={
                    dashboardStats.leader
                      ? <InlineBadge className="bg-violet-500/10 text-violet-700 dark:text-violet-300">{(dashboardStats.leader.total_descendants_count ?? 0).toLocaleString("es-MX")} en su red total</InlineBadge>
                      : undefined
                  }
                  valueClassName="truncate"
                />
                <SectionMetric
                  label="Calidad de base"
                  tone="emerald"
                  value={<span className="text-emerald-700 dark:text-emerald-300">{formatPct(totalUsers > 0 ? (dashboardStats.withLocation / totalUsers) * 100 : 0)}</span>}
                  hint={
                    <div className="flex flex-wrap gap-1.5">
                      <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{dashboardStats.withPhone.toLocaleString("es-MX")} con teléfono</InlineBadge>
                      <InlineBadge className="bg-teal-500/10 text-teal-700 dark:text-teal-300">{dashboardStats.withLocation.toLocaleString("es-MX")} con colonia y CP</InlineBadge>
                    </div>
                  }
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(cardSurface, "shadow-none")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pulso social</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {socialLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </>
            ) : socialError ? (
              <p className="text-sm text-destructive">No se pudieron cargar las métricas sociales.</p>
            ) : (
              <>
                <SectionMetric
                  label="Comentarios registrados"
                  tone="blue"
                  value={<span className="text-blue-700 dark:text-blue-300">{formatPct(dashboardStats.registeredCommentPct, 1)}</span>}
                  hint={<InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">Comentarios vinculados a seguidores</InlineBadge>}
                />
                <SectionMetric
                  label="Sentimiento global"
                  tone="emerald"
                  value={
                    dashboardStats.overallSentiment
                      ? <span className={cn(sentimentTone(dashboardStats.overallSentiment.pct.positivo))}>{formatPct(dashboardStats.overallSentiment.pct.positivo, 1)} positivo</span>
                      : "—"
                  }
                  hint={
                    dashboardStats.overallSentiment
                      ? <div className="flex flex-wrap gap-1.5">
                          <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{dashboardStats.overallSentiment.total.toLocaleString("es-MX")} comentarios</InlineBadge>
                          <InlineBadge className="bg-slate-500/10 text-slate-700 dark:text-slate-300">
                            {dashboardStats.overallSentiment.counts.neutro.toLocaleString("es-MX")} neutros
                          </InlineBadge>
                        </div>
                      : "Sin comentarios"
                  }
                />
                <SectionMetric
                  label="Red más activa"
                  tone="rose"
                  value={
                    dashboardStats.topCommentsPlatform ? (
                      <div className="flex items-center gap-2">
                        <PlatformChip platform={dashboardStats.topCommentsPlatform.platform as PlatformKey} />
                        <span className="text-rose-700 dark:text-rose-300">{dashboardStats.topCommentsPlatform.totalComments.toLocaleString("es-MX")} comentarios</span>
                      </div>
                    ) : (
                      "—"
                    )
                  }
                  hint={
                    dashboardStats.topCommentsPlatform
                      ? <div className="flex flex-wrap gap-1.5">
                          <InlineBadge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">{dashboardStats.topCommentsPlatform.totalPosts.toLocaleString("es-MX")} posts</InlineBadge>
                          <InlineBadge className="bg-orange-500/10 text-orange-700 dark:text-orange-300">{dashboardStats.topCommentsPlatform.registeredComments.toLocaleString("es-MX")} registrados</InlineBadge>
                        </div>
                      : undefined
                  }
                />
                <SectionMetric
                  label="Mejor percepción"
                  tone="violet"
                  value={
                    dashboardStats.topPositivePlatform ? (
                      <div className="flex items-center gap-2">
                        <PlatformChip platform={dashboardStats.topPositivePlatform.platform as PlatformKey} />
                        <span className={cn(sentimentTone(dashboardStats.topPositivePlatform.sentimentPct.positivo))}>
                          {formatPct(dashboardStats.topPositivePlatform.sentimentPct.positivo, 1)}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )
                  }
                  hint={
                    dashboardStats.topPositivePlatform
                      ? <div className="flex flex-wrap gap-1.5">
                          <InlineBadge className="bg-violet-500/10 text-violet-700 dark:text-violet-300">{dashboardStats.topPositivePlatform.totalComments.toLocaleString("es-MX")} comentarios</InlineBadge>
                          <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">mejor tono positivo</InlineBadge>
                        </div>
                      : undefined
                  }
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(cardSurface, "shadow-none")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Territorio y operación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {isLoading || eventsLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </>
            ) : (
              <>
                <SectionMetric
                  label="Cobertura territorial"
                  tone="blue"
                  value={<span className="text-blue-700 dark:text-blue-300">{dashboardStats.uniqueColonias.toLocaleString("es-MX")} colonias</span>}
                  hint={<InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">{dashboardStats.uniqueCPs.toLocaleString("es-MX")} CPs únicos</InlineBadge>}
                />
                <SectionMetric
                  label="Mayor concentración"
                  tone="amber"
                  value={<span className="text-amber-700 dark:text-amber-300">{dashboardStats.topColonia}</span>}
                  hint={
                    dashboardStats.topColonia !== "—"
                      ? <div className="flex flex-wrap gap-1.5">
                          <InlineBadge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{dashboardStats.topColoniaCount.toLocaleString("es-MX")} seguidores</InlineBadge>
                          <InlineBadge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">CP {dashboardStats.topCP}</InlineBadge>
                        </div>
                      : "Sin datos suficientes"
                  }
                  valueClassName="truncate"
                />
                <SectionMetric
                  label="Operación próxima"
                  tone="emerald"
                  value={<span className="text-emerald-700 dark:text-emerald-300">{upcomingEvent?.nombre ?? "Sin próximos eventos"}</span>}
                  hint={
                    upcomingEvent
                      ? <div className="flex flex-wrap gap-1.5">
                          <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{new Date(upcomingEvent.fecha_inicio).toLocaleDateString("es-MX")}</InlineBadge>
                          <InlineBadge className="bg-lime-500/10 text-lime-700 dark:text-lime-300">{upcomingEvents?.length.toLocaleString("es-MX")} futuros</InlineBadge>
                        </div>
                      : eventsError
                        ? "No se pudieron cargar eventos"
                        : "No hay eventos futuros cargados"
                  }
                  valueClassName="truncate"
                />
                <SectionMetric
                  label="Participaciones sociales"
                  tone="rose"
                  value={<span className="text-rose-700 dark:text-rose-300">{dashboardStats.totalCommentParticipations.toLocaleString("es-MX")}</span>}
                  hint={
                    dashboardStats.topPostsPlatform
                      ? <div className="flex flex-wrap items-center gap-1.5">
                          <PlatformChip platform={dashboardStats.topPostsPlatform.platform as PlatformKey} />
                          <InlineBadge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">{dashboardStats.topPostsPlatform.totalPosts.toLocaleString("es-MX")} posts</InlineBadge>
                        </div>
                      : "Sin actividad social"
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </DashboardShell>
  );
}
