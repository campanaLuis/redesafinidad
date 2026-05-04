import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MemberDetailDialog } from "@/components/dashboard/MemberDetailDialog";
import {
  useEstructuraTerritorialData,
  type MiembroET,
  type TipoUsuario,
} from "@/hooks/useEstructuraTerritorialData";
import { useReportesLonas, type ReporteLona } from "@/hooks/useReportesLonas";
import type { NetworkMember } from "@/types/network";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listSidebarCardClass,
  splitListLayoutClass,
  splitLeftClass,
  compactRowClass,
  cardSurface,
  splitPageKickerClass,
  splitPageTitleClass,
  splitPageDescClass,
} from "@/lib/appUi";
import { reporteFechaCorta, reporteFechaRelativa } from "@/lib/reporteFecha";
import { cn } from "@/lib/utils";
import {
  Users, Landmark, Phone, SlidersHorizontal,
  Search, ChevronLeft, ChevronRight, X, MapPin, ImageOff, Volume2, Clock,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ─── Map constants ──────────────────────────────────────── */
const QRO_CENTER: L.LatLngExpression = [20.5888, -100.3899];
const QRO_ZOOM = 11;

/* ─── adapter MiembroET → NetworkMember ─────────────────────────── */
function toNetworkMember(m: MiembroET): NetworkMember {
  return {
    id: Number(m.id),
    path: String(m.id),
    refiereid: null,
    nombre: m.nombre,
    codigopostal: null,
    colonia: [m.municipio, m.localidad].filter(Boolean).join(", ") || (m.tipo_usuario ? `Tipo: ${m.tipo_usuario}` : null),
    selfie_url: null,
    hash_code: null,
    twitter_username: null,
    instagram_username: null,
    facebook_username: null,
    tiktok_username: null,
    temas_mas_interesantes: m.programa,
    telefono: m.celular,
    created_at: m.creado_en,
    fechadenacimiento: null,
    direct_descendants_count: null,
    total_descendants_count: null,
    wa_message: null,
  };
}

const PAGE_SIZE = 25;
const ALL = "__all__";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

/* ─── Tipo badge config ──────────────────────────────────── */
const TIPO_CONFIG: Record<TipoUsuario, { label: string; cls: string }> = {
  promotor: { label: "Promotor",  cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  vocal:    { label: "Vocal",     cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  enlace:   { label: "Enlace",    cls: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  regional: { label: "Regional",  cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  estatal:  { label: "Estatal",   cls: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

/* ─── Programa badge — colores por índice ────────────────── */
const PROG_PALETTES = [
  "bg-sky-50   text-sky-700   dark:bg-sky-950   dark:text-sky-300",
  "bg-teal-50  text-teal-700  dark:bg-teal-950  dark:text-teal-300",
  "bg-pink-50  text-pink-700  dark:bg-pink-950  dark:text-pink-300",
  "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-lime-50  text-lime-700  dark:bg-lime-950  dark:text-lime-300",
];
function progCls(prog: string, index: Map<string, number>) {
  const i = index.get(prog) ?? 0;
  return PROG_PALETTES[i % PROG_PALETTES.length];
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-sky-500",
];
function avatarColor(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function mediaProxyUrl(url: string | null): string | null {
  if (!url) return null;
  return `/api/twilio-media.php?url=${encodeURIComponent(url)}`;
}

function hasReporteDescription(lona: ReporteLona): boolean {
  return Boolean(lona.apoyodescripcion?.trim() || lona.apoyodescripcionvoz_url);
}

/** Fecha fija (dd/mm/aaaa) + “Realizado hace …” */
function LonaFechaTexto({ lona, className, compact = false }: {
  lona: ReporteLona;
  className?: string;
  compact?: boolean;
}) {
  const corta = reporteFechaCorta(lona.created_at);
  const rel   = reporteFechaRelativa(lona.created_at);
  if (!corta && !rel) {
    return (
      <p className={cn(compact ? "text-[9px] text-muted-foreground/50" : "text-[11px] text-muted-foreground/50", className)}>
        Sin fecha de registro
      </p>
    );
  }
  return (
    <div className={cn("flex items-start gap-1.5", className)}>
      <Clock className={cn("mt-0.5 shrink-0 text-muted-foreground/60", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <div className="min-w-0">
        {corta && (
          <p className={cn("tabular-nums text-foreground", compact ? "text-[10px] font-medium" : "text-xs font-medium")}>
            {corta}
          </p>
        )}
        {rel && (
          <p className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
            Realizado {rel}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── KPI block ──────────────────────────────────────────── */
function KpiBlock({ label, value, icon: Icon, color, delay = 0 }: {
  label: string; value: string | number; icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut", delay }}
      className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-5 shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      </div>
    </motion.div>
  );
}

/* ─── Program tags ───────────────────────────────────────── */
function ProgramaTags({ programa, progIndex }: { programa: string | null; progIndex: Map<string, number> }) {
  if (!programa?.trim()) return <span className="text-sm text-muted-foreground/40">—</span>;
  const parts = programa.split(",").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <span key={p} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold", progCls(p, progIndex))}>
          {p}
        </span>
      ))}
    </div>
  );
}

/* ─── Lona card (sidebar list item) ─────────────────────── */
function LonaCard({ lona, selected, onClick }: { lona: ReporteLona; selected: boolean; onClick: () => void }) {
  const nombre = lona.nombre ?? "Sin nombre";
  const fotoUrl = mediaProxyUrl(lona.foto_url);
  const hasTextDescription = Boolean(lona.apoyodescripcion?.trim());
  const hasVoiceDescription = Boolean(lona.apoyodescripcionvoz_url);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Foto */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {fotoUrl ? (
            <img src={fotoUrl} alt={nombre} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
          <div className="mt-0.5">
            <LonaFechaTexto lona={lona} compact />
          </div>
          {lona.telefono && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              {lona.telefono}
            </p>
          )}
          {hasTextDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
              {lona.apoyodescripcion}
            </p>
          )}
          {!hasTextDescription && hasVoiceDescription && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
              <Volume2 className="h-3 w-3 shrink-0" />
              Descripción por voz
            </p>
          )}
          {(lona.ubicacion_latitud != null && lona.ubicacion_longitud != null) ? (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-3 w-3" /> Ubicación registrada
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <MapPin className="h-3 w-3" /> Sin coordenadas
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function LonaDetailPanel({ lona, onClose }: { lona: ReporteLona; onClose: () => void }) {
  const nombre = lona.nombre ?? "Sin nombre";
  const fotoUrl = mediaProxyUrl(lona.foto_url);
  const audioUrl = mediaProxyUrl(lona.apoyodescripcionvoz_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
    >
      <div className="shrink-0 flex items-start justify-between gap-2 border-b border-border/40 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Detalle</p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">{nombre}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Cerrar detalle"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <div className="overflow-hidden rounded-xl bg-muted">
          {fotoUrl ? (
            <img src={fotoUrl} alt={nombre} className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center">
              <ImageOff className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fecha de registro</p>
            <LonaFechaTexto lona={lona} className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2" />
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {lona.telefono && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <Phone className="h-3 w-3" />
                {lona.telefono}
              </span>
            )}
            {lona.ubicacion_latitud != null && lona.ubicacion_longitud != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <MapPin className="h-3 w-3" />
                {lona.ubicacion_latitud.toFixed(4)}, {lona.ubicacion_longitud.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Descripción</p>
          {lona.apoyodescripcion?.trim() ? (
            <p className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">
              {lona.apoyodescripcion}
            </p>
          ) : audioUrl ? (
            <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                Descripción por voz
              </p>
              <audio controls className="w-full" src={audioUrl} />
            </div>
          ) : (
            <p className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Sin descripción registrada.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Lonas Map view ─────────────────────────────────────── */
function LonasMapView() {
  const { rows, withCoords, isLoading, isError, refetch } = useReportesLonas();
  const [selected, setSelected] = useState<ReporteLona | null>(null);
  const [searchLona, setSearchLona] = useState("");

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef   = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<number, L.Marker>>(new Map());

  const filtered = useMemo(() => {
    const q = searchLona.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const fechas = [reporteFechaCorta(r.created_at), reporteFechaRelativa(r.created_at)]
        .filter(Boolean)
        .join(" ");
      return [r.nombre, r.telefono, r.apoyodescripcion, r.apoyodescripcionvoz_url, fechas]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, searchLona]);

  /* Init map */
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { center: QRO_CENTER, zoom: QRO_ZOOM });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      markersRef.current = null;
      markerMapRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* Sync markers when data changes */
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();
    markerMapRef.current.clear();

    withCoords.forEach((lona) => {
      const lat = lona.ubicacion_latitud!;
      const lng = lona.ubicacion_longitud!;
      const nombre = lona.nombre ?? "Sin nombre";

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(buildPopup(lona), { maxWidth: 280 })
        .on("click", () => setSelected(lona));

      marker.addTo(markersRef.current!);
      markerMapRef.current.set(lona.id, marker);
    });
  }, [withCoords]);

  /* Pan + open popup on selection */
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    if (selected.ubicacion_latitud == null || selected.ubicacion_longitud == null) return;
    mapRef.current.flyTo([selected.ubicacion_latitud, selected.ubicacion_longitud], 15, { duration: 0.8 });
    const marker = markerMapRef.current.get(selected.id);
    if (marker) setTimeout(() => marker.openPopup(), 850);
  }, [selected]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full min-h-0 flex-col gap-3"
    >
      {/* KPI bar */}
      <div className="shrink-0 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total lonas</p>
            {isLoading ? (
              <Skeleton className="mt-0.5 h-5 w-10" />
            ) : (
              <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{rows.length}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Con ubicación</p>
            {isLoading ? (
              <Skeleton className="mt-0.5 h-5 w-10" />
            ) : (
              <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{withCoords.length}</p>
            )}
          </div>
        </div>
        {selected && selected.ubicacion_latitud == null && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <MapPin className="h-3.5 w-3.5" />
            "{selected.nombre ?? "Sin nombre"}" sin coordenadas
          </div>
        )}
      </div>

      {/* Main layout: map + side panel — ocupan el alto sobrante */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 xl:flex-row">
        {/* Map */}
        <div className="relative flex-1 min-h-[260px] overflow-hidden rounded-2xl border border-border/50 shadow-sm">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <p className="text-xs text-muted-foreground">Cargando ubicaciones…</p>
              </div>
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/90">
              <p className="text-sm font-medium text-destructive">Error al cargar los reportes</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
            </div>
          )}
          <div ref={mapElRef} className="h-full w-full" />
        </div>

        {/* Side panel — alterna entre lista y detalle */}
        <div className="flex w-full xl:w-[320px] xl:shrink-0 flex-col gap-2 min-h-0 xl:h-full">
          {selected ? (
            <LonaDetailPanel lona={selected} onClose={() => setSelected(null)} />
          ) : (
            <>
              <div className="shrink-0 relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nombre, teléfono…"
                  value={searchLona}
                  onChange={(e) => setSearchLona(e.target.value)}
                  className="h-9 rounded-xl border-border/60 bg-muted/40 pl-8 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full shrink-0 rounded-xl" />
                ))}

                {!isLoading && filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <MapPin className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Sin resultados</p>
                  </div>
                )}

                {!isLoading && filtered.map((lona) => (
                  <LonaCard
                    key={lona.id}
                    lona={lona}
                    selected={selected?.id === lona.id}
                    onClick={() => setSelected(lona)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* Build Leaflet popup HTML */
function buildPopup(lona: ReporteLona): string {
  const nombre = lona.nombre ?? "Sin nombre";
  const fotoUrl = mediaProxyUrl(lona.foto_url);
  const audioUrl = mediaProxyUrl(lona.apoyodescripcionvoz_url);
  const foto = fotoUrl
    ? `<img src="${fotoUrl}" alt="${nombre}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
    : "";
  const tel = lona.telefono
    ? `<p style="margin:4px 0;font-size:12px;color:#555;"><strong>Tel:</strong> ${lona.telefono}</p>`
    : "";
  const desc = lona.apoyodescripcion
    ? `<div style="margin-top:8px;"><p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#777;">Descripción</p><p style="margin:0;font-size:12px;color:#444;line-height:1.35;">${lona.apoyodescripcion}</p></div>`
    : "";
  const voz = audioUrl
    ? `<div style="margin-top:8px;"><p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#777;">Descripción por voz</p><audio controls style="width:100%;" src="${audioUrl}"></audio></div>`
    : "";
  const emptyDesc = !hasReporteDescription(lona)
    ? `<p style="margin:8px 0 0;font-size:12px;color:#777;">Sin descripción registrada.</p>`
    : "";
  const fCorta = reporteFechaCorta(lona.created_at);
  const fRel   = reporteFechaRelativa(lona.created_at);
  const fechas =
    fCorta || fRel
      ? `<div style="margin:8px 0 6px;padding:8px 10px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;">
          ${fCorta ? `<p style="margin:0 0 2px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:#111;">${fCorta}</p>` : ""}
          ${fRel ? `<p style="margin:0;font-size:11px;color:#555;">Realizado ${fRel}</p>` : ""}
         </div>`
      : "";
  return `<div style="min-width:200px;font-family:system-ui,sans-serif;">
    ${foto}
    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111;">${nombre}</p>
    ${fechas}
    ${tel}
    ${desc}
    ${voz}
    ${emptyDesc}
  </div>`;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function EstructuraTerritorialPage() {
  const { rows, programasUnicos, isLoading, isError } = useEstructuraTerritorialData();

  const [search, setSearch]           = useState("");
  const [filterTipo, setFilterTipo]   = useState(ALL);
  const [filterPrograma, setFilterPrograma] = useState(ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]               = useState(1);
  const [detailMember, setDetailMember] = useState<NetworkMember | null>(null);

  const allNetworkMembers = useMemo(() => rows.map(toNetworkMember), [rows]);

  const progIndex = useMemo(() => {
    const m = new Map<string, number>();
    programasUnicos.forEach((p, i) => m.set(p, i));
    return m;
  }, [programasUnicos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = [r.nombre, r.celular, r.tipo_usuario, r.programa, r.municipio].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterTipo !== ALL && r.tipo_usuario !== filterTipo) return false;
      if (filterPrograma !== ALL) {
        const progs = r.programa?.split(",").map((p) => p.trim()) ?? [];
        if (!progs.includes(filterPrograma)) return false;
      }
      return true;
    });
  }, [rows, search, filterTipo, filterPrograma]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows   = useMemo(() => filtered.slice(pageOffset, pageOffset + PAGE_SIZE), [filtered, pageOffset]);

  /* ── Breakdown: top programas (basado en filtrados) ── */
  const topProgramas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const progs = r.programa?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
      for (const p of progs) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const maxProgramaCount = Math.max(1, ...topProgramas.map((p) => p.count));

  const hasFilters = search !== "" || filterTipo !== ALL || filterPrograma !== ALL;
  function resetFilters() { setSearch(""); setFilterTipo(ALL); setFilterPrograma(ALL); setPage(1); }

  return (
    <DashboardShell title="Estructura Territorial">
      <MemberDetailDialog
        member={detailMember}
        open={detailMember != null}
        onOpenChange={o => { if (!o) setDetailMember(null); }}
        allMembers={allNetworkMembers}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="shrink-0">
        <p className={splitPageKickerClass}>Módulo</p>
        <h1 className={splitPageTitleClass}>Estructura Territorial</h1>
        <p className={splitPageDescClass}>Operadores y su participación en programas</p>
      </motion.div>

      {/* ─── Tabs ─────────────────────────────────────────── */}
      <Tabs defaultValue="operadores" className="flex h-full min-h-0 w-full flex-1 flex-col">
        <TabsList className="shrink-0 h-9 self-start rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="operadores" className="rounded-lg px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Operadores
          </TabsTrigger>
          <TabsTrigger value="lonas" className="rounded-lg px-4 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MapPin className="mr-1.5 inline h-3.5 w-3.5" />
            Posicionamiento de Lonas
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Operadores ───────────────────────────── */}
        <TabsContent value="operadores" className="mt-3 flex-1 min-h-0 data-[state=inactive]:hidden">
          <div className={splitListLayoutClass}>
            {/* ─── Columna izquierda: KPIs + breakdowns ─── */}
            <div className={splitLeftClass}>
              {/* KPIs */}
              <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[64px] rounded-2xl" />)
                ) : (
                  <>
                    <KpiBlock label="Promotores" value={rows.filter(r => r.tipo_usuario === "promotor").length} icon={Users}    color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"     delay={0} />
                    <KpiBlock label="Vocales"    value={rows.filter(r => r.tipo_usuario === "vocal").length}    icon={Users}    color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" delay={0.06} />
                    <KpiBlock label="Enlaces"    value={rows.filter(r => r.tipo_usuario === "enlace").length}   icon={Users}    color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" delay={0.12} />
                    <KpiBlock label="Regionales" value={rows.filter(r => r.tipo_usuario === "regional").length} icon={Landmark} color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"   delay={0.18} />
                    <KpiBlock label="Estatales"  value={rows.filter(r => r.tipo_usuario === "estatal").length}  icon={Landmark} color="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"     delay={0.24} />
                  </>
                )}
              </motion.div>

              {/* Top programas */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className={cn(cardSurface, "p-5")}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Programas más activos</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {filtered.length.toLocaleString("es-MX")} operadores
                  </span>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)}
                  </div>
                ) : topProgramas.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Sin programas asignados.</p>
                ) : (
                  <ul className="space-y-2">
                    {topProgramas.map((p) => {
                      const pct = (p.count / maxProgramaCount) * 100;
                      return (
                        <li key={p.name} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-[12px]">
                            <span className="truncate font-medium text-foreground">{p.name}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{p.count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>

              {/* Filtros activos / hint */}
              {hasFilters && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={cn(cardSurface, "px-4 py-3")}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Filtros activos.</span>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-lg px-2 text-xs" onClick={resetFilters}>
                      <X className="h-3 w-3" /> Limpiar
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ─── Columna derecha: lista angosta de operadores ─── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
              className={listSidebarCardClass}
            >
              {/* Toolbar */}
              <div className="shrink-0 space-y-2 border-b border-border/40 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">Operadores</p>
                    {!isLoading && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {filtered.length.toLocaleString("es-MX")}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className={cn("h-7 gap-1 rounded-lg border-border/60 px-2 text-[11px]", showFilters && "border-primary/40 bg-primary/5 text-primary")}
                    onClick={() => setShowFilters((v) => !v)}
                    aria-label="Mostrar filtros"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {hasFilters && <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nombre, celular…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="h-8 w-full rounded-lg border-border/60 bg-muted/40 pl-7 pr-7 text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setPage(1); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Limpiar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 pt-2">
                        <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1); }}>
                          <SelectTrigger className="h-8 w-full rounded-lg border-border/60 bg-muted/40 text-xs">
                            <SelectValue placeholder="Todos los tipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL}>Todos los tipos</SelectItem>
                            {Object.entries(TIPO_CONFIG).map(([tipo, { label }]) => (
                              <SelectItem key={tipo} value={tipo}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={filterPrograma} onValueChange={(v) => { setFilterPrograma(v); setPage(1); }}>
                          <SelectTrigger className="h-8 w-full rounded-lg border-border/60 bg-muted/40 text-xs">
                            <SelectValue placeholder="Todos los programas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL}>Todos los programas</SelectItem>
                            {programasUnicos.map((prog) => (
                              <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Lista */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {isLoading && (
                  <div className="space-y-px p-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                )}
                {!isLoading && isError && (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <p className="text-sm font-medium text-destructive">Error al cargar</p>
                    <p className="text-xs text-muted-foreground">Verifica la conexión.</p>
                  </div>
                )}
                {!isLoading && !isError && filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                      <Landmark className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{hasFilters ? "Sin resultados" : "Sin operadores"}</p>
                    <p className="text-xs text-muted-foreground">{hasFilters ? "Prueba con otros filtros." : "Aún no hay registros."}</p>
                  </div>
                )}
                {!isLoading && !isError && filtered.length > 0 && (
                  <ul className="divide-y divide-border/40">
                    {pageRows.map((m, i) => {
                      const subtitulo = [m.municipio, m.localidad].filter(Boolean).join(", ");
                      const fechaCorta = m.creado_en
                        ? new Date(m.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                        : "";
                      const tipoCfg = m.tipo_usuario ? TIPO_CONFIG[m.tipo_usuario] : null;
                      const progs = m.programa?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
                      return (
                        <motion.li
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: Math.min(i * 0.012, 0.2) } }}
                        >
                          <button
                            type="button"
                            onClick={() => setDetailMember(toNetworkMember(m))}
                            className={cn(compactRowClass, "cursor-pointer items-start")}
                          >
                            <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", avatarColor(m.nombre))}>
                              {m.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-foreground">{m.nombre}</span>
                                {tipoCfg && (
                                  <span className={cn("shrink-0 inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-semibold", tipoCfg.cls)}>
                                    {tipoCfg.label}
                                  </span>
                                )}
                              </div>
                              {(subtitulo || m.celular) && (
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                                  {m.celular && (
                                    <span className="flex items-center gap-0.5">
                                      <Phone className="h-2.5 w-2.5 shrink-0" />
                                      {m.celular}
                                    </span>
                                  )}
                                  {m.celular && subtitulo && <span aria-hidden>·</span>}
                                  {subtitulo && <span className="truncate">{subtitulo}</span>}
                                </div>
                              )}
                              {progs.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-0.5">
                                  {progs.slice(0, 3).map((p) => (
                                    <span
                                      key={p}
                                      className={cn("inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-semibold", progCls(p, progIndex))}
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {progs.length > 3 && (
                                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0 text-[9px] font-semibold text-muted-foreground">
                                      +{progs.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 self-start text-[10px] tabular-nums text-muted-foreground">
                              {fechaCorta}
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Paginación */}
              {!isLoading && !isError && filtered.length > 0 && (
                <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, filtered.length)}</span>
                    {" "}de{" "}
                    <span className="tabular-nums font-medium text-foreground">{filtered.length.toLocaleString("es-MX")}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 rounded-lg border-border/60 p-0"
                      disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="min-w-[3.5rem] text-center text-[11px] text-muted-foreground">{safePage}/{totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 rounded-lg border-border/60 p-0"
                      disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </TabsContent>

        {/* ── Tab: Posicionamiento de Lonas ─────────────── */}
        <TabsContent value="lonas" className="mt-3 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden">
          <LonasMapView />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
