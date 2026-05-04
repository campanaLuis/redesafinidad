import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MemberDetailDialog } from "@/components/dashboard/MemberDetailDialog";
import { usePersonasApi } from "@/hooks/usePersonasApi";
import { useCommentsData } from "@/hooks/useCommentsData";
import type { NetworkMember } from "@/types/network";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineBadge } from "@/components/dashboard/VisualBadges";
import {
  cardSurface,
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
  Users, CalendarPlus, Share2,
  ChevronLeft, ChevronRight,
  Search, X, Twitter, Instagram, Facebook, MapPin,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/* ─── constantes ─────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

const AGE_BUCKETS = [
  { key: "18-24", min: 18, max: 24, label: "18-24", color: "#3b82f6" },
  { key: "25-34", min: 25, max: 34, label: "25-34", color: "#14b8a6" },
  { key: "35-44", min: 35, max: 44, label: "35-44", color: "#8b5cf6" },
  { key: "45-54", min: 45, max: 54, label: "45-54", color: "#f59e0b" },
  { key: "55-64", min: 55, max: 64, label: "55-64", color: "#ef4444" },
  { key: "65+",   min: 65, max: 130, label: "65+",  color: "#64748b" },
] as const;

const PLATFORM_COLORS = {
  twitter: "#0ea5e9", instagram: "#db2777", facebook: "#2563eb", tiktok: "#111827",
} as const;

/* ─── helpers ────────────────────────────────────────────────────── */
function parseBirthDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const ddmm = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const [, d, m, y] = ddmm;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  // "22 de septiembre de 1983" style
  const meses: Record<string, number> = {
    enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
    julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12,
  };
  const textMatch = raw.trim().toLowerCase().match(/^(\d{1,2}) de (\w+) de (\d{4})$/);
  if (textMatch) {
    const [, d, mes, y] = textMatch;
    const m = meses[mes];
    if (m) { const dt = new Date(Number(y), m - 1, Number(d)); return Number.isNaN(dt.getTime()) ? null : dt; }
  }
  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function getAge(m: NetworkMember): number | null {
  const birth = parseBirthDate((m as any).fecha_nacimiento ?? (m as any).fechadenacimiento);
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age <= 130 ? age : null;
}

/* ─── tipo sort ──────────────────────────────────────────────────── */
type SortCol = "nombre" | "directos" | "registro";
type SortDir = "asc" | "desc";

/* ─── TikTok icon ────────────────────────────────────────────────── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/* ─── KPI grande ─────────────────────────────────────────────────── */
function KpiBlock({ label, value, sub, icon: Icon, color, delay = 0 }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-5 shadow-sm"
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ─── DemographyCard ─────────────────────────────────────────────── */
function DemographyCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <Card className={cn(cardSurface, "shadow-none")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ─── SocialIcons compactos ──────────────────────────────────────── */
function SocialIcons({ m, size = 3.5 }: { m: NetworkMember; size?: number }) {
  const has = m.twitter_username || m.instagram_username || m.facebook_username || m.tiktok_username;
  if (!has) return null;
  const cls = `h-${size === 3 ? 3 : size === 3.5 ? "[14px]" : 4} w-${size === 3 ? 3 : size === 3.5 ? "[14px]" : 4}`;
  void cls;
  return (
    <div className="flex items-center gap-1">
      {m.twitter_username   && <Twitter    className="h-3 w-3 text-sky-500" />}
      {m.instagram_username && <Instagram  className="h-3 w-3 text-pink-500" />}
      {m.facebook_username  && <Facebook   className="h-3 w-3 text-blue-600" />}
      {m.tiktok_username    && <TikTokIcon className="h-3 w-3 text-foreground" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function SeguidoresPage() {
  const { members, totalUsers, sumadosEsteMes, isLoading, isError } = usePersonasApi();
  const [detailMember, setDetailMember] = useState<NetworkMember | null>(null);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>("registro");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: commentsMap, isLoading: commentsLoading, isError: commentsError } = useCommentsData(members);
  const detailSummaries = detailMember ? commentsMap?.get(String(detailMember.id)) : undefined;

  /* ── directos por persona ── */
  const directCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of members) {
      if (m.refiereid) {
        const ref = Number(m.refiereid);
        if (Number.isFinite(ref)) map.set(ref, (map.get(ref) ?? 0) + 1);
      }
    }
    return map;
  }, [members]);

  /* ── KPI básicos ── */
  const withSocial = useMemo(
    () => members.filter(m => m.twitter_username || m.instagram_username || m.facebook_username || m.tiktok_username).length,
    [members],
  );
  const pctSocial = totalUsers > 0 ? Math.round((withSocial / totalUsers) * 100) : 0;

  /* ── Demografía ── */
  const demography = useMemo(() => {
    const ageDistribution = AGE_BUCKETS.map(b => ({ ...b, value: 0 }));
    let withKnownAge = 0;
    const coloniaMap = new Map<string, number>();
    const cpMap      = new Map<string, number>();
    const topicsMap  = new Map<string, number>();
    let twitter = 0, instagram = 0, facebook = 0, tiktok = 0;

    for (const m of members) {
      const age = getAge(m);
      if (age != null) {
        withKnownAge++;
        const bucket = ageDistribution.find(b => age >= b.min && age <= b.max);
        if (bucket) bucket.value++;
      }
      const colonia = m.colonia?.trim();
      if (colonia) coloniaMap.set(colonia, (coloniaMap.get(colonia) ?? 0) + 1);
      const cp = m.codigopostal != null ? String(m.codigopostal).trim() : "";
      if (cp) cpMap.set(cp, (cpMap.get(cp) ?? 0) + 1);
      if (m.twitter_username)   twitter++;
      if (m.instagram_username) instagram++;
      if (m.facebook_username)  facebook++;
      if (m.tiktok_username)    tiktok++;
      const topicText = m.temas_mas_interesantes?.trim();
      if (topicText) {
        topicText.split(/[,;/|]+/).map(p => p.trim()).filter(Boolean).forEach(t => {
          topicsMap.set(t, (topicsMap.get(t) ?? 0) + 1);
        });
      }
    }

    return {
      ageDistribution,
      knownAgeCount: withKnownAge,
      topColonias: [...coloniaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name, value })),
      topCPs:      [...cpMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: `CP ${name}`, value })),
      socialCoverage: [
        { key: "twitter",   label: "X",         value: twitter,   color: PLATFORM_COLORS.twitter },
        { key: "instagram", label: "Instagram",  value: instagram, color: PLATFORM_COLORS.instagram },
        { key: "facebook",  label: "Facebook",   value: facebook,  color: PLATFORM_COLORS.facebook },
        { key: "tiktok",    label: "TikTok",     value: tiktok,    color: PLATFORM_COLORS.tiktok },
      ],
      topTopics: [...topicsMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })),
    };
  }, [members]);

  /* ── Lista ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? members.filter(m => [m.nombre, m.telefono, m.colonia, m.twitter_username, m.instagram_username].join(" ").toLowerCase().includes(q))
      : members;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nombre")   cmp = (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
      if (sortCol === "directos") cmp = (directCountMap.get(a.id) ?? 0) - (directCountMap.get(b.id) ?? 0);
      if (sortCol === "registro") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, search, sortCol, sortDir, directCountMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows   = useMemo(() => filtered.slice(pageOffset, pageOffset + PAGE_SIZE), [filtered, pageOffset]);

  useEffect(() => { setPage(1); }, [search, sortCol, sortDir]);

  const TOOLTIP_STYLE = {
    borderRadius: "10px",
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: "12px",
  };

  return (
    <DashboardShell title="Redes de Afinidad">

      <MemberDetailDialog
        member={detailMember}
        open={detailMember != null}
        onOpenChange={o => { if (!o) setDetailMember(null); }}
        commentSummaries={detailSummaries}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        allMembers={members}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Redes de Afinidad</h1>
        <p className={splitPageDescClass}>Seguidores registrados y análisis demográfico</p>
      </motion.div>

      {/* Layout split: izquierda demografía/KPIs / derecha lista angosta */}
      <div className={splitListLayoutClass}>

        {/* ─── Columna izquierda ─── */}
        <div className={splitLeftClass}>
          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />) : (
              <>
                <KpiBlock label="Total seguidores"   value={totalUsers.toLocaleString("es-MX")}        sub={`+${sumadosEsteMes.toLocaleString("es-MX")} este mes`}   icon={Users}       color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"     delay={0} />
                <KpiBlock label="Nuevas este mes"     value={`+${sumadosEsteMes.toLocaleString("es-MX")}`}                                                             icon={CalendarPlus} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" delay={0.06} />
                <KpiBlock label="Con redes sociales"  value={`${pctSocial}%`}                           sub={`${withSocial.toLocaleString("es-MX")} perfiles`}          icon={Share2}      color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" delay={0.12} />
              </>
            )}
          </motion.div>

          {/* Demografía */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Demografía</h2>
              {!isLoading && (
                <>
                  <InlineBadge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    {demography.knownAgeCount.toLocaleString("es-MX")} con edad estimable
                  </InlineBadge>
                  <InlineBadge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {demography.topColonias.length} colonias líderes
                  </InlineBadge>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* Edad */}
              <DemographyCard title="Distribución por edad" subtitle="Se calcula desde fecha de nacimiento o fechadenacimiento.">
                {isLoading ? <Skeleton className="h-[220px] w-full rounded-lg" /> :
                 demography.knownAgeCount === 0 ? (
                   <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No hay suficientes fechas de nacimiento.</p>
                 ) : (
                   <div className="h-[220px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={demography.ageDistribution} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                         <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                         <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                         <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={TOOLTIP_STYLE} />
                         <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                           {demography.ageDistribution.map(e => <Cell key={e.key} fill={e.color} />)}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 )}
              </DemographyCard>

              {/* Presencia en redes */}
              <DemographyCard title="Presencia en redes" subtitle="Cuántos seguidores tienen registrada cada plataforma.">
                {isLoading ? <Skeleton className="h-[220px] w-full rounded-lg" /> : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {demography.socialCoverage.map(p => (
                        <div key={p.key} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                          <span className="text-xs text-muted-foreground">{p.label}</span>
                          <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">{p.value.toLocaleString("es-MX")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demography.socialCoverage} margin={{ top: 6, right: 12, left: -8, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {demography.socialCoverage.map(e => <Cell key={e.key} fill={e.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </DemographyCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              {/* Top colonias */}
              <DemographyCard title="Top colonias" subtitle="Concentración territorial de seguidores registrados.">
                {isLoading ? <Skeleton className="h-[240px] w-full rounded-lg" /> :
                 demography.topColonias.length === 0 ? (
                   <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Aún no hay colonias disponibles.</p>
                 ) : (
                   <div className="h-[240px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart layout="vertical" data={demography.topColonias} margin={{ top: 6, right: 18, left: 42, bottom: 6 }}>
                         <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
                         <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                         <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={TOOLTIP_STYLE} />
                         <Bar dataKey="value" fill="#0f766e" radius={[0, 6, 6, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 )}
              </DemographyCard>

              {/* Intereses y CPs */}
              <DemographyCard title="Intereses y códigos postales" subtitle="Temas declarados y CP con mayor presencia.">
                {isLoading ? <Skeleton className="h-[240px] w-full rounded-lg" /> : (
                  <div className="grid h-[240px] grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Temas más interesantes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {demography.topTopics.length > 0
                          ? demography.topTopics.map(t => (
                              <InlineBadge key={t.name} className="bg-violet-500/10 text-violet-700 dark:text-violet-300">
                                {t.name} · {t.value}
                              </InlineBadge>
                            ))
                          : <p className="text-sm text-muted-foreground">Sin temas declarados.</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Distribución top por CP</p>
                      {demography.topCPs.length > 0 ? (
                        <div className="h-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={demography.topCPs} dataKey="value" nameKey="name" innerRadius={36} outerRadius={58} paddingAngle={3}>
                                {demography.topCPs.map((_, i) => (
                                  <Cell key={i} fill={["#2563eb","#14b8a6","#8b5cf6","#f59e0b","#ef4444","#64748b"][i % 6]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin CP suficientes para graficar.</p>
                      )}
                    </div>
                  </div>
                )}
              </DemographyCard>
            </div>
          </motion.div>
        </div>

        {/* ─── Columna derecha (lista angosta de seguidores) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className={listSidebarCardClass}
        >
          {/* Toolbar */}
          <div className="shrink-0 space-y-2 border-b border-border/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">Seguidores</p>
                {!isLoading && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {filtered.length.toLocaleString("es-MX")}
                  </span>
                )}
              </div>
              <select
                value={`${sortCol}:${sortDir}`}
                onChange={e => {
                  const [c, d] = e.target.value.split(":") as [SortCol, SortDir];
                  setSortCol(c); setSortDir(d);
                }}
                className="h-7 rounded-lg border border-border/60 bg-muted/40 px-2 text-[11px] text-muted-foreground focus-visible:outline-none"
                aria-label="Ordenar"
              >
                <option value="registro:desc">Más recientes</option>
                <option value="registro:asc">Más antiguos</option>
                <option value="nombre:asc">A → Z</option>
                <option value="nombre:desc">Z → A</option>
                <option value="directos:desc">Más invitados</option>
                <option value="directos:asc">Menos invitados</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre, teléfono…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border-border/60 bg-muted/40 pl-7 pr-7 text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="space-y-px p-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ opacity: 1 - i * 0.1 }} />)}
              </div>
            )}
            {!isLoading && isError && (
              <p className="py-12 text-center text-sm font-medium text-destructive">No se pudo cargar el listado.</p>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{search ? "Sin resultados" : "Sin seguidores"}</p>
                <p className="text-xs text-muted-foreground">{search ? "Intenta con otro término." : "Aún no hay datos."}</p>
              </div>
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <ul className="divide-y divide-border/40">
                {pageRows.map((m, i) => {
                  const nombre   = m.nombre?.trim() || "—";
                  const telefono = m.telefono != null && String(m.telefono).trim() ? String(m.telefono) : "";
                  const colonia  = m.colonia?.trim() || "";
                  const directos = directCountMap.get(m.id) ?? 0;
                  const fechaCorta = new Date(m.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                          {nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground">{nombre}</span>
                            <SocialIcons m={m} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                            {telefono && <span className="truncate">{telefono}</span>}
                            {telefono && colonia && <span aria-hidden>·</span>}
                            {colonia && (
                              <span className="flex min-w-0 items-center gap-0.5 truncate">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{colonia}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                          {directos > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {directos} dir.
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                          <span className="text-[10px] tabular-nums text-muted-foreground">{fechaCorta}</span>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Paginación */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, filtered.length)}</span>
                {" "}de{" "}
                <span className="tabular-nums font-medium text-foreground">{filtered.length.toLocaleString("es-MX")}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 rounded-lg border-border/60 p-0"
                  disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="min-w-[3.5rem] text-center text-[11px] text-muted-foreground">{safePage}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 w-7 rounded-lg border-border/60 p-0"
                  disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}
