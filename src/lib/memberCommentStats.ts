import type { NetworkMember } from "@/types/network";
import type { SocialCommentRow, SocialPlatformKey } from "@/hooks/useSocialPlatformStats";

const PLATFORMS: SocialPlatformKey[] = ["facebook", "instagram", "tiktok", "twitter"];

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return "";
  return username.toLowerCase().replace("@", "").trim();
}

function postParticipationKey(plat: SocialPlatformKey, postId: unknown): string {
  const n = Number(postId);
  return `${plat}:${Number.isFinite(n) ? n : String(postId)}`;
}

export type MemberCommentStats = {
  commentsFacebook: number;
  commentsInstagram: number;
  commentsTwitter: number;
  commentsTiktok: number;
  /** Total de filas de comentario asociadas al usuario. */
  commentsTotal: number;
  /**
   * Posts distintos (red + post_id) en los que hubo al menos un comentario;
   * varios comentarios en el mismo post cuentan como 1.
   */
  participacionesPosts: number;
};

function emptyStats(): MemberCommentStats {
  return {
    commentsFacebook: 0,
    commentsInstagram: 0,
    commentsTwitter: 0,
    commentsTiktok: 0,
    commentsTotal: 0,
    participacionesPosts: 0,
  };
}

/** Mapa handle normalizado → id de miembro (primer handle que gana, igual que en agregados de red). */
function buildHandleToMemberId(members: NetworkMember[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of members) {
    const id = m.id;
    const handles = [m.facebook_username, m.instagram_username, m.twitter_username, m.tiktok_username];
    for (const h of handles) {
      const n = normalizeUsername(h);
      if (n && !map.has(n)) map.set(n, id);
    }
  }
  return map;
}

type Acc = { stats: MemberCommentStats; posts: Set<string> };

/**
 * Cuenta comentarios por red y participaciones únicas por post (plataforma + post_id) para cada miembro.
 */
export function aggregateMemberCommentStats(
  members: NetworkMember[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]> | null | undefined,
): Map<number, MemberCommentStats> {
  const byMember = new Map<number, Acc>();
  for (const m of members) {
    byMember.set(m.id, { stats: emptyStats(), posts: new Set() });
  }

  if (!commentsByPlatform) {
    const out = new Map<number, MemberCommentStats>();
    for (const m of members) out.set(m.id, emptyStats());
    return out;
  }

  const handleMap = buildHandleToMemberId(members);

  for (const plat of PLATFORMS) {
    for (const c of commentsByPlatform[plat] ?? []) {
      const norm = normalizeUsername(c.username);
      const memberId = handleMap.get(norm);
      if (memberId === undefined) continue;

      const acc = byMember.get(memberId);
      if (!acc) continue;

      acc.stats.commentsTotal += 1;
      if (plat === "facebook") acc.stats.commentsFacebook += 1;
      else if (plat === "instagram") acc.stats.commentsInstagram += 1;
      else if (plat === "twitter") acc.stats.commentsTwitter += 1;
      else if (plat === "tiktok") acc.stats.commentsTiktok += 1;

      acc.posts.add(postParticipationKey(plat, c.post_id));
    }
  }

  const out = new Map<number, MemberCommentStats>();
  for (const m of members) {
    const acc = byMember.get(m.id)!;
    out.set(m.id, {
      ...acc.stats,
      participacionesPosts: acc.posts.size,
    });
  }
  return out;
}
