import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format, parseISO, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import { getJson, sendJson } from "@/lib/apiClient";
import { geocodeEventoUbicacion } from "@/lib/geocoding";
import { getStoredLogin } from "@/lib/brigadaTeamApi";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, Plus, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { listSidebarCardClass, splitListLayoutClass, splitLeftClass } from "@/lib/appUi";
import { cn } from "@/lib/utils";

/* ── Tipos ─────────────────────────────────────────────────────── */
interface Evento {
  id: string;
  owner_login: string;
  nombre: string;
  fecha: string;        // "YYYY-MM-DD"
  hora_inicio: string;  // "HH:MM"
  hora_fin: string;     // "HH:MM"
  ubicacion: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at?: string;
}

type EventoForm = Omit<Evento, "id" | "owner_login" | "created_at">;

const EMPTY_FORM: EventoForm = {
  nombre: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  ubicacion: "",
};

/* ── Helpers ────────────────────────────────────────────────────── */
function formatFecha(iso: string) {
  try { return format(parseISO(iso), "EEEE d 'de' MMMM yyyy", { locale: es }); }
  catch { return iso; }
}

function formatHora(t: string) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
}

/** Construye un Date combinando fecha "YYYY-MM-DD" + hora "HH:MM" */
function toDateTime(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora.length === 5 ? hora : hora.slice(0, 5)}:00`);
}

/** Formatea segundos en "2d 3h", "45m", "10s", etc. */
function fmtCountdown(totalSecs: number): string {
  const abs = Math.abs(totalSecs);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (d > 0)  return `${d}d ${h}h`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

/** Hook que actualiza cada segundo */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type EventoStatus = "activo" | "futuro" | "vencido";

function getEventoStatus(ev: Evento, now: Date): EventoStatus {
  const inicio = toDateTime(ev.fecha, ev.hora_inicio);
  const fin    = toDateTime(ev.fecha, ev.hora_fin);
  if (now >= inicio && now <= fin) return "activo";
  if (now < inicio)                return "futuro";
  return "vencido";
}

function CountdownBadge({ ev, now }: { ev: Evento; now: Date }) {
  const inicio = toDateTime(ev.fecha, ev.hora_inicio);
  const fin    = toDateTime(ev.fecha, ev.hora_fin);
  const status = getEventoStatus(ev, now);

  if (status === "activo") {
    const secsLeft = differenceInSeconds(fin, now);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        En curso · termina en {fmtCountdown(secsLeft)}
      </span>
    );
  }

  if (status === "futuro") {
    const secsLeft = differenceInSeconds(inicio, now);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        <Clock className="h-3 w-3 shrink-0" />
        Inicia en {fmtCountdown(secsLeft)}
      </span>
    );
  }

  const secsAgo = differenceInSeconds(now, fin);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border/60">
      <Clock className="h-3 w-3 shrink-0 opacity-60" />
      Terminó hace {fmtCountdown(secsAgo)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function EventosPage() {
  const ownerLogin = getStoredLogin();
  const now = useNow();

  const [eventos, setEventos]     = useState<Evento[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  /* Diálogo */
  const [open, setOpen]           = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<EventoForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Cargar eventos ── */
  const loadEventos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJson<Evento[]>(
        "/api/eventos?owner_login=" + encodeURIComponent(ownerLogin),
      );
      setEventos((data ?? []) as Evento[]);
    } catch (e) {
      toast.error("No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, [ownerLogin]);

  useEffect(() => { loadEventos(); }, [loadEventos]);

  /* ── Abrir diálogo ── */
  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(ev: Evento) {
    setEditId(ev.id);
    setForm({
      nombre:      ev.nombre,
      fecha:       ev.fecha,
      hora_inicio: ev.hora_inicio.slice(0, 5),
      hora_fin:    ev.hora_fin.slice(0, 5),
      ubicacion:   ev.ubicacion ?? "",
    });
    setFormError(null);
    setOpen(true);
  }

  /* ── Guardar ── */
  async function handleSave() {
    if (!form.nombre.trim()) { setFormError("El nombre es requerido."); return; }
    if (!form.fecha)         { setFormError("La fecha es requerida."); return; }
    if (!form.hora_inicio)   { setFormError("La hora de inicio es requerida."); return; }
    if (!form.hora_fin)      { setFormError("La hora de fin es requerida."); return; }
    setFormError(null);
    setSaving(true);
    try {
      const coords = await geocodeEventoUbicacion(form.ubicacion);
      const payload = {
        owner_login: ownerLogin,
        nombre:      form.nombre.trim(),
        fecha:       form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin:    form.hora_fin,
        ubicacion:   form.ubicacion?.trim() || null,
        lat:         coords?.lat ?? null,
        lng:         coords?.lng ?? null,
        updated_at:  new Date().toISOString(),
      };

      if (editId) {
        await sendJson("/api/eventos/" + encodeURIComponent(editId), "PATCH", payload);
        toast.success("Evento actualizado.");
      } else {
        await sendJson("/api/eventos", "POST", payload);
        toast.success("Evento creado.");
      }
      setOpen(false);
      loadEventos();
    } catch (e) {
      toast.error("No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Eliminar ── */
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await sendJson("/api/eventos/" + encodeURIComponent(id), "DELETE");
      setEventos((prev) => prev.filter((e) => e.id !== id));
      toast.message("Evento eliminado.");
    } catch {
      toast.error("No se pudo eliminar el evento.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    let activos = 0, futuros = 0, vencidos = 0;
    for (const ev of eventos) {
      const s = getEventoStatus(ev, now);
      if (s === "activo")  activos++;
      else if (s === "futuro") futuros++;
      else                 vencidos++;
    }
    return { activos, futuros, vencidos };
  }, [eventos, now]);

  /* ── Agrupar por mes ── */
  const grouped = eventos.reduce<Record<string, Evento[]>>((acc, ev) => {
    const key = ev.fecha.slice(0, 7); // "YYYY-MM"
    (acc[key] ??= []).push(ev);
    return acc;
  }, {});

  function monthLabel(key: string) {
    try { return format(parseISO(`${key}-01`), "MMMM yyyy", { locale: es }); }
    catch { return key; }
  }

  /* ── Próximo evento (futuro o activo, el más cercano) ── */
  const proximoEvento = useMemo(() => {
    const candidates = eventos
      .map((ev) => ({ ev, status: getEventoStatus(ev, now), inicio: toDateTime(ev.fecha, ev.hora_inicio) }))
      .filter((c) => c.status !== "vencido")
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    return candidates[0]?.ev ?? null;
  }, [eventos, now]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <DashboardShell title="Eventos">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Eventos</h1>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {eventos.length}
            </span>
          )}
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />Nuevo evento
        </Button>
      </div>

      <div className={splitListLayoutClass}>

        {/* ══ Columna izquierda: KPIs + próximo evento ══ */}
        <div className={splitLeftClass}>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Activos hoy",
                value: kpis.activos,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
                dot: "bg-emerald-500",
              },
              {
                label: "Futuros",
                value: kpis.futuros,
                color: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
                dot: "bg-indigo-500",
              },
              {
                label: "Vencidos",
                value: kpis.vencidos,
                color: "text-muted-foreground",
                bg: "bg-muted/40 border-border/60",
                dot: "bg-muted-foreground/40",
              },
            ].map(({ label, value, color, bg, dot }) => (
              <Card key={label} className={`border shadow-none ${bg}`}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                      {label}
                    </span>
                  </div>
                  {loading
                    ? <Skeleton className="h-7 w-10" />
                    : <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                  }
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Próximo evento destacado */}
          <Card className="border-border/80 shadow-none">
            <CardContent className="p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Próximo evento
              </p>
              {loading ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : proximoEvento ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{proximoEvento.nombre}</p>
                    <CountdownBadge ev={proximoEvento} now={now} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <span className="capitalize">{formatFecha(proximoEvento.fecha)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      {formatHora(proximoEvento.hora_inicio)} – {formatHora(proximoEvento.hora_fin)}
                    </span>
                    {proximoEvento.ubicacion && (
                      <a
                        href={proximoEvento.ubicacion.startsWith("http") ? proximoEvento.ubicacion : `https://${proximoEvento.ubicacion}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> Ver ubicación
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 opacity-50" /> Sin eventos próximos.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══ Columna derecha: lista compacta ══ */}
        <div className={listSidebarCardClass}>
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Calendario</p>
              {!loading && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {eventos.length}
                </span>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            )}

            {!loading && eventos.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sin eventos. Crea el primero.</p>
                <Button variant="outline" size="sm" onClick={openNew}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar
                </Button>
              </div>
            )}

            {!loading && Object.entries(grouped).map(([monthKey, evs]) => (
              <div key={monthKey}>
                <p className="sticky top-0 z-10 border-b border-border/40 bg-card/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground capitalize backdrop-blur">
                  {monthLabel(monthKey)}
                </p>
                <ul className="divide-y divide-border/30">
                  {evs.map((ev) => {
                    const status = getEventoStatus(ev, now);
                    const dotColor =
                      status === "activo" ? "bg-emerald-500"
                      : status === "futuro" ? "bg-indigo-500"
                      : "bg-muted-foreground/40";
                    return (
                      <li key={ev.id} className="group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/30">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{ev.nombre}</p>
                            <div className="hidden items-center gap-0.5 group-hover:flex">
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(ev)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                disabled={deletingId === ev.id}
                                onClick={() => setConfirmId(ev.id)}
                              >
                                {deletingId === ev.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Trash2 className="h-3 w-3" />
                                }
                              </Button>
                            </div>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="capitalize">{formatFecha(ev.fecha)}</span>
                            <span>•</span>
                            <span className="tabular-nums">
                              {formatHora(ev.hora_inicio)}–{formatHora(ev.hora_fin)}
                            </span>
                          </div>
                          <div className="mt-1">
                            <CountdownBadge ev={ev} now={now} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diálogo Crear / Editar ── */}
      <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ev-nombre">Nombre *</Label>
              <Input
                id="ev-nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del evento"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-fecha">Fecha *</Label>
              <Input
                id="ev-fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-inicio">Hora inicio *</Label>
                <Input
                  id="ev-inicio"
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-fin">Hora fin *</Label>
                <Input
                  id="ev-fin"
                  type="time"
                  value={form.hora_fin}
                  onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-ubicacion">Ubicación (URL de Maps)</Label>
              <Input
                id="ev-ubicacion"
                value={form.ubicacion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                placeholder="https://maps.google.com/..."
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmación eliminar ── */}
      <AlertDialog open={confirmId !== null} onOpenChange={(v) => { if (!v) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
