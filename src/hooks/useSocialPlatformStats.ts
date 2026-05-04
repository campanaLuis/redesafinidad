import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { NetworkMember } from "@/types/network";
import { usePostsData } from "@/hooks/usePostsData";
import { fetchAllCommentRows, type LegacyPlatform } from "@/lib/socialLegacyApi";

export type SocialPlatformKey = "twitter" | "instagram" | "facebook" | "tiktok";

const COMMENT_PLATFORMS: SocialPlatformKey[] = ["facebook", "instagram", "tiktok", "twitter"];

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return "";
  return username.toLowerCase().replace("@", "").trim();
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

export type SocialCommentRow = {
  username: string;
  sentimiento: string;
  post_id: number;
};

async function fetchAllCommentsForPlatform(platform: SocialPlatformKey): Promise<SocialCommentRow[]> {
  return fetchAllCommentRows(platform as LegacyPlatform, false);
}

export interface SocialPlatformStat {
  platform: SocialPlatformKey;
  totalPosts: number;
  totalComments: number;
  registeredComments: number;
  externalComments: number;
  registeredPct: number;
  externalPct: number;
  sentimentPct: { positivo: number; negativo: number; neutro: number };
}

function computeStats(
  members: NetworkMember[],
  posts: { platform: SocialPlatformKey }[],
  commentsByPlatform: Record<SocialPlatformKey, SocialCommentRow[]>,
): SocialPlatformStat[] {
  const usernameMap = buildUsernameMap(members);
  const platforms: SocialPlatformKey[] = ["facebook", "instagram", "tiktok", "twitter"];

  return platforms.map((platform) => {
    const totalPosts = posts.filter((p) => p.platform === platform).length;
    const rows = commentsByPlatform[platform] ?? [];
    const totalComments = rows.length;

    let registeredComments = 0;
    let positivo = 0;
    let negativo = 0;
    let neutro = 0;

    for (const row of rows) {
      const normalized = normalizeUsername(row.username);
      if (normalized && usernameMap.has(normalized)) {
        registeredComments++;
      }
      const sent = (row.sentimiento || "").toLowerCase();
      if (sent === "positivo") positivo++;
      else if (sent === "negativo") negativo++;
      else neutro++;
    }

    const externalComments = totalComments - registeredComments;
    const registeredPct = totalComments > 0 ? (registeredComments / totalComments) * 100 : 0;
    const externalPct = totalComments > 0 ? (externalComments / totalComments) * 100 : 0;

    const sentimentPct = {
      positivo: totalComments > 0 ? (positivo / totalComments) * 100 : 0,
      negativo: totalComments > 0 ? (negativo / totalComments) * 100 : 0,
      neutro: totalComments > 0 ? (neutro / totalComments) * 100 : 0,
    };

    return {
      platform,
      totalPosts,
      totalComments,
      registeredComments,
      externalComments,
      registeredPct,
      externalPct,
      sentimentPct,
    };
  });
}

export function useSocialPlatformStats(members: NetworkMember[]) {
  const postsQuery = usePostsData();

  const commentsQuery = useQuery({
    queryKey: ["social-platform-aggregate", "v3"],
    queryFn: async () => {
      const entries = await Promise.all(
        COMMENT_PLATFORMS.map(async (platform) => [platform, await fetchAllCommentsForPlatform(platform)] as const),
      );
      return Object.fromEntries(entries) as Record<SocialPlatformKey, SocialCommentRow[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    if (!postsQuery.data || !commentsQuery.data) return null;
    return computeStats(members, postsQuery.data as { platform: SocialPlatformKey }[], commentsQuery.data);
  }, [members, postsQuery.data, commentsQuery.data]);

  const isLoading = postsQuery.isLoading || commentsQuery.isLoading;
  const isError = postsQuery.isError || commentsQuery.isError;

  return {
    stats,
    /** Filas completas por red (incluye post_id para series temporales). */
    commentsByPlatform: commentsQuery.data ?? null,
    posts: postsQuery.data ?? null,
    isLoading,
    isError,
    postsError: postsQuery.error,
    commentsError: commentsQuery.error,
  };
}
