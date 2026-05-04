import { useQuery } from "@tanstack/react-query";
import { fetchAllPostsForPlatform, type LegacyPlatform } from "@/lib/socialLegacyApi";
import { SocialPost } from "@/types/network";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'facebook', 'tiktok'];

export function usePostsData() {
  return useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const results = await Promise.all(
        PLATFORMS.map((p) => fetchAllPostsForPlatform(p as LegacyPlatform)),
      );
      const allPosts = results.flat();
      allPosts.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime());
      return allPosts as SocialPost[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
