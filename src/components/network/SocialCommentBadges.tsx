import { NetworkMember, CommentsDataMap } from "@/types/network";
import { Twitter, Instagram, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

const PLATFORM_CONFIG = {
  twitter: { icon: Twitter, color: "text-sky-500" },
  instagram: { icon: Instagram, color: "text-pink-500" },
  facebook: { icon: Facebook, color: "text-blue-600" },
  tiktok: { icon: TikTokIcon, color: "text-foreground" },
} as const;

interface SocialCommentBadgesProps {
  member: NetworkMember;
  commentsData: CommentsDataMap;
}

export function SocialCommentBadges({ member, commentsData }: SocialCommentBadgesProps) {
  const summaries = commentsData.get(String(member.id));
  if (!summaries || summaries.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {summaries.map((summary) => {
        const config = PLATFORM_CONFIG[summary.platform];
        const Icon = config.icon;
        return (
          <div
            key={summary.platform}
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px]",
              config.color
            )}
            title={`${summary.total} comentarios en ${summary.platform}`}
          >
            <Icon className="h-3 w-3" />
            <span className="font-semibold">{summary.total}</span>
          </div>
        );
      })}
    </div>
  );
}
