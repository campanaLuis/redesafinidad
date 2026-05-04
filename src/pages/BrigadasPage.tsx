import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAllMembers } from "@/hooks/useNetworkData";
import type { NetworkMember } from "@/types/network";
import {
  DEFAULT_ADMIN_TEAM_ROLE, ADMIN_TEAM_ROLES, isAdminTeamRole,
  type AdminTeamEntry, type AdminTeamRole,
  type TeamApoyo, type TeamTask, newId,
} from "@/lib/teamWorkspaceStorage";
import {
  loadAdminTeam, upsertTeamMember, deleteTeamMember, upsertManyTeamMembers,
  loadApoyos, upsertApoyo, deleteApoyoById, getStoredLogin,
} from "@/lib/brigadaTeamApi";
import {
  downloadTeamTemplate, downloadApoyoTemplate, exportApoyoBeneficiaries,
  importTeamFile, importApoyoFile,
  fetchUsuariosDeApoyos, deleteUsuarioDeApoyo, updateApoyoNoRegCoordinates,
  fetchEquipoNoRegistrados, deleteEquipoNoRegistrado, updateEquipoNoRegistradoRol,
  registerInDirectory,
  type ImportResult, type UsuarioDeApoyo, type EquipoNoRegistrado, type DirectoryRegistration,
} from "@/lib/excelImport";
import { geocodeUsuarioDeApoyo } from "@/lib/geocoding";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronLeft, ChevronRight, HeartHandshake, Plus, Trash2, UserPlus, Users,
  FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2, UserX, UserCheck,
  MapPin, Loader2,
} from "lucide-react";
import { Dialog as RegDialog, DialogContent as RegDialogContent, DialogFooter as RegDialogFooter, DialogHeader as RegDialogHeader, DialogTitle as RegDialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ── Helpers ──────────────────────────────────────────────────────── */
function memberInitials(m: NetworkMember) {
  const p = m.nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
  return "?";
}
function formatCelular(t: number | string | null | undefined) {
  if (t == null || t === "") return "—";
  return String(t).trim() || "—";
}
const ROLE_LABEL: Record<AdminTeamRole, string> = {
  vocal: "Vocal", enlace: "Enlace", regional: "Regional", estatal: "Estatal",
};
const ROLE_TRIGGER: Record<AdminTeamRole, string> = {
  vocal:    "border-blue-500 bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-50",
  enlace:   "border-purple-500 bg-purple-100 text-purple-950 dark:bg-purple-950 dark:text-purple-50",
  regional: "border-sky-300 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-50",
  estatal:  "border-slate-400 bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
};
const ROLE_ITEM: Record<AdminTeamRole, string> = {
  vocal:    "focus:bg-blue-100 dark:focus:bg-blue-950",
  enlace:   "focus:bg-purple-100 dark:focus:bg-purple-950",
  regional: "focus:bg-sky-100 dark:focus:bg-sky-950",
  estatal:  "focus:bg-slate-200 dark:focus:bg-slate-800",
};
const NO_REG_PAGE_SIZE = 10;

function fmtLatLng(lat?: number | null, lng?: number | null): string {
  if (lat == null || lng == null) return "—";
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  return `${a.toFixed(5)}, ${b.toFixed(5)}`;
}

/** Rol efectivo para filas importadas sin directorio (alinea filtro de grupo y selector). */
function normalizedUnregRole(rol?: string | null): AdminTeamRole {
  const r = String(rol ?? "vocal").trim().toLowerCase();
  return isAdminTeamRole(r) ? r : "vocal";
}

/* ── Panel resultado de importación ─────────────────────────────── */
function ImportResultPanel({ result, onClose, onRegister }: {
  result: ImportResult;
  onClose: () => void;
  onRegister?: (nombre: string, celular: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500 shrink-0" />
          Resultado de importación
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {/* Resumen */}
      <div className="flex flex-wrap gap-3">
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {result.matched.length} encontrado{result.matched.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {result.notFound.length} no encontrado{result.notFound.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Encontrados */}
        {result.matched.length > 0 && (
          <div className="rounded border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Encontrados y añadidos
            </div>
            <div className="divide-y divide-border/60 max-h-52 overflow-y-auto">
              {result.matched.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="flex-1 truncate">{r.nombre || "—"}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{r.celular}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No encontrados */}
        {result.notFound.length > 0 && (
          <div className="rounded border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              No en el directorio
            </div>
            <div className="divide-y divide-border/60 max-h-52 overflow-y-auto">
              {result.notFound.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="flex-1 truncate">{r.nombre || "—"}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{r.celular}</span>
                  {onRegister && (
                    <button
                      onClick={() => onRegister(r.nombre, r.celular)}
                      className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                    >
                      <UserCheck className="h-3 w-3" />Registrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export function BrigadasPage() {
  const ownerLogin = useMemo(() => getStoredLogin(), []);

  const { data: members = [], isLoading: membersLoading, isError } = useQuery({
    queryKey: ["network", "all-members"],
    queryFn: fetchAllMembers,
  });

  /* ── Estado principal (persistido vía API) ── */
  const [teamEntries, setTeamEntries] = useState<AdminTeamEntry[]>([]);
  const [apoyos, setApoyos] = useState<TeamApoyo[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── Equipo no registrados (definido ANTES del useEffect que lo usa) ── */
  const [equipoNoReg, setEquipoNoReg] = useState<EquipoNoRegistrado[]>([]);
  const [equipoNoRegLoaded, setEquipoNoRegLoaded] = useState(false);
  const [deletingEqId, setDeletingEqId] = useState<string | null>(null);

  const loadEquipoNoReg = useCallback(async () => {
    try { setEquipoNoReg(await fetchEquipoNoRegistrados()); }
    catch { /* silencioso */ }
    finally { setEquipoNoRegLoaded(true); }
  }, []);

  useEffect(() => {
    Promise.all([
      loadAdminTeam(ownerLogin),
      loadApoyos(ownerLogin),
    ]).then(([team, aps]) => {
      setTeamEntries(team);
      setApoyos(aps);
    }).catch((e) => toast.error(`Error al cargar datos: ${e.message}`))
      .finally(() => setDataLoading(false));
    loadEquipoNoReg();
  }, [ownerLogin, loadEquipoNoReg]);

  /* ── Diálogos ── */
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newApoyoOpen, setNewApoyoOpen] = useState(false);
  const [newApoyoName, setNewApoyoName] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, { title: string; memberId: string }>>({});
  const [beneficiaryProjectId, setBeneficiaryProjectId] = useState<string | null>(null);
  const [beneficiarySearch, setBeneficiarySearch] = useState("");

  /* ── Import Excel ── */
  const [teamImportResult, setTeamImportResult] = useState<ImportResult | null>(null);
  const [teamImporting, setTeamImporting] = useState(false);
  const teamFileRef = useRef<HTMLInputElement | null>(null);
  const [apoyoImportProjectId, setApoyoImportProjectId] = useState<string | null>(null);
  /** Página (1-based) de la tabla "No registrados" por id de apoyo. */
  const [noRegPageByApoyo, setNoRegPageByApoyo] = useState<Record<string, number>>({});
  /** Página (1-based) de beneficiarios del directorio por id de apoyo. */
  const [beneficiaryPageByApoyo, setBeneficiaryPageByApoyo] = useState<Record<string, number>>({});
  const [apoyoImporting, setApoyoImporting] = useState(false);
  const apoyoFileRef = useRef<HTMLInputElement | null>(null);

  /* ── Usuarios de apoyos (no registrados) ── */
  const [usuariosApoyos, setUsuariosApoyos] = useState<UsuarioDeApoyo[]>([]);
  const [usuariosLoaded, setUsuariosLoaded] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [geocodingNoRegId, setGeocodingNoRegId] = useState<string | null>(null);

  /* ── Diálogo de registro en directorio ── */
  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState<DirectoryRegistration>({ nombre: "", apellidos: "", celular: "", municipio: "", cp: "" });
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSourceId, setRegSourceId] = useState<string | null>(null); // id en apoyos_no_registrados si aplica

  function openRegDialog(pre: Partial<DirectoryRegistration>, sourceId?: string) {
    setRegForm({ nombre: pre.nombre ?? "", apellidos: pre.apellidos ?? "", celular: pre.celular ?? "", municipio: pre.municipio ?? "", cp: pre.cp ?? "" });
    setRegError(null);
    setRegSourceId(sourceId ?? null);
    setRegOpen(true);
  }

  async function handleRegSave() {
    if (!regForm.celular.trim()) { setRegError("El celular es requerido."); return; }
    setRegSaving(true); setRegError(null);
    try {
      await registerInDirectory(regForm);
      if (regSourceId) {
        // Intentar borrar de apoyos_no_registrados
        const inApoyos = usuariosApoyos.find((u) => u.id === regSourceId);
        if (inApoyos) {
          await deleteUsuarioDeApoyo(regSourceId).catch(() => {});
          setUsuariosApoyos((prev) => prev.filter((u) => u.id !== regSourceId));
        }
        // Intentar borrar de equipo_no_registrados
        const inEquipo = equipoNoReg.find((u) => u.id === regSourceId);
        if (inEquipo) {
          await deleteEquipoNoRegistrado(regSourceId).catch(() => {});
          setEquipoNoReg((prev) => prev.filter((u) => u.id !== regSourceId));
        }
      }
      toast.success(`${regForm.nombre || regForm.celular} registrado en el directorio.`);
      setRegOpen(false);
    } catch (e) {
      setRegError((e as Error).message);
    } finally {
      setRegSaving(false);
    }
  }

  async function handleDeleteEquipoNoReg(id: string) {
    setDeletingEqId(id);
    try { await deleteEquipoNoRegistrado(id); setEquipoNoReg((prev) => prev.filter((u) => u.id !== id)); toast.message("Registro eliminado"); }
    catch { toast.error("No se pudo eliminar"); }
    finally { setDeletingEqId(null); }
  }

  const loadUsuarios = useCallback(async () => {
    try { setUsuariosApoyos(await fetchUsuariosDeApoyos(ownerLogin)); }
    catch { /* silencioso */ }
    finally { setUsuariosLoaded(true); }
  }, [ownerLogin]);

  /* ── Memos ── */
  const memberById = useMemo(() => {
    const m = new Map<number, NetworkMember>();
    for (const mem of members) m.set(mem.id, mem);
    return m;
  }, [members]);

  const teamMemberIds  = useMemo(() => teamEntries.map((e) => e.memberId), [teamEntries]);
  const teamIdSet      = useMemo(() => new Set(teamMemberIds), [teamMemberIds]);
  const teamMembers    = useMemo(() => teamMemberIds.map((id) => memberById.get(id)).filter(Boolean) as NetworkMember[], [teamMemberIds, memberById]);

  const availableToAdd = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !teamIdSet.has(m.id))
      .filter((m) => !q || m.nombre.toLowerCase().includes(q) || String(m.id).includes(q))
      .slice(0, 80);
  }, [members, teamIdSet, search]);

  const beneficiaryProject = useMemo(() => apoyos.find((p) => p.id === beneficiaryProjectId) ?? null, [apoyos, beneficiaryProjectId]);
  const beneficiaryIdSet   = useMemo(() => new Set(beneficiaryProject?.beneficiaryMemberIds ?? []), [beneficiaryProject]);

  const availableBeneficiaries = useMemo(() => {
    if (!beneficiaryProjectId) return [];
    const q = beneficiarySearch.trim().toLowerCase();
    return members
      .filter((m) => !beneficiaryIdSet.has(m.id))
      .filter((m) => !q || m.nombre.toLowerCase().includes(q) || String(m.id).includes(q))
      .slice(0, 80);
  }, [members, beneficiaryIdSet, beneficiarySearch, beneficiaryProjectId]);

  /* ── Helpers apoyo ── */
  function updateApoyo(id: string, fn: (p: TeamApoyo) => TeamApoyo) {
    let updated: TeamApoyo | undefined;
    setApoyos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = fn(p);
        updated = { ...next, beneficiaryMemberIds: [...new Set(next.beneficiaryMemberIds)] };
        return updated;
      }),
    );
    if (updated) upsertApoyo(ownerLogin, updated).catch(() => {});
  }

  function resolveName(memberId: number) { return memberById.get(memberId)?.nombre ?? `#${memberId}`; }

  /* ── Acciones equipo ── */
  const addToTeam = useCallback((id: number) => {
    if (teamIdSet.has(id)) return;
    const entry: AdminTeamEntry = { memberId: id, role: DEFAULT_ADMIN_TEAM_ROLE };
    setTeamEntries((prev) => [...prev, entry]);
    upsertTeamMember(ownerLogin, entry).catch(() => {});
    toast.success("Persona añadida al equipo");
    setAddOpen(false); setSearch("");
  }, [teamIdSet, ownerLogin]);

  const removeFromTeam = useCallback((id: number) => {
    setTeamEntries((prev) => prev.filter((x) => x.memberId !== id));
    deleteTeamMember(ownerLogin, id).catch(() => {});
    toast.message("Quitado del equipo");
  }, [ownerLogin]);

  const setMemberRole = useCallback((memberId: number, role: AdminTeamRole) => {
    setTeamEntries((prev) => prev.map((e) => e.memberId === memberId ? { ...e, role } : e));
    upsertTeamMember(ownerLogin, { memberId, role }).catch(() => {});
  }, [ownerLogin]);

  const setEquipoNoRegRole = useCallback((id: string, role: AdminTeamRole) => {
    setEquipoNoReg((prev) => prev.map((x) => (x.id === id ? { ...x, rol: role } : x)));
    updateEquipoNoRegistradoRol(id, role).catch(() => toast.error("No se pudo guardar el rol"));
  }, []);

  /* ── Acciones apoyo ── */
  const addApoyo = useCallback(() => {
    const name = newApoyoName.trim();
    if (!name) { toast.error("Escribe un nombre"); return; }
    const apoyo: TeamApoyo = { id: newId(), name, tasks: [], beneficiaryMemberIds: [] };
    setApoyos((prev) => [apoyo, ...prev]);
    upsertApoyo(ownerLogin, apoyo).catch(() => {});
    setNewApoyoName(""); setNewApoyoOpen(false);
    toast.success("Apoyo creado");
  }, [newApoyoName, ownerLogin]);

  const deleteApoyo = useCallback((id: string) => {
    setApoyos((prev) => prev.filter((p) => p.id !== id));
    deleteApoyoById(id).catch(() => {});
    toast.message("Apoyo eliminado");
  }, []);

  const addTask = useCallback((projectId: string) => {
    const draft = taskDrafts[projectId] ?? { title: "", memberId: "" };
    const title = draft.title.trim();
    const mid = parseInt(draft.memberId, 10);
    if (!title) { toast.error("Escribe el título"); return; }
    if (!Number.isFinite(mid) || !teamIdSet.has(mid)) { toast.error("Elige un miembro"); return; }
    const task: TeamTask = { id: newId(), title, memberId: mid, done: false, createdAt: new Date().toISOString() };
    updateApoyo(projectId, (p) => ({ ...p, tasks: [task, ...p.tasks] }));
    setTaskDrafts((d) => ({ ...d, [projectId]: { title: "", memberId: String(mid) } }));
    toast.success("Tarea asignada");
  }, [taskDrafts, teamIdSet]);

  const setTaskDone = useCallback((projectId: string, taskId: string, done: boolean) => {
    updateApoyo(projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, done } : t) }));
  }, []);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    updateApoyo(projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));
  }, []);

  const addBeneficiary = useCallback((projectId: string, memberId: number) => {
    updateApoyo(projectId, (p) => {
      if (p.beneficiaryMemberIds.includes(memberId)) return p;
      return { ...p, beneficiaryMemberIds: [...p.beneficiaryMemberIds, memberId] };
    });
    toast.success("Persona añadida al apoyo");
  }, []);

  const removeBeneficiary = useCallback((projectId: string, memberId: number) => {
    updateApoyo(projectId, (p) => ({ ...p, beneficiaryMemberIds: p.beneficiaryMemberIds.filter((id) => id !== memberId) }));
    toast.message("Quitada de este apoyo");
  }, []);

  /* ── Import Excel equipo ── */
  async function handleTeamFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeamImporting(true);
    try {
      const result = await importTeamFile(file, members);
      const existingIds = new Set(teamEntries.map((x) => x.memberId));
      const newEntries = result.matched
        .filter((r) => r.memberId !== undefined && !existingIds.has(r.memberId!))
        .map((r) => ({ memberId: r.memberId!, role: r.rol }));
      if (newEntries.length > 0) {
        setTeamEntries((prev) => [...prev, ...newEntries]);
        upsertManyTeamMembers(ownerLogin, newEntries).catch(() => {});
      }
      setTeamImportResult(result);
      if (result.matched.length > 0) toast.success(`${result.matched.length} personas añadidas.`);
      if (result.notFound.length > 0) {
        toast.warning(`${result.notFound.length} celulares no encontrados, guardados en "No registrados".`);
        loadEquipoNoReg(); // recargar tabla
      }
    } catch { toast.error("No se pudo leer el archivo."); }
    finally { setTeamImporting(false); if (teamFileRef.current) teamFileRef.current.value = ""; }
  }

  /* ── Import Excel apoyo ── */
  async function handleApoyoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const projectId = apoyoImportProjectId;
    if (!file || !projectId) return;
    setApoyoImporting(true);
    const apoyoName = apoyos.find((p) => p.id === projectId)?.name ?? "Apoyo";
    try {
      const result = await importApoyoFile(file, members, {
        apoyoNombre: apoyoName,
        apoyoId: projectId,
        ownerLogin,
      });
      let addedCount = 0;
      updateApoyo(projectId, (p) => {
        const existing = new Set(p.beneficiaryMemberIds);
        const newIds = [
          ...new Set(result.matched.map((r) => r.memberId).filter((id): id is number => id != null)),
        ].filter((id) => !existing.has(id));
        addedCount = newIds.length;
        return { ...p, beneficiaryMemberIds: [...p.beneficiaryMemberIds, ...newIds] };
      });
      if (addedCount > 0) {
        toast.success(`${addedCount} persona${addedCount !== 1 ? "s" : ""} añadida${addedCount !== 1 ? "s" : ""} al apoyo desde el directorio.`);
        setBeneficiaryPageByApoyo((prev) => ({ ...prev, [projectId]: 1 }));
      }
      if (result.notFound.length > 0 || result.noRegInserted > 0 || result.noRegSkippedExisting > 0 || result.noRegSkippedDupInFile > 0) {
        const parts: string[] = [];
        if (result.noRegInserted > 0) parts.push(`${result.noRegInserted} nuevos guardados en “No registrados”`);
        if (result.noRegSkippedExisting > 0) parts.push(`${result.noRegSkippedExisting} ya estaban en la lista`);
        if (result.noRegSkippedDupInFile > 0) parts.push(`${result.noRegSkippedDupInFile} filas repetidas en el Excel omitidas`);
        if (parts.length > 0) toast.message(parts.join(" · "));
        await loadUsuarios();
        setNoRegPageByApoyo((prev) => ({ ...prev, [projectId]: 1 }));
      }
    } catch { toast.error("No se pudo leer el archivo."); }
    finally {
      setApoyoImporting(false);
      setApoyoImportProjectId(null);
      if (apoyoFileRef.current) apoyoFileRef.current.value = "";
    }
  }

  async function handleDeleteUsuario(id: string) {
    setDeletingUid(id);
    try { await deleteUsuarioDeApoyo(id); setUsuariosApoyos((prev) => prev.filter((u) => u.id !== id)); toast.message("Registro eliminado"); }
    catch { toast.error("No se pudo eliminar"); }
    finally { setDeletingUid(null); }
  }

  async function handleGeocodeNoReg(u: UsuarioDeApoyo) {
    if (!u.id) return;
    setGeocodingNoRegId(u.id);
    try {
      const coords = await geocodeUsuarioDeApoyo(u);
      if (!coords) {
        toast.error("No se encontró la ubicación. Revisa calle, colonia y municipio.");
        return;
      }
      await updateApoyoNoRegCoordinates(u.id, coords.lat, coords.lng);
      setUsuariosApoyos((prev) =>
        prev.map((row) => (row.id === u.id ? { ...row, lat: coords.lat, lng: coords.lng } : row)),
      );
      toast.success("Coordenadas guardadas. Aparecerán en Mapa.");
    } catch {
      toast.error("No se pudo obtener la ubicación.");
    } finally {
      setGeocodingNoRegId(null);
    }
  }

  const isLoading = dataLoading || membersLoading;

  return (
    <DashboardShell title="Brigadas">
      <Tabs defaultValue="equipo" className="flex h-full min-h-0 w-full flex-col gap-3">
            <div className="shrink-0 rounded-lg border border-border/60 bg-muted/30 p-1.5 shadow-sm">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 shadow-none">
                <TabsTrigger value="equipo" className="flex h-10 w-full items-center justify-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />Mi equipo
                </TabsTrigger>
                <TabsTrigger value="apoyos" onClick={() => { if (!usuariosLoaded) loadUsuarios(); }}
                  className="flex h-10 w-full items-center justify-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-muted-foreground" />Apoyos
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Tab: Mi Equipo ── */}
            <TabsContent value="equipo" className="mt-0 flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 data-[state=inactive]:hidden">
              <p className="text-sm text-muted-foreground">Arma tu equipo administrativo desde el directorio: roles, celular y quién puede recibir tareas dentro de los apoyos.</p>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Personas en el equipo</CardTitle>
                  <CardDescription>Solo quienes añadas aquí podrán recibir tareas en un apoyo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading && <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
                  {isError && <p className="text-sm text-destructive">No se pudo cargar el directorio.</p>}
                  {!isLoading && teamEntries.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no hay nadie en el equipo.</p>
                  )}
                  {!isLoading && (teamEntries.length > 0 || equipoNoReg.length > 0) && (
                    <div className="space-y-2">
                      {ADMIN_TEAM_ROLES.filter((role) =>
                        teamEntries.some((e) => e.role === role) ||
                        equipoNoReg.some((u) => normalizedUnregRole(u.rol) === role)
                      ).map((role) => {
                        const regGroup   = teamEntries.filter((e) => e.role === role);
                        const unregGroup = equipoNoReg.filter((u) => normalizedUnregRole(u.rol) === role);
                        return (
                          <Collapsible key={role} defaultOpen={false} className="rounded-lg border bg-card">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg select-none">
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{ROLE_LABEL[role]}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                    {regGroup.length} reg.
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    <UserX className="h-3 w-3 shrink-0" />
                                    {unregGroup.length} no reg.
                                  </span>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t px-3 py-2 space-y-0 divide-y divide-border/60">
                                {/* Registrados */}
                                {regGroup.map((entry) => {
                                  const m = memberById.get(entry.memberId);
                                  return (
                                    <div key={entry.memberId} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarImage src={m?.selfie_url ?? undefined} alt="" />
                                        <AvatarFallback className="text-[10px]">{m ? memberInitials(m) : "?"}</AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 min-w-0 text-sm truncate font-medium">{m?.nombre ?? `ID ${entry.memberId}`}</span>
                                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{m ? formatCelular(m.telefono) : "—"}</span>
                                      <Select value={entry.role} onValueChange={(v) => setMemberRole(entry.memberId, v as AdminTeamRole)}>
                                        <SelectTrigger className={cn("h-6 w-24 shrink-0 border font-medium text-[11px] px-2 py-0", ROLE_TRIGGER[entry.role])}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ADMIN_TEAM_ROLES.map((r) => (
                                            <SelectItem key={r} value={r} className={cn("text-xs", ROLE_ITEM[r])}>{ROLE_LABEL[r]}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFromTeam(entry.memberId)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                                {/* No registrados mezclados en el mismo grupo */}
                                {unregGroup.map((u) => {
                                  const ur = normalizedUnregRole(u.rol);
                                  return (
                                    <div key={u.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0 bg-amber-50/60 dark:bg-amber-950/20 -mx-3 px-3 rounded-none">
                                      <Avatar className="h-6 w-6 shrink-0 opacity-50">
                                        <AvatarFallback className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                                          {(u.nombre ?? "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 min-w-0 text-sm truncate font-medium text-foreground/70">{u.nombre || "—"}</span>
                                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{u.celular}</span>
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2 py-0.5 text-[10px] font-medium shrink-0 whitespace-nowrap" title="Aún no está en el directorio">
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                        No registrado
                                      </span>
                                      <Select
                                        value={ur}
                                        disabled={!u.id}
                                        onValueChange={(v) => u.id && setEquipoNoRegRole(u.id, v as AdminTeamRole)}
                                      >
                                        <SelectTrigger className={cn("h-6 w-24 shrink-0 border font-medium text-[11px] px-2 py-0", ROLE_TRIGGER[ur])}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ADMIN_TEAM_ROLES.map((r) => (
                                            <SelectItem key={r} value={r} className={cn("text-xs", ROLE_ITEM[r])}>{ROLE_LABEL[r]}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" disabled={deletingEqId === u.id} onClick={() => u.id && handleDeleteEquipoNoReg(u.id)}>
                                        {deletingEqId === u.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setAddOpen(true)} disabled={isLoading}>
                      <UserPlus className="h-4 w-4 mr-2" />Añadir del directorio
                    </Button>
                    <Button type="button" variant="outline" onClick={downloadTeamTemplate}>
                      <Download className="h-4 w-4 mr-2" />Bajar plantilla
                    </Button>
                    <Button type="button" variant="outline" disabled={isLoading || teamImporting} onClick={() => teamFileRef.current?.click()}>
                      {teamImporting ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Upload className="h-4 w-4 mr-2" />}
                      Importar Excel
                    </Button>
                    <input ref={teamFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTeamFileChange} />
                  </div>
                  {teamImportResult && (
                    <ImportResultPanel
                      result={teamImportResult}
                      onClose={() => setTeamImportResult(null)}
                      onRegister={(nombre, celular) => {
                        const parts = nombre.trim().split(/\s+/);
                        openRegDialog({ nombre: parts[0] ?? "", apellidos: parts.slice(1).join(" "), celular });
                      }}
                    />
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* ── Tab: Apoyos ── */}
            <TabsContent value="apoyos" className="mt-0 flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 data-[state=inactive]:hidden">
              <p className="text-sm text-muted-foreground">Crea apoyos por nombre y agrega personas del directorio. Asigna tareas al equipo en cada apoyo.</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Tus apoyos</h2>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewApoyoOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Nuevo apoyo
                </Button>
              </div>

              {isLoading && <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}

              {!isLoading && apoyos.length === 0 && (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Crea un apoyo para empezar.</CardContent></Card>
              )}

              {!isLoading && apoyos.length > 0 && (
                <div className="space-y-2">
                  {apoyos.map((p) => {
                    const benIds = [...new Set(p.beneficiaryMemberIds)];
                    const noReg = usuariosApoyos.filter((u) => u.apoyo_id === p.id);
                    const totalBenPages = Math.max(1, Math.ceil(benIds.length / NO_REG_PAGE_SIZE));
                    const benPage = Math.min(beneficiaryPageByApoyo[p.id] ?? 1, totalBenPages);
                    const benOffset = (benPage - 1) * NO_REG_PAGE_SIZE;
                    const benPageRows = benIds.slice(benOffset, benOffset + NO_REG_PAGE_SIZE);
                    const totalNoRegPages = Math.max(1, Math.ceil(noReg.length / NO_REG_PAGE_SIZE));
                    const noRegPage = Math.min(noRegPageByApoyo[p.id] ?? 1, totalNoRegPages);
                    const noRegOffset = (noRegPage - 1) * NO_REG_PAGE_SIZE;
                    const noRegPageRows = noReg.slice(noRegOffset, noRegOffset + NO_REG_PAGE_SIZE);
                    return (
                      <Collapsible key={p.id} className="rounded-lg border bg-card">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg select-none">
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{p.name}</p>
                            </div>
                            {/* Conteos siempre visibles */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                {benIds.length} reg.
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <UserX className="h-3 w-3 shrink-0" />
                                {noReg.length} no reg.
                              </span>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteApoyo(p.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t px-3 py-3 space-y-6">

                            {/* Conteos */}
                            {(benIds.length > 0 || noReg.length > 0) && (
                              <div className="flex flex-wrap gap-3">
                                {benIds.length > 0 && (
                                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    {benIds.length} registrado{benIds.length !== 1 ? "s" : ""}
                                  </div>
                                )}
                                {noReg.length > 0 && (
                                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    <UserX className="h-3.5 w-3.5 shrink-0" />
                                    {noReg.length} no registrado{noReg.length !== 1 ? "s" : ""}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Personas registradas */}
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <HeartHandshake className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                    <span className="text-sm font-medium">Personas que reciben apoyo</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground max-w-xl">Personas del directorio incluidas en este apoyo.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" size="sm" variant="secondary" disabled={membersLoading || isError} onClick={() => { setBeneficiaryProjectId(p.id); setBeneficiarySearch(""); }}>
                                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />Añadir del directorio
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" onClick={downloadApoyoTemplate}>
                                    <Download className="h-3.5 w-3.5 mr-1.5" />Plantilla
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" disabled={membersLoading || apoyoImporting} onClick={() => { setApoyoImportProjectId(p.id); apoyoFileRef.current?.click(); }}>
                                    {apoyoImporting && apoyoImportProjectId === p.id ? <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                                    Importar Excel
                                  </Button>
                                  {benIds.length > 0 && (
                                    <Button type="button" size="sm" variant="outline" onClick={() => {
                                      const bens = benIds.map((id) => memberById.get(id)).filter(Boolean) as NetworkMember[];
                                      exportApoyoBeneficiaries(p.name, bens);
                                    }}>
                                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Exportar lista
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {benIds.length === 0
                                ? <p className="text-sm text-muted-foreground">Nadie añadido aún.</p>
                                : (
                                  <>
                                    <div className="rounded-md border border-amber-200 dark:border-amber-800 overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Teléfono</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Colonia</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-10"></th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                          {benPageRows.map((bid) => {
                                            const bm = memberById.get(bid);
                                            return (
                                              <tr key={bid} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-3 py-2 font-medium truncate max-w-[160px]">{bm?.nombre ?? `ID ${bid}`}</td>
                                                <td className="px-3 py-2 tabular-nums text-muted-foreground">{bm ? formatCelular(bm.telefono) : "—"}</td>
                                                <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{bm?.colonia?.trim() || "—"}</td>
                                                <td className="px-3 py-2 text-right">
                                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeBeneficiary(p.id, bid)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    {benIds.length > NO_REG_PAGE_SIZE && (
                                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-md border border-t-0 border-amber-200 dark:border-amber-800 px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20">
                                        <span className="text-[11px] text-muted-foreground">
                                          Página {benPage} de {totalBenPages} · {benIds.length} en total
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2"
                                            disabled={benPage <= 1}
                                            onClick={() => setBeneficiaryPageByApoyo((prev) => ({ ...prev, [p.id]: benPage - 1 }))}
                                          >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2"
                                            disabled={benPage >= totalBenPages}
                                            onClick={() => setBeneficiaryPageByApoyo((prev) => ({ ...prev, [p.id]: benPage + 1 }))}
                                          >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )
                              }
                            </div>

                            {/* No registrados */}
                            {noReg.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <UserX className="h-4 w-4 shrink-0 text-amber-500" />
                                  <span className="text-sm font-medium">No registrados</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">{noReg.length}</Badge>
                                </div>
                                <div className="rounded-md border border-amber-200 dark:border-amber-800 overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Teléfono</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Colonia</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[9rem] hidden md:table-cell">Coordenadas</th>
                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[4.5rem]"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {noRegPageRows.map((u) => (
                                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                          <td className="px-3 py-2 font-medium truncate max-w-[160px]">{u.nombre_completo || "—"}</td>
                                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{u.telefono || "—"}</td>
                                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{u.colonia || "—"}</td>
                                          <td className="px-3 py-2 align-top hidden md:table-cell">
                                            <div className="flex flex-col gap-1 min-w-0">
                                              <span className="tabular-nums text-[10px] text-muted-foreground break-all" title={fmtLatLng(u.lat, u.lng) !== "—" ? `${u.lat}, ${u.lng}` : undefined}>
                                                {fmtLatLng(u.lat, u.lng)}
                                              </span>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-fit gap-1 px-1.5 text-[10px]"
                                                disabled={geocodingNoRegId === u.id}
                                                title="Obtener coordenadas desde el domicilio (OpenStreetMap)"
                                                onClick={() => handleGeocodeNoReg(u)}
                                              >
                                                {geocodingNoRegId === u.id ? (
                                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                                ) : (
                                                  <MapPin className="h-3 w-3 shrink-0" />
                                                )}
                                                Ubicar
                                              </Button>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-0.5">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 md:hidden text-muted-foreground hover:text-foreground"
                                                disabled={geocodingNoRegId === u.id}
                                                title="Obtener coordenadas"
                                                onClick={() => handleGeocodeNoReg(u)}
                                              >
                                                {geocodingNoRegId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                                              </Button>
                                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" disabled={deletingUid === u.id} onClick={() => u.id && handleDeleteUsuario(u.id)}>
                                                {deletingUid === u.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5" />}
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {noReg.length > NO_REG_PAGE_SIZE && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-md border border-t-0 border-amber-200 dark:border-amber-800 px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20">
                                    <span className="text-[11px] text-muted-foreground">
                                      Página {noRegPage} de {totalNoRegPages} · {noReg.length} en total
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2"
                                        disabled={noRegPage <= 1}
                                        onClick={() => setNoRegPageByApoyo((prev) => ({ ...prev, [p.id]: noRegPage - 1 }))}
                                      >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2"
                                        disabled={noRegPage >= totalNoRegPages}
                                        onClick={() => setNoRegPageByApoyo((prev) => ({ ...prev, [p.id]: noRegPage + 1 }))}
                                      >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <Separator />

                            {/* Tareas */}
                            <div className="space-y-4">
                              {teamMembers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Añade personas al equipo para asignar tareas.</p>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                  <div className="flex-1 space-y-1.5">
                                    <Label htmlFor={`task-${p.id}`}>Nueva tarea</Label>
                                    <Input id={`task-${p.id}`} placeholder="Descripción breve" value={taskDrafts[p.id]?.title ?? ""} onChange={(e) => setTaskDrafts((d) => ({ ...d, [p.id]: { title: e.target.value, memberId: d[p.id]?.memberId ?? "" } }))} />
                                  </div>
                                  <div className="w-full sm:w-48 space-y-1.5">
                                    <Label>Asignar a</Label>
                                    <Select value={taskDrafts[p.id]?.memberId ?? ""} onValueChange={(v) => setTaskDrafts((d) => ({ ...d, [p.id]: { title: d[p.id]?.title ?? "", memberId: v } }))}>
                                      <SelectTrigger><SelectValue placeholder="Miembro" /></SelectTrigger>
                                      <SelectContent>
                                        {teamMembers.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button type="button" onClick={() => addTask(p.id)}>Asignar</Button>
                                </div>
                              )}
                              {p.tasks.length > 0 && (
                                <ul className="space-y-2">
                                  {p.tasks.map((t) => (
                                    <li key={t.id} className={cn("flex flex-wrap items-start gap-3 rounded-md border p-2 text-sm", t.done && "opacity-70 bg-muted/40")}>
                                      <Checkbox checked={t.done} onCheckedChange={(c) => setTaskDone(p.id, t.id, c === true)} className="mt-0.5" />
                                      <div className="min-w-0 flex-1">
                                        <p className={cn(t.done && "line-through")}>{t.title}</p>
                                        <p className="text-xs text-muted-foreground">{resolveName(t.memberId)}</p>
                                      </div>
                                      <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => deleteTask(p.id, t.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}

              <input ref={apoyoFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleApoyoFileChange} />
            </TabsContent>
          </Tabs>

      {/* ── Diálogo Añadir al Equipo ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Añadir del directorio</DialogTitle>
            <DialogDescription>Busca por nombre o ID. Solo verás personas que aún no están en el equipo.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border divide-y">
            {availableToAdd.length === 0
              ? <p className="p-4 text-sm text-muted-foreground text-center">Sin coincidencias.</p>
              : availableToAdd.map((m) => (
                <button key={m.id} type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors" onClick={() => addToTeam(m.id)}>
                  <span className="font-medium text-sm truncate">{m.nombre}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatCelular(m.telefono)}</span>
                </button>
              ))
            }
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo Añadir Beneficiario ── */}
      <Dialog open={beneficiaryProjectId !== null} onOpenChange={(open) => { if (!open) { setBeneficiaryProjectId(null); setBeneficiarySearch(""); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Añadir personas al apoyo</DialogTitle>
            <DialogDescription>{beneficiaryProject ? `Busca en tu directorio y añade a quienes participan en «${beneficiaryProject.name}».` : ""}</DialogDescription>
          </DialogHeader>
          <Input placeholder="Buscar…" value={beneficiarySearch} onChange={(e) => setBeneficiarySearch(e.target.value)} autoFocus />
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border divide-y">
            {availableBeneficiaries.length === 0
              ? <p className="p-4 text-sm text-muted-foreground text-center">Sin coincidencias.</p>
              : availableBeneficiaries.map((m) => (
                <button key={m.id} type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors" onClick={() => { if (beneficiaryProjectId) addBeneficiary(beneficiaryProjectId, m.id); }}>
                  <span className="font-medium text-sm truncate">{m.nombre}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatCelular(m.telefono)}</span>
                </button>
              ))
            }
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => { setBeneficiaryProjectId(null); setBeneficiarySearch(""); }}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo Registrar en directorio ── */}
      <RegDialog open={regOpen} onOpenChange={(v) => { if (!regSaving) setRegOpen(v); }}>
        <RegDialogContent className="max-w-md">
          <RegDialogHeader>
            <RegDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              Registrar en el directorio
            </RegDialogTitle>
          </RegDialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-nombre">Nombre</Label>
                <Input id="reg-nombre" value={regForm.nombre} onChange={(e) => setRegForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre(s)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-apellidos">Apellidos</Label>
                <Input id="reg-apellidos" value={regForm.apellidos} onChange={(e) => setRegForm((f) => ({ ...f, apellidos: e.target.value }))} placeholder="Apellidos" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-celular">Celular <span className="text-destructive">*</span></Label>
              <Input id="reg-celular" value={regForm.celular} onChange={(e) => setRegForm((f) => ({ ...f, celular: e.target.value }))} placeholder="10 dígitos" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-municipio">Municipio</Label>
                <Input id="reg-municipio" value={regForm.municipio ?? ""} onChange={(e) => setRegForm((f) => ({ ...f, municipio: e.target.value }))} placeholder="Municipio" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-cp">Código Postal</Label>
                <Input id="reg-cp" value={regForm.cp ?? ""} onChange={(e) => setRegForm((f) => ({ ...f, cp: e.target.value }))} placeholder="CP" />
              </div>
            </div>
            {regError && <p className="text-sm text-destructive">{regError}</p>}
          </div>
          <RegDialogFooter>
            <Button variant="outline" onClick={() => setRegOpen(false)} disabled={regSaving}>Cancelar</Button>
            <Button onClick={handleRegSave} disabled={regSaving}>
              {regSaving && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Registrar
            </Button>
          </RegDialogFooter>
        </RegDialogContent>
      </RegDialog>

      {/* ── Diálogo Nuevo Apoyo ── */}
      <Dialog open={newApoyoOpen} onOpenChange={setNewApoyoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo apoyo</DialogTitle>
            <DialogDescription>Después podrás agregar personas y tareas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="apoyo-name">Nombre</Label>
            <Input id="apoyo-name" value={newApoyoName} onChange={(e) => setNewApoyoName(e.target.value)} placeholder="Nombre del apoyo" onKeyDown={(e) => { if (e.key === "Enter") addApoyo(); }} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewApoyoOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={addApoyo}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
