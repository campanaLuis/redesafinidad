import { getJson, sendJson } from '@/lib/apiClient';
import type { SocialPost } from '@/types/network';

export type LegacyPlatform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PAGE = 1000;

export async function fetchAllPostsForPlatform(platform: LegacyPlatform): Promise<SocialPost[]> {
  const out: SocialPost[] = [];
  let offset = 0;
  for (;;) {
    const chunk = await getJson<
      {
        post_id: string | number;
        username: string;
        posted_date: string;
        url: string;
        caption: string;
        likes: string | number;
        comentarios: string | number;
      }[]
    >(`/api/social-legacy/${platform}/posts?limit=${PAGE}&offset=${offset}`);
    if (!chunk.length) break;
    for (const row of chunk) {
      out.push({
        post_id: Number(row.post_id),
        username: row.username,
        posted_date: row.posted_date,
        url: row.url,
        caption: row.caption,
        likes: Number(row.likes) || 0,
        comentarios: Number(row.comentarios) || 0,
        platform,
      });
    }
    if (chunk.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

export async function fetchAllCommentRows(
  platform: LegacyPlatform,
  full = false,
): Promise<{ username: string; sentimiento: string; post_id: number }[]> {
  const out: { username: string; sentimiento: string; post_id: number }[] = [];
  let offset = 0;
  for (;;) {
    const q = full
      ? `/api/social-legacy/${platform}/comments?limit=${PAGE}&offset=${offset}&full=1`
      : `/api/social-legacy/${platform}/comments?limit=${PAGE}&offset=${offset}`;
    const chunk = await getJson<
      { username: string; sentimiento: string; post_id: string | number }[]
    >(q);
    if (!chunk.length) break;
    for (const r of chunk) {
      out.push({
        username: r.username,
        sentimiento: r.sentimiento,
        post_id: Number(r.post_id),
      });
    }
    if (chunk.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

export async function fetchCommentsForPost(
  platform: LegacyPlatform,
  postId: number,
): Promise<{ username: string; comentario: string; sentimiento: string }[]> {
  return getJson(
    `/api/social-legacy/${platform}/comments-for-post?post_id=${postId}`,
  );
}

export async function searchMemberComments(
  platform: LegacyPlatform,
  targetNorm: string,
  variants: string[],
) {
  return sendJson<
    { post_id: number; comentario: string; sentimiento: string; username: string }[]
  >('/api/social-legacy/member-comment-search', 'POST', { platform, targetNorm, variants });
}

export async function getPostMetaMap(
  platform: LegacyPlatform,
  postIds: number[],
): Promise<Map<number, { url: string | null; caption: string | null }>> {
  if (postIds.length === 0) return new Map();
  const ids = postIds.join(',');
  const data = await getJson<Record<string, { url: string | null; caption: string | null }>>(
    `/api/social-legacy/${platform}/post-meta?ids=${encodeURIComponent(ids)}`,
  );
  const m = new Map<number, { url: string | null; caption: string | null }>();
  for (const k of Object.keys(data)) {
    m.set(Number(k), data[k]!);
  }
  return m;
}
