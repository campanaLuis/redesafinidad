const TEAM_IDS_KEY = "red-afinidad-admin-team-member-ids";
const TEAM_ENTRIES_KEY = "red-afinidad-admin-team-v2";
const WORKSPACE_KEY = "red-afinidad-team-workspace-v1";

/** Roles del equipo administrativo (Brigadas). */
export const ADMIN_TEAM_ROLES = ["vocal", "enlace", "regional", "estatal"] as const;
export type AdminTeamRole = (typeof ADMIN_TEAM_ROLES)[number];

export const DEFAULT_ADMIN_TEAM_ROLE: AdminTeamRole = "enlace";

export function isAdminTeamRole(value: string): value is AdminTeamRole {
  return (ADMIN_TEAM_ROLES as readonly string[]).includes(value);
}

export type AdminTeamEntry = {
  memberId: number;
  role: AdminTeamRole;
};

export type TeamTask = {
  id: string;
  title: string;
  memberId: number;
  done: boolean;
  createdAt: string;
};

/** Apoyo en Brigadas: nombre + personas del directorio que reciben ayuda + tareas del equipo. */
export type TeamApoyo = {
  id: string;
  name: string;
  tasks: TeamTask[];
  /** Personas del directorio incluidas en este apoyo. */
  beneficiaryMemberIds: number[];
};

/** @deprecated Usar TeamApoyo */
export type TeamProjectOrCampaign = TeamApoyo;

export type TeamWorkspace = {
  /** Lista de apoyos (clave `projects` por compatibilidad con datos guardados). */
  projects: TeamApoyo[];
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeEntry(raw: unknown): AdminTeamEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const memberId = Number(o.memberId);
  if (!Number.isFinite(memberId)) return null;
  const role = typeof o.role === "string" && isAdminTeamRole(o.role) ? o.role : DEFAULT_ADMIN_TEAM_ROLE;
  return { memberId, role };
}

/** Carga el equipo con roles; migra desde el formato antiguo (solo IDs) si hace falta. */
export function loadAdminTeam(): AdminTeamEntry[] {
  if (typeof window === "undefined") return [];

  const v2 = localStorage.getItem(TEAM_ENTRIES_KEY);
  if (v2) {
    const parsed = safeParse<unknown[]>(v2, []);
    if (!Array.isArray(parsed)) return [];
    const out: AdminTeamEntry[] = [];
    const seen = new Set<number>();
    for (const item of parsed) {
      const e = normalizeEntry(item);
      if (e && !seen.has(e.memberId)) {
        seen.add(e.memberId);
        out.push(e);
      }
    }
    return out;
  }

  const legacy = localStorage.getItem(TEAM_IDS_KEY);
  const ids = safeParse<number[]>(legacy, []);
  if (!Array.isArray(ids)) return [];
  const migrated = ids
    .filter((n) => Number.isFinite(n))
    .map((memberId) => ({ memberId, role: DEFAULT_ADMIN_TEAM_ROLE }));
  if (migrated.length > 0) {
    saveAdminTeam(migrated);
  }
  return migrated;
}

export function saveAdminTeam(entries: AdminTeamEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEAM_ENTRIES_KEY, JSON.stringify(entries));
}

/** @deprecated Usar loadAdminTeam; se mantiene por compatibilidad con código que solo necesite IDs. */
export function loadTeamMemberIds(): number[] {
  return loadAdminTeam().map((e) => e.memberId);
}

/** @deprecated Usar saveAdminTeam con entradas completas. */
export function saveTeamMemberIds(ids: number[]): void {
  saveAdminTeam(ids.map((memberId) => ({ memberId, role: DEFAULT_ADMIN_TEAM_ROLE })));
}

export function loadWorkspace(): TeamWorkspace {
  if (typeof window === "undefined") return { projects: [] };
  const raw = localStorage.getItem(WORKSPACE_KEY);
  const data = safeParse<TeamWorkspace | null>(raw, null);
  if (!data || !Array.isArray(data.projects)) return { projects: [] };
  return {
    projects: data.projects.map((p) => {
      const raw = p as TeamApoyo & { beneficiaryMemberIds?: unknown; kind?: unknown };
      const ids = Array.isArray(raw.beneficiaryMemberIds)
        ? raw.beneficiaryMemberIds.filter((n): n is number => Number.isFinite(n))
        : [];
      return {
        id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
        name: typeof raw.name === "string" ? raw.name : "Sin nombre",
        tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
        beneficiaryMemberIds: ids,
      };
    }),
  };
}

export function saveWorkspace(ws: TeamWorkspace): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
}

export function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
