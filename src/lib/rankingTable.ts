import type { NetworkMember } from "@/types/network";
import type { MemberCommentStats } from "@/lib/memberCommentStats";

export interface RankingRow {
  member: NetworkMember;
  level: number;
  directos: number;
  indirectos: number;
  commentsFacebook: number;
  commentsInstagram: number;
  commentsTwitter: number;
  commentsTiktok: number;
  commentsTotal: number;
  participacionesPosts: number;
}

/** Nivel = distancia al ancla raíz (sin padre en la lista o refiereid vacío). */
export function computeLevel(member: NetworkMember, byId: Map<number, NetworkMember>): number {
  let hops = 0;
  let cur: NetworkMember | undefined = member;
  const seen = new Set<number>();
  while (cur?.refiereid) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    const pid = parseInt(String(cur.refiereid), 10);
    const p = byId.get(pid);
    if (!p) break;
    hops++;
    cur = p;
  }
  return hops + 1;
}

function directChildrenOf(parentId: number, members: NetworkMember[]): NetworkMember[] {
  return members.filter((m) => {
    if (!m.refiereid) return false;
    return parseInt(String(m.refiereid), 10) === parentId;
  });
}

export function buildRankingRows(
  members: NetworkMember[],
  commentStats: Map<number, MemberCommentStats>,
): RankingRow[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  return members.map((member) => {
    const directos = parseInt(String(member.direct_descendants_count ?? 0), 10);
    const total = parseInt(String(member.total_descendants_count ?? 0), 10);
    const indirectos = Math.max(0, total - directos);
    const cs = commentStats.get(member.id);
    return {
      member,
      level: computeLevel(member, byId),
      directos,
      indirectos,
      commentsFacebook: cs?.commentsFacebook ?? 0,
      commentsInstagram: cs?.commentsInstagram ?? 0,
      commentsTwitter: cs?.commentsTwitter ?? 0,
      commentsTiktok: cs?.commentsTiktok ?? 0,
      commentsTotal: cs?.commentsTotal ?? 0,
      participacionesPosts: cs?.participacionesPosts ?? 0,
    };
  });
}
