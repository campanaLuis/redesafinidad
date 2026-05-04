/**
 * Persistencia de Brigadas (equipo + apoyos) en Supabase.
 * Reemplaza el uso de localStorage para que los datos sean accesibles
 * desde cualquier navegador/dispositivo.
 */
import { externalSupabase as supabase } from "@/lib/externalSupabase";
import type { AdminTeamEntry, AdminTeamRole, TeamApoyo } from "@/lib/teamWorkspaceStorage";

/* ── Obtener login del token almacenado ─────────────────────────── */
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

/* ════════════════════════ EQUIPO ═══════════════════════════════════ */

export async function loadAdminTeamSupa(ownerLogin: string): Promise<AdminTeamEntry[]> {
  const { data, error } = await supabase
    .from("admin_team")
    .select("member_id, role")
    .eq("owner_login", ownerLogin)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    memberId: r.member_id as number,
    role: r.role as AdminTeamRole,
  }));
}

export async function upsertTeamMember(ownerLogin: string, entry: AdminTeamEntry): Promise<void> {
  const { error } = await supabase.from("admin_team").upsert(
    { owner_login: ownerLogin, member_id: entry.memberId, role: entry.role },
    { onConflict: "owner_login,member_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteTeamMember(ownerLogin: string, memberId: number): Promise<void> {
  const { error } = await supabase
    .from("admin_team")
    .delete()
    .eq("owner_login", ownerLogin)
    .eq("member_id", memberId);
  if (error) throw new Error(error.message);
}

export async function upsertManyTeamMembers(ownerLogin: string, entries: AdminTeamEntry[]): Promise<void> {
  if (!entries.length) return;
  const rows = entries.map((e) => ({ owner_login: ownerLogin, member_id: e.memberId, role: e.role }));
  const { error } = await supabase.from("admin_team").upsert(rows, { onConflict: "owner_login,member_id" });
  if (error) throw new Error(error.message);
}

/* ════════════════════════ APOYOS ═══════════════════════════════════ */

export async function loadApoyosSupa(ownerLogin: string): Promise<TeamApoyo[]> {
  const { data, error } = await supabase
    .from("team_apoyos")
    .select("id, name, tasks, beneficiary_member_ids")
    .eq("owner_login", ownerLogin)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    tasks: (r.tasks as TeamApoyo["tasks"]) ?? [],
    beneficiaryMemberIds: [...new Set((r.beneficiary_member_ids as number[]) ?? [])],
  }));
}

export async function upsertApoyo(ownerLogin: string, apoyo: TeamApoyo): Promise<void> {
  const { error } = await supabase.from("team_apoyos").upsert({
    id: apoyo.id,
    owner_login: ownerLogin,
    name: apoyo.name,
    tasks: apoyo.tasks,
    beneficiary_member_ids: apoyo.beneficiaryMemberIds,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function deleteApoyoSupa(apoyoId: string): Promise<void> {
  const { error } = await supabase.from("team_apoyos").delete().eq("id", apoyoId);
  if (error) throw new Error(error.message);
}
