import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useBeneficiariosData, type Beneficiario } from "@/hooks/useBeneficiariosData";
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
  UserCheck, Landmark, Building2,
  ChevronLeft, ChevronRight,
  Search, X, MapPin,
} from "lucide-react";

/* ─── constantes ────────────────────────────────────────────────── */
const PAGE_SIZE = 30;
type SortCol = "nombre" | "programa" | "registro";
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

/* ─── paleta de colores para programas ──────────────────────────── */
const PROG_PALETTES = [
  "bg-blue-50   text-blue-700   dark:bg-blue-950   dark:text-blue-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-pink-50   text-pink-700   dark:bg-pink-950   dark:text-pink-300",
  "bg-teal-50   text-teal-700   dark:bg-teal-950   dark:text-teal-300",
  "bg-rose-50   text-rose-700   dark:bg-rose-950   dark:text-rose-300",
  "bg-amber-50  text-amber-700  dark:bg-amber-950  dark:text-amber-300",
  "bg-cyan-50   text-cyan-700   dark:bg-cyan-950   dark:text-cyan-300",
  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
];
function progColor(programa: string, index: Map<string, number>) {
  const i = index.get(programa) ?? 0;
  return PROG_PALETTES[i % PROG_PALETTES.length];
}

/* ─── helper dirección ───────────────────────────────────────────── */
function buildUbicacion(b: Beneficiario) {
  const linea1 = [b.colonia, b.municipio].filter(Boolean).join(" · ").trim();
  return linea1 || b.localidad?.trim() || null;
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function BeneficiariosPage() {
  const { beneficiarios, total, programas, municipios, isLoading, isError } = useBeneficiariosData();

  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [sortCol, setSortCol] = useState<SortCol>("registro");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* índice de color por programa */
  const progIndex = useMemo(() => {
    const m = new Map<string, number>();
    programas.forEach((p, i) => m.set(p, i));
    return m;
  }, [programas]);

  /* ── ranking de programas (top 6) ── */
  const topProgramas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of beneficiarios) {
      const p = (b.programa ?? "").trim();
      if (!p) continue;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [beneficiarios]);

  /* ── filtrado + ordenado ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? beneficiarios.filter(b =>
          [b.nombre_completo, b.programa, b.municipio, b.localidad, b.colonia, b.calle, b.telefono]
            .join(" ").toLowerCase().includes(q),
        )
      : beneficiarios;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nombre")   cmp = (a.nombre_completo ?? "").localeCompare(b.nombre_completo ?? "", "es");
      if (sortCol === "programa") cmp = (a.programa ?? "").localeCompare(b.programa ?? "", "es");
      if (sortCol === "registro") cmp = new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [beneficiarios, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows   = useMemo(() => filtered.slice(pageOffset, pageOffset + PAGE_SIZE), [filtered, pageOffset]);

  useEffect(() => { setPage(1); }, [search, sortCol, sortDir]);

  const loading = isLoading;
  const maxProgCount = topProgramas[0]?.[1] ?? 1;

  return (
    <DashboardShell title="Beneficiarios">

      {/* ── encabezado ── */}
      <div className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Beneficiarios</h1>
        <p className={splitPageDescClass}>Padrón de beneficiarios de programas sociales</p>
      </div>

      {isError && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar la información de beneficiarios.
        </div>
      )}

      {/* ── Layout split: info a la izquierda · lista angosta a la derecha ── */}
      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda: KPIs + breakdowns ══ */}
        <div className={splitLeftClass}>
          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total registros</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmt(total)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950">
                <Landmark className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Programas</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmt(programas.length)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Municipios</p>
                {loading ? (
                  <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
                ) : (
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmt(municipios.length)}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Distribución por programa */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Top programas
              </p>
              {!loading && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {topProgramas.length} de {programas.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-lg" />
                ))}
              </div>
            ) : topProgramas.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Sin datos.</p>
            ) : (
              <ul className="space-y-2.5">
                {topProgramas.map(([nombre, count]) => (
                  <li key={nombre} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn(
                        "max-w-[70%] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        progColor(nombre, progIndex),
                      )}>
                        {nombre}
                      </span>
                      <span className="tabular-nums text-xs font-medium text-foreground">{fmt(count)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(count / maxProgCount) * 100}%` }}
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
          {/* Header lista */}
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Beneficiarios</p>
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
              <option value="programa-asc">Programa A → Z</option>
            </select>
          </div>

          {/* Buscador */}
          <div className="shrink-0 border-b border-border/40 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre, programa, colonia…"
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
                <UserCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{search ? "Sin resultados" : "Sin beneficiarios"}</p>
            </div>
          )}

          {!loading && !isError && filtered.length > 0 && (
            <>
              <ul className="flex-1 min-h-0 divide-y divide-border/30 overflow-y-auto">
                {pageRows.map((b, i) => {
                  const nombre   = b.nombre_completo?.trim() || "—";
                  const initials = nombre.charAt(0).toUpperCase();
                  const ubicacion = buildUbicacion(b);
                  return (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: Math.min(i * 0.012, 0.2) } }}
                    >
                      <div className={compactRowClass}>
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white",
                          avatarColor(b.id),
                        )}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {b.programa ? (
                              <span className={cn(
                                "max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                progColor(b.programa, progIndex),
                              )}>
                                {b.programa}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">Sin programa</span>
                            )}
                          </div>
                          {ubicacion && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate">{ubicacion}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              {/* paginación */}
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
