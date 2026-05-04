import { useQuery } from "@tanstack/react-query";
import { searchMemberComments, getPostMetaMap, type LegacyPlatform } from "@/lib/socialLegacyApi";
import type { NetworkMember } from "@/types/network";

export type SocialPlatform = "twitter" | "instagram" | "facebook" | "tiktok";

const USERNAME_FIELD: Record<SocialPlatform, keyof NetworkMember> = {
  twitter: "twitter_username",
  instagram: "instagram_username",
  facebook: "facebook_username",
  tiktok: "tiktok_username",
};

function normalizeUsername(u: string | null | undefined): string {
  if (!u) return "";
  return u.toLowerCase().replace(/@/g, "").trim();
}

function usernameVariants(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();
  const noAt = t.replace(/^@+/, "");
  return [...new Set([t, noAt, `@${noAt}`, noAt.toLowerCase(), `@${noAt.toLowerCase()}`])].filter(Boolean);
}

export interface MemberCommentRow {
  platform: SocialPlatform;
  post_id: number;
  comentario: string;
  sentimiento: string;
  postUrl: string | null;
  captionPreview: string | null;
}

export interface MemberSocialCommentsResult {
  totals: Record<SocialPlatform, number>;
  list: MemberCommentRow[];
}

async function fetchPostMeta(
  platform: SocialPlatform,
  postIds: number[],
): Promise<Map<number, { url: string | null; caption: string | null }>> {
  if (postIds.length === 0) return new Map();
  return getPostMetaMap(platform as LegacyPlatform, postIds);
}

async function fetchCommentsForPlatform(
  platform: SocialPlatform,
  rawUsername: string | null | undefined,
): Promise<{ post_id: number; comentario: string; sentimiento: string; username: string }[]> {
  if (!rawUsername?.trim()) return [];
  const target = normalizeUsername(rawUsername);
  const variants = usernameVariants(rawUsername);
  if (variants.length === 0) return [];
  return searchMemberComments(platform as LegacyPlatform, target, variants);
}

async function fetchMemberSocialComments(member: NetworkMember): Promise<MemberSocialCommentsResult> {
  const platforms: SocialPlatform[] = ["twitter", "instagram", "facebook", "tiktok"];
  const list: MemberCommentRow[] = [];
  const totals: Record<SocialPlatform, number> = {
    twitter: 0,
    instagram: 0,
    facebook: 0,
    tiktok: 0,
  };

  for (const p of platforms) {
    const raw = member[USERNAME_FIELD[p]] as string | null;
    const rows = await fetchCommentsForPlatform(p, raw);
    totals[p] = rows.length;
    const postIds = [...new Set(rows.map((r) => r.post_id))];
    const metaMap = await fetchPostMeta(p, postIds);
    for (const row of rows) {
      const meta = metaMap.get(row.post_id);
      list.push({
        platform: p,
        post_id: row.post_id,
        comentario: row.comentario,
        sentimiento: row.sentimiento,
        postUrl: meta?.url ?? null,
        captionPreview: meta?.caption ? meta.caption.slice(0, 160) : null,
      });
    }
  }

  return { totals, list };
}

export function useMemberSocialComments(member: NetworkMember | null, open: boolean) {
  return useQuery({
    queryKey: ["member-social-comments-detail", member?.id],
    queryFn: () => fetchMemberSocialComments(member!),
    enabled: open && !!member,
    staleTime: 2 * 60 * 1000,
  });
}
