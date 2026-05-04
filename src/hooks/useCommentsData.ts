import { useQuery } from "@tanstack/react-query";
import { fetchAllCommentRows, type LegacyPlatform } from "@/lib/socialLegacyApi";
import { NetworkMember, UserCommentsSummary, CommentsDataMap } from "@/types/network";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'facebook', 'tiktok'];

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return '';
  return username.toLowerCase().replace('@', '').trim();
}

async function fetchAllCommentsForPlatform(
  platform: Platform
): Promise<{ username: string; sentimiento: string }[]> {
  const rows = await fetchAllCommentRows(platform as LegacyPlatform, false);
  return rows.map((r) => ({ username: r.username, sentimiento: r.sentimiento }));
}

function buildUsernameMap(members: NetworkMember[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const member of members) {
    const memberId = String(member.id);
    const handles = [
      member.facebook_username,
      member.instagram_username,
      member.twitter_username,
      member.tiktok_username,
    ];
    for (const handle of handles) {
      const normalized = normalizeUsername(handle);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, memberId);
      }
    }
  }
  return map;
}

function buildCommentsMap(
  usernameMap: Map<string, string>,
  allResults: { platform: Platform; data: { username: string; sentimiento: string }[] }[]
): CommentsDataMap {
  const stats = new Map<string, Map<Platform, { total: number; positivo: number; negativo: number; neutro: number }>>();

  for (const { platform, data } of allResults) {
    for (const row of data) {
      const normalized = normalizeUsername(row.username);
      if (!normalized) continue;
      const memberId = usernameMap.get(normalized);
      if (!memberId) continue;

      if (!stats.has(memberId)) stats.set(memberId, new Map());
      const platformMap = stats.get(memberId)!;
      if (!platformMap.has(platform)) {
        platformMap.set(platform, { total: 0, positivo: 0, negativo: 0, neutro: 0 });
      }
      const counts = platformMap.get(platform)!;
      counts.total++;
      const sent = (row.sentimiento || "").toLowerCase();
      if (sent === "positivo") counts.positivo++;
      else if (sent === "negativo") counts.negativo++;
      else counts.neutro++;
    }
  }

  const result = new Map<string, UserCommentsSummary[]>();
  for (const [memberId, platformMap] of stats) {
    const summaries: UserCommentsSummary[] = [];
    for (const [platform, counts] of platformMap) {
      summaries.push({ platform, ...counts });
    }
    result.set(memberId, summaries);
  }
  return result;
}

export function useCommentsData(members: NetworkMember[] | null) {
  return useQuery({
    queryKey: ['user-comments', members?.length ?? 0],
    queryFn: async () => {
      if (!members?.length) return new Map() as CommentsDataMap;
      const usernameMap = buildUsernameMap(members);
      const allResults: { platform: Platform; data: { username: string; sentimiento: string }[] }[] = [];

      for (const platform of PLATFORMS) {
        const data = await fetchAllCommentsForPlatform(platform);
        allResults.push({ platform, data });
      }

      return buildCommentsMap(usernameMap, allResults);
    },
    enabled: !!members && members.length > 0,
  });
}
