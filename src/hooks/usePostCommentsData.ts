import { useQuery } from "@tanstack/react-query";
import { fetchCommentsForPost, type LegacyPlatform } from "@/lib/socialLegacyApi";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

export interface PostComment {
  username: string;
  comentario: string;
  sentimiento: string;
}

export function usePostCommentsData(platform: Platform | null, postId: number | null) {
  return useQuery({
    queryKey: ['post-comments', platform, postId],
    queryFn: () => fetchCommentsForPost(platform as LegacyPlatform, postId!),
    enabled: !!platform && postId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
