import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface SocialPost {
  id: string;
  platform: string | null;
  content_type: string | null;
  external_id: string | null;
  parent_id: string | null;
  username: string | null;
  content: string | null;
  url: string | null;
  likes: number;
  comments_count: number;
  posted_date: string | null;
  created_at: string | null;
  scrap_realizado: string | null;
  sentiment: string | null;
  key_id: string | null;
}

async function fetchSocialContent(): Promise<SocialPost[]> {
  const res = await fetch("/api/social-content.php");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SocialPost[]>;
}

export interface AccountStats {
  username: string;
  posts: number;
  likes: number;
  comments: number;
  engagement: number;
  avgLikes: number;
  avgComments: number;
  topPost: SocialPost | null;
}

export interface PlatformStats {
  platform: string;
  posts: number;
  likes: number;
  comments: number;
  engagement: number;
}

export interface MonthStat {
  month: string;   // "2026-01"
  label: string;   // "Ene 2026"
  posts: number;
  likes: number;
  comments: number;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export function useSocialContentData() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["social-content"],
    queryFn: fetchSocialContent,
    staleTime: 5 * 60 * 1000,
  });

  const posts = data ?? [];

  const computed = useMemo(() => {
    if (!posts.length) return null;

    const totalLikes    = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);
    const totalEngagement = totalLikes + totalComments;

    const onlyPosts     = posts.filter(p => p.content_type === "post");
    const avgLikes      = onlyPosts.length > 0 ? totalLikes / onlyPosts.length : 0;
    const avgComments   = onlyPosts.length > 0 ? totalComments / onlyPosts.length : 0;
    const avgEngagement = onlyPosts.length > 0 ? totalEngagement / onlyPosts.length : 0;

    /* Cuentas únicas */
    const usernameSet = new Set(posts.map(p => p.username).filter(Boolean)) as Set<string>;
    const accountNames = [...usernameSet].sort();

    /* Stats por cuenta */
    const accountStats: AccountStats[] = accountNames.map(uname => {
      const ap = posts.filter(p => p.username === uname);
      const al = ap.reduce((s, p) => s + p.likes, 0);
      const ac = ap.reduce((s, p) => s + p.comments_count, 0);
      const topPost = ap.sort((a, b) => (b.likes + b.comments_count) - (a.likes + a.comments_count))[0] ?? null;
      return {
        username: uname,
        posts: ap.length,
        likes: al,
        comments: ac,
        engagement: al + ac,
        avgLikes: ap.length > 0 ? al / ap.length : 0,
        avgComments: ap.length > 0 ? ac / ap.length : 0,
        topPost,
      };
    });

    /* Stats por plataforma */
    const platformMap = new Map<string, PlatformStats>();
    for (const p of posts) {
      const key = p.platform ?? "desconocida";
      const existing = platformMap.get(key) ?? { platform: key, posts: 0, likes: 0, comments: 0, engagement: 0 };
      existing.posts++;
      existing.likes += p.likes;
      existing.comments += p.comments_count;
      existing.engagement += p.likes + p.comments_count;
      platformMap.set(key, existing);
    }
    const platformStats = [...platformMap.values()].sort((a, b) => b.engagement - a.engagement);

    /* Distribución mensual */
    const monthMap = new Map<string, MonthStat>();
    for (const p of posts) {
      const ym = (p.posted_date ?? "").slice(0, 7);
      if (!ym) continue;
      const existing = monthMap.get(ym) ?? { month: ym, label: monthLabel(ym), posts: 0, likes: 0, comments: 0 };
      existing.posts++;
      existing.likes += p.likes;
      existing.comments += p.comments_count;
      monthMap.set(ym, existing);
    }
    const monthlyStats = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    /* Top posts por engagement */
    const topPosts = [...posts]
      .sort((a, b) => (b.likes + b.comments_count) - (a.likes + a.comments_count))
      .slice(0, 15);

    /* Sentimiento */
    const sentimentMap: Record<string, number> = {};
    for (const p of posts) {
      const s = p.sentiment ?? "Sin analizar";
      sentimentMap[s] = (sentimentMap[s] ?? 0) + 1;
    }

    /* Con análisis de sentimiento */
    const withSentiment = posts.filter(p => p.sentiment?.trim()).length;

    return {
      totalLikes,
      totalComments,
      totalEngagement,
      avgLikes,
      avgComments,
      avgEngagement,
      accountCount: accountNames.length,
      accountStats,
      platformStats,
      monthlyStats,
      topPosts,
      sentimentMap,
      withSentiment,
      onlyPostsCount: onlyPosts.length,
    };
  }, [posts]);

  return {
    posts,
    total: posts.length,
    computed,
    isLoading,
    isError,
    error,
  };
}
