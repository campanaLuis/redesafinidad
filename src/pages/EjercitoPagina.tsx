import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MemberDetailDialog } from "@/components/dashboard/MemberDetailDialog";
import { useEjercitoDigitalData, type EjercitoMember } from "@/hooks/useEjercitoDigitalData";
import type { NetworkMember } from "@/types/network";
import { fmt, pct } from "@/components/dashboard/KpiLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Shield, CalendarPlus, Share2,
  ChevronLeft, ChevronRight,
  Search, X, Twitter, Instagram, Facebook, MapPin,
} from "lucide-react";

/* ─── constantes ────────────────────────────────────────────────── */
const PAGE_SIZE = 30;
type SortCol = "nombre" | "registro";
type SortDir = "asc" | "desc";

/* ─── colores para badge de rol ─────────────────────────────────── */
const ROL_COLORS: Record<string, string> = {
  "embajadora joven": "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "embajador joven":  "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "especialista":     "bg-blue-50   text-blue-700   dark:bg-blue-950   dark:text-blue-300",
  "creador creativo": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "creador de contenido": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "promotora local":  "bg-teal-50   text-teal-700   dark:bg-teal-950   dark:text-teal-300",
  "promotor local":   "bg-teal-50   text-teal-700   dark:bg-teal-950   dark:text-teal-300",
  "influencer micro": "bg-pink-50   text-pink-700   dark:bg-pink-950   dark:text-pink-300",
  "lider comunitario":"bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "líder comunitario":"bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "coordinador":      "bg-green-50  text-green-700  dark:bg-green-950  dark:text-green-300",
  "coordinadora":     "bg-green-50  text-green-700  dark:bg-green-950  dark:text-green-300",
  "voluntario":       "bg-slate-100 text-slate-600  dark:bg-slate-800  dark:text-slate-300",
  "voluntaria":       "bg-slate-100 text-slate-600  dark:bg-slate-800  dark:text-slate-300",
  "gestor de comunidad":"bg-rose-50 text-rose-700   dark:bg-rose-950   dark:text-rose-300",
  "gestora de comunidad":"bg-rose-50 text-rose-700  dark:bg-rose-950   dark:text-rose-300",
  "promotora territorial":"bg-cyan-50 text-cyan-700 dark:bg-cyan-950   dark:text-cyan-300",
  "promotor territorial": "bg-cyan-50 text-cyan-700 dark:bg-cyan-950   dark:text-cyan-300",
  "tech lead":        "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};
function rolColor(rol?: string | null) {
  if (!rol) return "bg-muted text-muted-foreground";
  return ROL_COLORS[rol.toLowerCase()] ?? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
}

/* ─── colores de avatar ──────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-pink-500",
  "bg-orange-500","bg-teal-500","bg-rose-500","bg-cyan-500",
];
function avatarColor(id: string | number) {
  const n = typeof id === "number" ? id : parseInt(String(id), 10) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

/* ─── id estable (UUID o numérico) → number para NetworkMember ─── */
function idFromEjercitoPk(id: string): number {
  const n = Number(id);
  if (Number.isFinite(n) && n > 0 && n < 1e15) return n;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return (h % 900_000_000) + 100_000_000;
}

/* ─── adapter EjercitoMember → NetworkMember ────────────────────── */
function toNetworkMember(m: EjercitoMember): NetworkMember {
  return {
    id: idFromEjercitoPk(m.id),
    path: m.path ?? String(m.id),
    refiereid: m.refiereid,
    nombre: m.nombre ?? "",
    codigopostal: m.codigopostal ? Number(m.codigopostal) : null,
    colonia: m.colonia,
    selfie_url: m.selfie_url,
    hash_code: m.hash_code,
    twitter_username: m.twitter_handle || null,
    instagram_username: m.instagram_handle || null,
    facebook_username: m.facebook_handle || null,
    tiktok_username: m.tiktok_handle || null,
    temas_mas_interesantes: m.intereses_text,
    telefono: m.telefono,
    created_at: m.fecha_registro || m.created_at || "",
    fechadenacimiento: m.fechadenacimiento,
    direct_descendants_count: null,
    total_descendants_count: null,
    wa_message: null,
  };
}

/* ─── icono TikTok ───────────────────────────────────────────────── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/* ─── íconos de redes ────────────────────────────────────────────── */
function SocialIcons({ m }: { m: EjercitoMember }) {
  return (
    <div className="flex items-center gap-1">
      {m.twitter_handle   && <Twitter    className="h-3 w-3 text-sky-500" />}
      {m.instagram_handle && <Instagram  className="h-3 w-3 text-pink-500" />}
      {m.facebook_handle  && <Facebook   className="h-3 w-3 text-blue-600" />}
      {m.tiktok_handle    && <TikTokIcon className="h-3 w-3 text-foreground" />}
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function EjercitoPagina() {
  const { members, total, newThisMonth, isLoading, isError } = useEjercitoDigitalData();

  const [detailMember, setDetailMember] = useState<NetworkMember | null>(null);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>("registro");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allNetworkMembers = useMemo(() => members.map(toNetworkMember), [members]);

  const withSocial = useMemo(
    () => members.filter(m => m.twitter_handle || m.instagram_handle || m.facebook_handle || m.tiktok_handle).length,
    [members],
  );

  /* ── distribución por rol (top 6) ── */
  const topRoles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      const r = (m.rolquebusca ?? "").trim();
      if (!r) continue;
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [members]);
  const maxRoleCount = topRoles[0]?.[1] ?? 1;

  /* ── lista: filtrado + ordenado ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? members.filter(m =>
          [m.nombre, m.profesion, m.colonia, m.rolquebusca, m.niveldeestudios]
            .join(" ").toLowerCase().includes(q),
        )
      : members;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nombre")    cmp = (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
      if (sortCol === "registro")  cmp = new Date(a.fecha_registro || a.created_at || "").getTime()
                                       - new Date(b.fecha_registro || b.created_at || "").getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows   = useMemo(() => filtered.slice(pageOffset, pageOffset + PAGE_SIZE), [filtered, pageOffset]);

  useEffect(() => { setPage(1); }, [search, sortCol, sortDir]);

  const loading = isLoading;

  return (
    <DashboardShell title="Ejército Digital">

      <MemberDetailDialog
        member={detailMember}
        open={detailMember != null}
        onOpenChange={o => { if (!o) setDetailMember(null); }}
        allMembers={allNetworkMembers}
      />

      {/* ── encabezado ── */}
      <div className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Ejército Digital</h1>
        <p className={splitPageDescClass}>Red de activistas y creadores de contenido digital</p>
      </div>

      {isError && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar la información del Ejército Digital.
        </div>
      )}

      {/* ── Layout split: KPIs/info izquierda · lista angosta derecha ── */}
      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda ══ */}
        <div className={splitLeftClass}>
          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950">
                <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total miembros</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmt(total)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <CalendarPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Nuevas este mes</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">+{fmt(newThisMonth)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950">
                <Share2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Con redes sociales</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-20 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    {fmt(withSocial)}{" "}
                    <span className="text-base font-normal text-muted-foreground">({pct(withSocial, total)})</span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Distribución por rol */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top roles
              </p>
              {!loading && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {topRoles.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-lg" />
                ))}
              </div>
            ) : topRoles.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Sin datos.</p>
            ) : (
              <ul className="space-y-2.5">
                {topRoles.map(([rol, count]) => (
                  <li key={rol} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn(
                        "max-w-[70%] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        rolColor(rol),
                      )}>
                        {rol}
                      </span>
                      <span className="tabular-nums text-xs font-medium text-foreground">{fmt(count)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(count / maxRoleCount) * 100}%` }}
                      />
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
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className={listSidebarCardClass}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Miembros</p>
              {!loading && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {filtered.length.toLocaleString("es-MX")}
                </span>
              )}
            </div>
            <select
              value={`${sortCol}-${sortDir}`}
              onChange={(e) => {
                const [c, d] = e.target.value.split("-") as [SortCol, SortDir];
                setSortCol(c); setSortDir(d);
              }}
              className="h-7 rounded-md border border-border/60 bg-muted/30 px-1.5 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              aria-label="Ordenar"
            >
              <option value="registro-desc">Más recientes</option>
              <option value="registro-asc">Más antiguos</option>
              <option value="nombre-asc">Nombre A → Z</option>
              <option value="nombre-desc">Nombre Z → A</option>
            </select>
          </div>

          <div className="shrink-0 border-b border-border/40 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre, rol, colonia…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 rounded-md border-border/50 bg-muted/30 pl-7 pr-7 text-sm placeholder:text-xs focus-visible:ring-1"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="space-y-px p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          )}

          {!loading && isError && (
            <p className="py-12 text-center text-sm font-medium text-destructive">No se pudo cargar el listado.</p>
          )}

          {!loading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{search ? "Sin resultados" : "Sin miembros"}</p>
            </div>
          )}

          {!loading && !isError && filtered.length > 0 && (
            <>
              <ul className="flex-1 min-h-0 divide-y divide-border/30 overflow-y-auto">
                {pageRows.map((m, i) => {
                  const nombre   = m.nombre?.trim() || "—";
                  const initials = nombre.charAt(0).toUpperCase();
                  const ubicacion = [m.colonia, m.codigopostal].filter(Boolean).join(" · ") || null;
                  return (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: Math.min(i * 0.012, 0.2) } }}
                    >
                      <button
                        type="button"
                        onClick={() => setDetailMember(toNetworkMember(m))}
                        className={cn(compactRowClass, "cursor-pointer")}
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white",
                          avatarColor(m.id),
                        )}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
                            <SocialIcons m={m} />
                          </div>
                          {m.rolquebusca && (
                            <span className={cn(
                              "mt-0.5 inline-block max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                              rolColor(m.rolquebusca),
                            )}>
                              {m.rolquebusca}
                            </span>
                          )}
                          {ubicacion && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate">{ubicacion}</span>
                            </p>
                          )}
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, filtered.length)}</span>
                  {" "}/{" "}
                  <span className="tabular-nums font-medium text-foreground">{filtered.length.toLocaleString("es-MX")}</span>
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
