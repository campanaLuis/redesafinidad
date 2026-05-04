/**
 * Persistencia de Brigadas (equipo + apoyos) vía [redes_api_db].
 */
import { getJson, sendJson } from "@/lib/apiClient";
import type { AdminTeamEntry, AdminTeamRole, TeamApoyo } from "@/lib/teamWorkspaceStorage";

/* ── Login desde JWT almacenado (misma lógica que antes) ───────── */

export function getStoredLogin(): string {
  try {
    const raw = localStorage.getItem("red-afinidad-auth-token");
    if (!raw) return "default";
    const [, payload] = raw.split(".");
    if (!payload) return "default";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.login ?? "default";
  } catch {
    return "default";
  }
}

/* ═════════════ EQUIPO (admin_team) ═════════════ */

export async function loadAdminTeam(ownerLogin: string): Promise<AdminTeamEntry[]> {
  const rows = await getJson<{ memberId: number; role: string }[]>(
    `/api/brigadas/team?owner_login=${encodeURIComponent(ownerLogin)}`,
  );
  return (rows ?? []).map((r) => ({
    memberId: r.memberId,
    role: r.role as AdminTeamRole,
  }));
}

export async function upsertTeamMember(ownerLogin: string, entry: AdminTeamEntry): Promise<void> {
  await sendJson("/api/brigadas/team", "PUT", {
    owner_login: ownerLogin,
    memberId: entry.memberId,
    role: entry.role,
  });
}

export async function deleteTeamMember(ownerLogin: string, memberId: number): Promise<void> {
  const q = new URLSearchParams({ owner_login: ownerLogin, memberId: String(memberId) });
  await sendJson(`/api/brigadas/team?${q}`, "DELETE");
}

export async function upsertManyTeamMembers(ownerLogin: string, entries: AdminTeamEntry[]): Promise<void> {
  if (!entries.length) return;
  await sendJson("/api/brigadas/team/batch", "PUT", {
    owner_login: ownerLogin,
    members: entries.map((e) => ({ memberId: e.memberId, role: e.role })),
  });
}

/* ═════════════ APOYOS (team_apoyos) ═════════════ */

export async function loadApoyos(ownerLogin: string): Promise<TeamApoyo[]> {
  return getJson<TeamApoyo[]>(
    `/api/brigadas/apoyos?owner_login=${encodeURIComponent(ownerLogin)}`,
  );
}

export async function upsertApoyo(ownerLogin: string, apoyo: TeamApoyo): Promise<void> {
  await sendJson("/api/brigadas/apoyos", "PUT", {
    id: apoyo.id,
    owner_login: ownerLogin,
    name: apoyo.name,
    tasks: apoyo.tasks,
    beneficiaryMemberIds: apoyo.beneficiaryMemberIds,
  });
}

export async function deleteApoyoById(apoyoId: string): Promise<void> {
  await sendJson(`/api/brigadas/apoyos/${encodeURIComponent(apoyoId)}`, "DELETE");
}
