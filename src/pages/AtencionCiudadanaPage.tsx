import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAtencionCiudadanaData } from "@/hooks/useAtencionCiudadanaData";
import { fmt } from "@/components/dashboard/KpiLayout";
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
  MessageSquare, CalendarPlus, MapPin, Camera,
  ChevronLeft, ChevronRight,
  Search, X,
} from "lucide-react";

/* ─── constantes ────────────────────────────────────────────────── */
const PAGE_SIZE = 20;
type SortCol = "nombre" | "fecha";
type SortDir = "asc" | "desc";

/* ─── colores de avatar ──────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-pink-500",
  "bg-orange-500","bg-teal-500","bg-rose-500","bg-cyan-500",
  "bg-amber-500","bg-indigo-500",
];
function avatarColor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function AtencionCiudadanaPage() {
  const { rows, total, thisMonth, withCoords, withFoto, isLoading, isError } = useAtencionCiudadanaData();

  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── lista: filtrado + ordenado ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter(r =>
          [r.nombre, r.telefono, r.peticion].join(" ").toLowerCase().includes(q),
        )
      : rows;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nombre")  cmp = (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
      if (sortCol === "fecha")   cmp = new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows   = useMemo(() => filtered.slice(pageOffset, pageOffset + PAGE_SIZE), [filtered, pageOffset]);

  useEffect(() => { setPage(1); }, [search, sortCol, sortDir]);

  const loading = isLoading;

  return (
    <DashboardShell title="Atención Ciudadana">

      {/* ── encabezado compacto ── */}
      <div className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Atención Ciudadana</h1>
        <p className={splitPageDescClass}>Peticiones y reportes ciudadanos registrados</p>
      </div>

      {isError && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar la información de Atención Ciudadana.
        </div>
      )}

      {/* ── Layout split ── */}
      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda: KPIs + breakdown ══ */}
        <div className={splitLeftClass}>
          {/* KPIs (4) — tira baja */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              { k: "total", label: "Total", v: total, I: MessageSquare, c: "bg-blue-50 dark:bg-blue-950" },
              { k: "mes", label: "Este mes", v: thisMonth, I: CalendarPlus, c: "bg-emerald-50 dark:bg-emerald-950" },
              { k: "gps", label: "Ubicación", v: withCoords, I: MapPin, c: "bg-amber-50 dark:bg-amber-950" },
              { k: "foto", label: "Foto", v: withFoto, I: Camera, c: "bg-violet-50 dark:bg-violet-950" },
            ].map((row) => (
              <div
                key={row.k}
                className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm"
              >
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", row.c)}>
                  <row.I className="h-3.5 w-3.5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</p>
                  {loading ? <Skeleton className="mt-0.5 h-5 w-10 rounded-md" /> : (
                    <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{fmt(row.v)}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Cobertura GPS / foto en barras */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-xl border border-border/50 bg-card p-3 shadow-sm"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cobertura del registro
            </p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-full rounded-md" />
              </div>
            ) : (
              <ul className="space-y-2 text-xs">
                {[
                  { label: "Con ubicación GPS", value: withCoords, color: "bg-amber-500", Icon: MapPin },
                  { label: "Con fotografía", value: withFoto, color: "bg-violet-500", Icon: Camera },
                ].map(({ label, value, color, Icon }) => {
                  const pctVal = total ? Math.round((value / total) * 100) : 0;
                  return (
                    <li key={label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <Icon className="h-3 w-3 shrink-0 opacity-70" />
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground">
                          {fmt(value)} <span className="text-muted-foreground">· {pctVal}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                        <div className={cn("h-full rounded-full", color)} style={{ width: `${pctVal}%` }} />
                      </div>
                    </li>
                  );
                })}
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
          <div className="shrink-0 space-y-1.5 border-b border-border/40 px-2 py-2">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Peticiones</p>
                {!loading && (
                  <span className="text-xs font-medium tabular-nums text-foreground">
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
                className="h-6 max-w-[9.5rem] shrink-0 rounded border border-border/60 bg-muted/30 px-1 text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                aria-label="Ordenar"
              >
                <option value="fecha-desc">Recientes</option>
                <option value="fecha-asc">Antiguos</option>
                <option value="nombre-asc">A → Z</option>
                <option value="nombre-desc">Z → A</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 rounded-md border-border/50 bg-muted/30 pl-6 pr-6 text-xs placeholder:text-[10px] focus-visible:ring-1"
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
            <div className="space-y-px p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          )}

          {!loading && isError && (
            <p className="py-12 text-center text-sm font-medium text-destructive">No se pudo cargar el listado.</p>
          )}

          {!loading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{search ? "Sin resultados" : "Sin peticiones"}</p>
            </div>
          )}

          {!loading && !isError && filtered.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col">
              <ul className="min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto overflow-x-hidden">
                {pageRows.map((r, i) => {
                  const nombre   = r.nombre?.trim() || "—";
                  const initials = nombre.charAt(0).toUpperCase();
                  const hasCoords = !!r.ubicacion_coordenadas?.trim();
                  const hasFoto   = !!r.foto_url?.trim();
                  const dateStr   = r.creado_en
                    ? new Date(r.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                    : "—";
                  return (
                    <motion.li
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: Math.min(i * 0.01, 0.15) } }}
                    >
                      <div className={compactRowClass}>
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          avatarColor(r.id),
                        )}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">{nombre}</p>
                            <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{dateStr}</span>
                          </div>
                          {r.peticion?.trim() && (
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground" title={r.peticion}>
                              {r.peticion}
                            </p>
                          )}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            {hasCoords && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-px text-[8px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                <MapPin className="h-2 w-2" /> GPS
                              </span>
                            )}
                            {hasFoto ? (
                              <a
                                href={r.foto_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1 py-px text-[8px] font-medium text-violet-800 hover:bg-violet-100/80 dark:bg-violet-950/60 dark:text-violet-200"
                              >
                                <Camera className="h-2 w-2" /> Foto
                              </a>
                            ) : null}
                            {r.telefono?.trim() && (
                              <span className="ml-auto truncate text-[9px] tabular-nums text-muted-foreground">
                                {r.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">
                  <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, filtered.length)}</span>
                  <span className="mx-0.5">/</span>
                  <span className="tabular-nums font-medium text-foreground">{filtered.length.toLocaleString("es-MX")}</span>
                </p>
                <div className="flex items-center gap-0.5">
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded border-border/60 p-0"
                    disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-2.5 w-2.5" />
                  </Button>
                  <span className="min-w-8 text-center text-[10px] tabular-nums text-muted-foreground">{safePage}/{totalPages}</span>
                  <Button variant="outline" size="sm" className="h-6 w-6 rounded border-border/60 p-0"
                    disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}
