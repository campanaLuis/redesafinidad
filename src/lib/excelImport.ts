import * as XLSX from "xlsx";
import type { NetworkMember } from "@/types/network";
import type { AdminTeamRole } from "@/lib/teamWorkspaceStorage";
import { ADMIN_TEAM_ROLES } from "@/lib/teamWorkspaceStorage";
import { getJson, sendJson } from "@/lib/apiClient";
import { geocodeEquipoNoRegistrado, geocodeUsuarioDeApoyo } from "@/lib/geocoding";

/* ── Normalización de teléfono ───────────────────────────────────── */
export function normPhone(raw: number | string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw).replace(/[\s\-().+]/g, "");
  if (s.startsWith("52") && s.length === 12) s = s.slice(2);
  return s;
}

/* ── Columnas del formato oficial de Apoyos ──────────────────────── */
export const APOYO_COLUMNS = [
  "Curp",
  "Nombre Completo",
  "Programa",
  "Municipio",
  "Localidad",
  "Colonia",
  "Calle",
  "Número Interior",
  "Código Postal",
  "Número Exterior",
  "Teléfono",
  "Número de Sección",
] as const;

/* ── Tipo fila: brigadas.apoyos_no_registrados (API) ─────────────── */
export interface UsuarioDeApoyo {
  id?: string;
  /** Dueño de la brigada (login en la app). */
  owner_login: string;
  /** Id del apoyo en team_apoyos. */
  apoyo_id: string;
  apoyo_nombre: string;
  curp?: string;
  nombre_completo?: string;
  programa?: string;
  municipio?: string;
  localidad?: string;
  colonia?: string;
  calle?: string;
  numero_interior?: string;
  codigo_postal?: string;
  numero_exterior?: string;
  telefono?: string;
  numero_de_seccion?: string;
  importado_en?: string;
  /** WGS84, rellenable por geocodificación para el mapa. */
  lat?: number | null;
  lng?: number | null;
}

/* ── Tipos de resultado ──────────────────────────────────────────── */
export interface TeamImportRow {
  nombre: string;
  celular: string;
  rol: AdminTeamRole;
  memberId?: number;
}

export interface ImportResult {
  matched: TeamImportRow[];
  notFound: TeamImportRow[];
}

/* ── Parser de archivo ───────────────────────────────────────────── */
function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

/* ── Plantilla Mi Equipo ─────────────────────────────────────────── */
export function downloadTeamTemplate() {
  const headers = ["nombre", "celular", "rol"];
  const example = [
    { nombre: "Ejemplo Persona", celular: "4421234567", rol: "vocal" },
    { nombre: "Otra Persona", celular: "4429876543", rol: "enlace" },
    { nombre: "NOTA: Roles válidos:", celular: ADMIN_TEAM_ROLES.join(" | "), rol: "" },
  ];
  const ws = XLSX.utils.json_to_sheet(example, { header: headers });
  ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Equipo");
  XLSX.writeFile(wb, "plantilla-mi-equipo.xlsx");
}

/* ── Plantilla Apoyo ─────────────────────────────────────────────── */
export function downloadApoyoTemplate() {
  const example = [{
    "Curp": "XEXX010101HNEXXXA4",
    "Nombre Completo": "Ejemplo Persona",
    "Programa": "",
    "Municipio": "Querétaro",
    "Localidad": "",
    "Colonia": "Centro",
    "Calle": "Av. Universidad",
    "Número Interior": "",
    "Código Postal": "76000",
    "Número Exterior": "123",
    "Teléfono": "4421234567",
    "Número de Sección": "",
  }];
  const ws = XLSX.utils.json_to_sheet(example, { header: [...APOYO_COLUMNS] });
  ws["!cols"] = APOYO_COLUMNS.map((c) => ({ wch: Math.max(c.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Apoyo");
  XLSX.writeFile(wb, "plantilla-apoyo.xlsx");
}

/* ── Exportar beneficiarios existentes ───────────────────────────── */
export function exportApoyoBeneficiaries(apoyoName: string, beneficiaries: NetworkMember[]) {
  const rows = beneficiaries.map((m) => ({
    "Curp": "",
    "Nombre Completo": m.nombre ?? "",
    "Programa": "",
    "Municipio": "",
    "Localidad": "",
    "Colonia": m.colonia ?? "",
    "Calle": "",
    "Número Interior": "",
    "Código Postal": m.codigopostal != null ? String(m.codigopostal) : "",
    "Número Exterior": "",
    "Teléfono": m.telefono != null ? String(m.telefono) : "",
    "Número de Sección": "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...APOYO_COLUMNS] });
  ws["!cols"] = APOYO_COLUMNS.map((c) => ({ wch: Math.max(c.length + 2, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Apoyo");
  XLSX.writeFile(wb, `${apoyoName.replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "apoyo"}.xlsx`);
}

/* ── Equipo no registrados ───────────────────────────────────────── */
export interface EquipoNoRegistrado {
  id?: string;
  nombre?: string;
  celular: string;
  rol?: string;
  municipio?: string;
  localidad?: string;
  colonia?: string;
  calle?: string;
  numero_exterior?: string;
  codigo_postal?: string;
  importado_en?: string;
  lat?: number | null;
  lng?: number | null;
}

export async function fetchEquipoNoRegistrados(): Promise<EquipoNoRegistrado[]> {
  return getJson<EquipoNoRegistrado[]>("/api/brigadas/equipo-no-reg");
}

export async function deleteEquipoNoRegistrado(id: string): Promise<void> {
  await sendJson("/api/brigadas/equipo-no-reg/" + encodeURIComponent(id), "DELETE");
}

export async function updateEquipoNoRegistradoRol(id: string, rol: AdminTeamRole): Promise<void> {
  await sendJson("/api/brigadas/equipo-no-reg/" + encodeURIComponent(id) + "/rol", "PATCH", { rol });
}

/* ── Importar equipo ─────────────────────────────────────────────── */
export async function importTeamFile(file: File, members: NetworkMember[]): Promise<ImportResult> {
  const rows = await parseFile(file);
  const byPhone = new Map<string, NetworkMember>();
  for (const m of members) { const k = normPhone(m.telefono); if (k) byPhone.set(k, m); }
  const matched: TeamImportRow[] = [];
  const notFound: TeamImportRow[] = [];
  const pendingRows: EquipoNoRegistrado[] = [];

  for (const row of rows) {
    const celularRaw = String(row["celular"] ?? row["Celular"] ?? "").trim();
    const nombreRaw = String(row["nombre"] ?? row["Nombre"] ?? "").trim();
    const rolRaw = String(row["rol"] ?? row["Rol"] ?? "").trim().toLowerCase() as AdminTeamRole;
    if (!celularRaw || celularRaw.toLowerCase().startsWith("nota")) continue;
    const rol: AdminTeamRole = ADMIN_TEAM_ROLES.includes(rolRaw) ? rolRaw : "vocal";
    const entry: TeamImportRow = { nombre: nombreRaw, celular: celularRaw, rol };
    const found = byPhone.get(normPhone(celularRaw));
    if (found) {
      matched.push({ ...entry, memberId: found.id });
    } else {
      notFound.push(entry);
      pendingRows.push({
        nombre: nombreRaw || undefined,
        celular: celularRaw,
        rol,
        municipio: String(row["Municipio"] ?? row["municipio"] ?? "").trim() || undefined,
        localidad: String(row["Localidad"] ?? row["localidad"] ?? "").trim() || undefined,
        colonia: String(row["Colonia"] ?? row["colonia"] ?? "").trim() || undefined,
        calle: String(row["Calle"] ?? row["calle"] ?? "").trim() || undefined,
        numero_exterior: String(row["Número Exterior"] ?? row["NUMERO EXTERIOR"] ?? row["numero_exterior"] ?? "").trim() || undefined,
        codigo_postal: String(row["Código Postal"] ?? row["CODIGO POSTAL"] ?? row["codigo_postal"] ?? "").trim() || undefined,
      });
    }
  }

  if (pendingRows.length > 0) {
    void (async () => {
      try {
        const res = await fetch("/api/brigadas/equipo-no-reg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingRows),
        });
        if (!res.ok) {
          console.error("[importTeamFile]", await res.text());
          return;
        }
        const inserted = (await res.json()) as EquipoNoRegistrado[];
        for (const row of inserted) {
          if (row.lat != null && row.lng != null) continue;
          const coords = await geocodeEquipoNoRegistrado(row);
          if (!coords || !row.id) continue;
          await updateEquipoNoRegistradoCoordinates(row.id, coords.lat, coords.lng).catch((geoError) => {
            console.error("[importTeamFile geocode]", geoError instanceof Error ? geoError.message : String(geoError));
          });
        }
      } catch (e) {
        console.error("[importTeamFile]", e instanceof Error ? e.message : String(e));
      }
    })();
  }

  return { matched, notFound };
}

/** Resultado de importar Excel en un apoyo (incluye conteos para toasts). */
export interface ApoyoImportResult extends ImportResult {
  /** Filas nuevas insertadas en `apoyos_no_registrados`. */
  noRegInserted: number;
  /** Ya existían en el servidor para este apoyo (mismo teléfono normalizado). */
  noRegSkippedExisting: number;
  /** Filas repetidas en el Excel (mismo teléfono). */
  noRegSkippedDupInFile: number;
}

/* ── Importar apoyo ──────────────────────────────────────────────── */
export async function importApoyoFile(
  file: File,
  members: NetworkMember[],
  ctx: { apoyoNombre: string; apoyoId: string; ownerLogin: string },
): Promise<ApoyoImportResult> {
  const rows = await parseFile(file);
  const byPhone = new Map<string, NetworkMember>();
  for (const m of members) { const k = normPhone(m.telefono); if (k) byPhone.set(k, m); }
  const matched: TeamImportRow[] = [];
  const notFound: TeamImportRow[] = [];
  const pendingRows: Omit<UsuarioDeApoyo, "id" | "importado_en">[] = [];
  const seenInFile = new Set<string>();
  let noRegSkippedDupInFile = 0;

  for (const row of rows) {
    const celularRaw = String(
      row["Teléfono"] ?? row["Telefono"] ?? row["TELEFONO"] ?? row["celular"] ?? row["Celular"] ?? "",
    ).trim();
    const nombreRaw = String(
      row["Nombre Completo"] ?? row["NOMBRE COMPLETO"] ?? row["nombre"] ?? row["Nombre"] ?? "",
    ).trim();
    if (!celularRaw || celularRaw.toLowerCase().startsWith("nota")) continue;
    const nk = normPhone(celularRaw);
    if (!nk) continue;
    if (seenInFile.has(nk)) {
      noRegSkippedDupInFile++;
      continue;
    }
    const entry: TeamImportRow = { nombre: nombreRaw, celular: celularRaw, rol: "vocal" };
    const found = byPhone.get(nk);
    if (found) {
      matched.push({ ...entry, memberId: found.id });
    } else {
      seenInFile.add(nk);
      notFound.push(entry);
      pendingRows.push({
        owner_login: ctx.ownerLogin,
        apoyo_id: ctx.apoyoId,
        apoyo_nombre: ctx.apoyoNombre,
        curp: String(row["Curp"] ?? row["CURP"] ?? "").trim() || undefined,
        nombre_completo: nombreRaw || undefined,
        programa: String(row["Programa"] ?? row["PROGRAMA"] ?? "").trim() || undefined,
        municipio: String(row["Municipio"] ?? row["MUNICIPIO"] ?? "").trim() || undefined,
        localidad: String(row["Localidad"] ?? row["LOCALIDAD"] ?? "").trim() || undefined,
        colonia: String(row["Colonia"] ?? row["COLONIA"] ?? "").trim() || undefined,
        calle: String(row["Calle"] ?? row["CALLE"] ?? "").trim() || undefined,
        numero_interior: String(row["Número Interior"] ?? row["NUMERO INTERIOR"] ?? "").trim() || undefined,
        codigo_postal: String(row["Código Postal"] ?? row["CODIGO POSTAL"] ?? "").trim() || undefined,
        numero_exterior: String(row["Número Exterior"] ?? row["NUMERO EXTERIOR"] ?? "").trim() || undefined,
        telefono: celularRaw,
        numero_de_seccion: String(row["Número de Sección"] ?? row["NUMERO DE SECCION"] ?? "").trim() || undefined,
      });
    }
  }

  let noRegInserted = 0;
  let noRegSkippedExisting = 0;

  if (pendingRows.length > 0) {
    const existingList = await getJson<string[]>(
      "/api/brigadas/apoyos-no-reg-telefonos?" +
        new URLSearchParams({ owner_login: ctx.ownerLogin, apoyo_id: ctx.apoyoId }),
    );
    const existingNorm = new Set(
      (existingList ?? []).map((t) => normPhone(t)).filter(Boolean),
    );

    const toInsert = pendingRows.filter((r) => {
      const n = normPhone(r.telefono);
      if (existingNorm.has(n)) {
        noRegSkippedExisting++;
        return false;
      }
      existingNorm.add(n);
      return true;
    });

    if (toInsert.length > 0) {
      try {
        const res = await fetch("/api/brigadas/apoyos-no-reg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toInsert),
        });
        if (!res.ok) {
          console.error("[importApoyoFile]", await res.text());
        } else {
          const data = (await res.json()) as UsuarioDeApoyo[];
          noRegInserted = data?.length ?? toInsert.length;
          const inserted = data ?? [];
          void (async () => {
            for (const row of inserted) {
              if (row.lat != null && row.lng != null) continue;
              const coords = await geocodeUsuarioDeApoyo(row);
              if (!coords || !row.id) continue;
              await updateApoyoNoRegCoordinates(row.id, coords.lat, coords.lng).catch((geoError) => {
                console.error("[importApoyoFile geocode]", geoError instanceof Error ? geoError.message : String(geoError));
              });
            }
          })();
        }
      } catch (e) {
        console.error("[importApoyoFile]", e instanceof Error ? e.message : String(e));
      }
    }
  }

  return {
    matched,
    notFound,
    noRegInserted,
    noRegSkippedExisting,
    noRegSkippedDupInFile,
  };
}

/* ── No registrados por apoyo (tabla apoyos_no_registrados) ──────── */
export async function fetchUsuariosDeApoyos(ownerLogin: string): Promise<UsuarioDeApoyo[]> {
  return getJson<UsuarioDeApoyo[]>(
    "/api/brigadas/apoyos-no-reg?owner_login=" + encodeURIComponent(ownerLogin),
  );
}

export async function deleteUsuarioDeApoyo(id: string): Promise<void> {
  await sendJson("/api/brigadas/apoyos-no-reg/" + encodeURIComponent(id), "DELETE");
}

export async function updateApoyoNoRegCoordinates(id: string, lat: number, lng: number): Promise<void> {
  await sendJson(
    "/api/brigadas/apoyos-no-reg/" + encodeURIComponent(id) + "/coords",
    "PATCH",
    { lat, lng },
  );
}

export async function updateEquipoNoRegistradoCoordinates(id: string, lat: number, lng: number): Promise<void> {
  await sendJson(
    "/api/brigadas/equipo-no-reg/" + encodeURIComponent(id) + "/coords",
    "PATCH",
    { lat, lng },
  );
}

/* ── Registro en directorio principal ───────────────────────────── */
export interface DirectoryRegistration {
  nombre: string;
  apellidos: string;
  celular: string;
  municipio?: string;
  cp?: string;
}

export async function registerInDirectory(reg: DirectoryRegistration): Promise<void> {
  await sendJson("/api/ejercito/directorio-solicitud", "POST", {
    nombre: reg.nombre.trim() || null,
    apellidos: reg.apellidos.trim() || null,
    celular: reg.celular.trim(),
    municipio: reg.municipio?.trim() || null,
    cp: reg.cp != null && String(reg.cp) !== "" ? Number(reg.cp) || null : null,
  });
}
