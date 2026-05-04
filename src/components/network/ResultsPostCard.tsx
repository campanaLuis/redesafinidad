import { useMemo, useState } from "react";
import { SocialPost, NetworkMember, NetworkMemberWithChildren } from "@/types/network";
import { Twitter, Instagram, Facebook, Heart, MessageCircle, ExternalLink, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostCommentsData } from "@/hooks/usePostCommentsData";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PLATFORMS_CONFIG: Record<Platform, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; usernameField: keyof NetworkMember }> = {
  twitter: { label: 'Twitter', icon: Twitter, color: 'text-sky-500', bgColor: 'bg-sky-500/10', usernameField: 'twitter_username' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10', usernameField: 'instagram_username' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-600/10', usernameField: 'facebook_username' },
  tiktok: { label: 'TikTok', icon: TikTokIcon, color: 'text-foreground', bgColor: 'bg-muted', usernameField: 'tiktok_username' },
};

const RESULTS_HOURS = 120;

function formatTimeLeftToExpire(postedDate: string): string {
  const deadlineMs = new Date(postedDate).getTime() + RESULTS_HOURS * 60 * 60 * 1000;
  const diffMs = deadlineMs - Date.now();
  if (diffMs <= 0) return 'Vencido';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return '';
  return username.toLowerCase().replace('@', '').trim();
}

interface ResultsPostCardProps {
  post: SocialPost;
  rootMember: NetworkMemberWithChildren;
  allNetworkMembers?: NetworkMember[];
}

export function ResultsPostCard({ post, rootMember, allNetworkMembers }: ResultsPostCardProps) {
  const config = PLATFORMS_CONFIG[post.platform];
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Always fetch comments for this post
  const { data: comments, isLoading: loadingComments } = usePostCommentsData(post.platform, post.post_id);

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.posted_date), { addSuffix: true, locale: es });
    } catch {
      return post.posted_date;
    }
  }, [post.posted_date]);

  const captionTruncated = post.caption && post.caption.length > 100;
  const displayCaption = expanded ? post.caption : (post.caption?.slice(0, 100) || '');
  const timeLeft = formatTimeLeftToExpire(post.posted_date);

  // If allNetworkMembers provided, include all; otherwise only root + direct children
  const relevantMembers = useMemo(() => {
    const members: { id: number; nombre: string; username: string }[] = [];
    const addMember = (m: NetworkMember) => {
      const uname = normalizeUsername(m[config.usernameField] as string | null);
      if (uname) members.push({ id: m.id, nombre: m.nombre, username: uname });
    };
    addMember(rootMember);
    if (allNetworkMembers) {
      for (const m of allNetworkMembers) addMember(m);
    } else {
      for (const child of rootMember.children) addMember(child);
    }
    return members;
  }, [rootMember, allNetworkMembers, config.usernameField]);

  // Cross-reference comments with relevant members
  const { participated, notParticipated } = useMemo(() => {
    if (!comments) return { participated: [] as string[], notParticipated: [] as string[] };

    const commentUsernames = new Set<string>();
    for (const c of comments) {
      commentUsernames.add(normalizeUsername(c.username));
    }

    const participated: string[] = [];
    const notParticipated: string[] = [];

    for (const m of relevantMembers) {
      if (commentUsernames.has(m.username)) {
        participated.push(m.nombre);
      } else {
        notParticipated.push(m.nombre);
      }
    }

    return { participated, notParticipated };
  }, [comments, relevantMembers]);

  return (
    <div className="border border-emerald-500/30 rounded-lg p-2.5 space-y-1.5 bg-emerald-500/5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <div className={cn("p-1 rounded", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
        </div>
        <span className="text-[10px] text-muted-foreground flex-1">{timeAgo}</span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Heart className="h-2.5 w-2.5" />{post.likes ?? 0}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <MessageCircle className="h-2.5 w-2.5" />{post.comentarios ?? 0}
        </span>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="text-[11px] text-foreground leading-snug">
          <span className="whitespace-pre-line">{displayCaption}{captionTruncated && !expanded && '…'}</span>
          {captionTruncated && (
            <button onClick={() => setExpanded(!expanded)} className="text-primary text-[10px] font-medium ml-1">
              {expanded ? 'menos' : 'más'}
            </button>
          )}
        </div>
      )}

      {/* Counters with percentages + toggle button */}
      <div className="flex items-center gap-1.5">
        {loadingComments ? (
          <span className="text-[10px] text-muted-foreground animate-pulse">Cargando…</span>
        ) : (
          <>
            {(() => {
              const total = participated.length + notParticipated.length;
              const pctYes = total > 0 ? Math.round((participated.length / total) * 100) : 0;
              const pctNo = total > 0 ? 100 - pctYes : 0;
              return (
                <>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">{participated.length}</span>
                    <span className="text-[9px] font-normal">({pctYes}%)</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">
                    <X className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">{notParticipated.length}</span>
                    <span className="text-[9px] font-normal">({pctNo}%)</span>
                  </div>
                </>
              );
            })()}
            <span className="text-[9px] text-muted-foreground flex-1 text-right">queda {timeLeft}</span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>

      {/* Expandable participation breakdown */}
      {!loadingComments && showDetails && (
        <div className="border-t border-emerald-500/20 pt-1.5 space-y-1">
          {participated.length > 0 && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <Check className="h-3 w-3" />
                <span>Participaron ({participated.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {participated.map((name, i) => (
                  <span key={i} className="text-[9px] bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded-full">{name}</span>
                ))}
              </div>
            </div>
          )}
          {notParticipated.length > 0 && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] font-medium text-red-500">
                <X className="h-3 w-3" />
                <span>No participaron ({notParticipated.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {notParticipated.map((name, i) => (
                  <span key={i} className="text-[9px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full">{name}</span>
                ))}
              </div>
            </div>
          )}
          {relevantMembers.length === 0 && (
            <p className="text-[10px] text-muted-foreground">Ningún miembro tiene usuario de {config.label}</p>
          )}
        </div>
      )}
    </div>
  );
}
