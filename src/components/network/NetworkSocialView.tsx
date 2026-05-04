import { useMemo, useState } from "react";
import { NetworkMemberWithChildren, NetworkMember, SocialPost, CommentsDataMap } from "@/types/network";
import { Button } from "@/components/ui/button";
import { Twitter, Instagram, Facebook, Heart, MessageCircle, ExternalLink, Check, X, Clock, AlertTriangle, BarChart3, Trophy } from "lucide-react";
import { ResultsPostCard } from "./ResultsPostCard";
import { ParticipationTableView } from "./ParticipationTableView";
import { cn } from "@/lib/utils";
import { usePostsData } from "@/hooks/usePostsData";
import { formatDistanceToNow, differenceInMilliseconds } from "date-fns";
import { es } from "date-fns/locale";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PLATFORMS: { key: Platform; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; activeColor: string }[] = [
  { key: 'twitter', label: 'Twitter', icon: Twitter, color: 'text-sky-500', bgColor: 'bg-sky-500/10', activeColor: 'bg-sky-500 text-white' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10', activeColor: 'bg-pink-500 text-white' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-600/10', activeColor: 'bg-blue-600 text-white' },
  { key: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: 'text-foreground', bgColor: 'bg-muted', activeColor: 'bg-foreground text-background' },
];

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return '';
  return username.toLowerCase().replace('@', '').trim();
}

const ACTIVE_HOURS = 60;
const RESULTS_HOURS = 84;

function getHoursSincePost(postedDate: string): number {
  return (Date.now() - new Date(postedDate).getTime()) / (1000 * 60 * 60);
}

function getPostStatus(postedDate: string): 'active' | 'results' | 'expired' {
  const hours = getHoursSincePost(postedDate);
  if (hours <= ACTIVE_HOURS) return 'active';
  if (hours <= RESULTS_HOURS) return 'results';
  return 'expired';
}

function isPostActive(postedDate: string): boolean {
  return getPostStatus(postedDate) === 'active';
}

function formatTimeLeft(postedDate: string): string {
  const deadlineMs = new Date(postedDate).getTime() + ACTIVE_HOURS * 60 * 60 * 1000;
  const diffMs = deadlineMs - Date.now();
  if (diffMs <= 0) return 'Vencido';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getTimeLeftColors(postedDate: string): { text: string; bg: string } {
  const hoursLeft = (new Date(postedDate).getTime() + ACTIVE_HOURS * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60);
  const ratio = Math.max(0, Math.min(1, hoursLeft / ACTIVE_HOURS));
  if (ratio > 0.5) return { text: 'text-emerald-600', bg: 'bg-emerald-500/15' };
  if (ratio > 0.25) return { text: 'text-amber-600', bg: 'bg-amber-500/15' };
  return { text: 'text-red-600', bg: 'bg-red-500/15' };
}

/* ---- Active Post Card (pending task) ---- */
interface ActivePostCardProps {
  post: SocialPost;
}

function ActivePostCard({ post }: ActivePostCardProps) {
  const config = PLATFORMS.find(p => p.key === post.platform)!;
  const Icon = config.icon;
  const timeLeft = formatTimeLeft(post.posted_date);
  const urgency = getTimeLeftColors(post.posted_date);
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.posted_date), { addSuffix: true, locale: es });
    } catch {
      return post.posted_date;
    }
  }, [post.posted_date]);

  const [expanded, setExpanded] = useState(false);
  const captionTruncated = post.caption && post.caption.length > 100;
  const displayCaption = expanded ? post.caption : (post.caption?.slice(0, 100) || '');

  return (
    <div className="border border-amber-500/30 rounded-lg p-2.5 space-y-1.5 bg-amber-500/5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <div className={cn("p-1 rounded", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
        </div>
        <span className="text-[10px] text-muted-foreground flex-1">{timeAgo}</span>
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

      {/* Pending task badge */}
      <div className="flex items-center gap-1.5">
        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full", urgency.bg, urgency.text)}>
          <Clock className="h-3 w-3" />
          <span className="text-[10px] font-semibold">{timeLeft}</span>
          <span className="text-[9px] font-normal">para comentar</span>
        </div>
      </div>

      {/* "Ir al post" button — bottom, compact */}
      {post.url && (
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 w-full py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium hover:opacity-90 transition-opacity">
          <ExternalLink className="h-3 w-3" />
          Ir al post y comentar
        </a>
      )}
    </div>
  );
}

/* ---- Expired Participation View (summary per person) ---- */
interface ExpiredParticipationViewProps {
  expiredPosts: SocialPost[];
  rootMember: NetworkMemberWithChildren;
  directInvites: NetworkMember[];
  commentsData: CommentsDataMap;
}

function ExpiredParticipationView({ expiredPosts, rootMember, directInvites, commentsData }: ExpiredParticipationViewProps) {
  if (expiredPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">No hay posts vencidos</p>
      </div>
    );
  }

  // Filter posts per member based on their join date
  function getPostsForMember(joinDate: string) {
    const joined = new Date(joinDate);
    return expiredPosts.filter(p => new Date(p.posted_date) >= joined);
  }

  // Build participation row for a member using only their relevant posts
  function getMemberStats(memberId: number, joinDate: string) {
    const memberPosts = getPostsForMember(joinDate);
    const memberByPlatform: Record<Platform, number> = { twitter: 0, instagram: 0, facebook: 0, tiktok: 0 };
    for (const p of memberPosts) memberByPlatform[p.platform]++;
    const totalMemberPosts = memberPosts.length;

    const summaries = commentsData.get(String(memberId)) ?? [];
    let totalCommented = 0;
    const byPlatform: { platform: Platform; commented: number; total: number }[] = [];
    for (const plat of PLATFORMS) {
      const s = summaries.find(x => x.platform === plat.key);
      const commented = s ? Math.min(s.total, memberByPlatform[plat.key]) : 0;
      totalCommented += commented;
      byPlatform.push({ platform: plat.key, commented, total: memberByPlatform[plat.key] });
    }
    return { totalCommented, totalPosts: totalMemberPosts, byPlatform };
  }

  const rootStats = getMemberStats(rootMember.id, rootMember.created_at);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-[10px] text-muted-foreground px-1">
        {expiredPosts.length} posts vencidos en total
      </div>

      {/* Root member (Yo) */}
      <div className="border border-primary/30 rounded-lg p-2.5 bg-primary/5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-primary">Yo ({rootMember.nombre})</span>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
              <Check className="h-3 w-3" /> {rootStats.totalCommented}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
              <X className="h-3 w-3" /> {rootStats.totalPosts - rootStats.totalCommented}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rootStats.byPlatform.map(bp => {
            const config = PLATFORMS.find(p => p.key === bp.platform)!;
            const Icon = config.icon;
            return (
              <div key={bp.platform} className="flex items-center gap-1">
                <Icon className={cn("h-3 w-3", config.color)} />
                <span className="text-[9px] text-muted-foreground">{bp.commented}/{bp.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct invites */}
      <div className="space-y-1">
        {directInvites.map(inv => {
          const stats = getMemberStats(inv.id, inv.created_at);
          return (
            <div key={inv.id} className="border border-border/50 rounded-lg p-2 bg-card flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-foreground truncate block">{inv.nombre}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {stats.byPlatform.map(bp => {
                    const config = PLATFORMS.find(p => p.key === bp.platform)!;
                    const Icon = config.icon;
                    return (
                      <div key={bp.platform} className="flex items-center gap-0.5">
                        <Icon className={cn("h-2.5 w-2.5", config.color)} />
                        <span className="text-[9px] text-muted-foreground">{bp.commented}/{bp.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> {stats.totalCommented}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
                  <X className="h-3 w-3" /> {stats.totalPosts - stats.totalCommented}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Participation Summary ---- */
interface ParticipationSummaryProps {
  posts: SocialPost[];
  rootMember: NetworkMemberWithChildren;
  commentsData: CommentsDataMap;
}

function ParticipationSummary({ posts, rootMember, commentsData }: ParticipationSummaryProps) {
  const summary = useMemo(() => {
    const postCounts: Record<Platform, number> = { twitter: 0, instagram: 0, facebook: 0, tiktok: 0 };
    for (const p of posts) postCounts[p.platform]++;

    const rootSummaries = commentsData.get(String(rootMember.id)) ?? [];
    const rootByPlatform: Record<Platform, number> = { twitter: 0, instagram: 0, facebook: 0, tiktok: 0 };
    for (const s of rootSummaries) rootByPlatform[s.platform] = s.total;

    const allMembers = [rootMember, ...rootMember.children];
    const inviteByPlatform: Record<Platform, number> = { twitter: 0, instagram: 0, facebook: 0, tiktok: 0 };
    for (const member of allMembers) {
      const summaries = commentsData.get(String(member.id)) ?? [];
      for (const s of summaries) inviteByPlatform[s.platform] += s.total;
    }

    return PLATFORMS.map(p => ({
      ...p,
      totalPosts: postCounts[p.key],
      myComments: rootByPlatform[p.key],
      networkComments: inviteByPlatform[p.key],
    }));
  }, [posts, rootMember, commentsData]);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h3 className="text-[11px] font-bold text-primary">Resumen de participación</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {summary.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2 bg-card rounded-md px-2 py-1.5 border border-border/30">
              <div className={cn("p-1 rounded", s.bgColor)}>
                <Icon className={cn("h-3 w-3", s.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-[11px] font-semibold text-foreground leading-tight">
                  {s.networkComments} <span className="font-normal text-muted-foreground">en</span> {s.totalPosts} <span className="font-normal text-muted-foreground">posts</span>
                </p>
                <p className="text-[9px] text-muted-foreground">Yo: {s.myComments} · Red: {s.networkComments}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Platform Filters ---- */
interface PlatformFiltersProps {
  posts: SocialPost[];
  activeFilter: Platform | 'all';
  onFilter: (f: Platform | 'all') => void;
}

function PlatformFilters({ posts, activeFilter, onFilter }: PlatformFiltersProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      <button
        onClick={() => onFilter('all')}
        className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors shrink-0",
          activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Todas ({posts.length})
      </button>
      {PLATFORMS.map(p => {
        const count = posts.filter(post => post.platform === p.key).length;
        const Icon = p.icon;
        return (
          <button
            key={p.key}
            onClick={() => onFilter(p.key)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors shrink-0",
              activeFilter === p.key ? p.activeColor : cn(p.bgColor, p.color, 'hover:opacity-80')
            )}
          >
            <Icon className="h-3 w-3" />
            {count}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Pagination ---- */
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-1">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
      >
        Anterior
      </button>
      <span className="text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
      >
        Siguiente
      </button>
    </div>
  );
}

/* ---- Main View ---- */
interface NetworkSocialViewProps {
  rootMember: NetworkMemberWithChildren;
  allNetworkMembers: NetworkMember[];
  commentsData: CommentsDataMap;
}

export function NetworkSocialView({ rootMember, allNetworkMembers, commentsData }: NetworkSocialViewProps) {
  const { data: posts, isLoading } = usePostsData();
  const [subTab, setSubTab] = useState<'results' | 'active' | 'expired'>('active');
  const [activePage, setActivePage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<Platform | 'all'>('all');
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsFilter, setResultsFilter] = useState<Platform | 'all'>('all');
  const PAGE_SIZE = 15;

  const isAdminUser = rootMember.hash_code === '8hkozysa';
  const directInvites = rootMember.children as NetworkMember[];
  const userJoinDate = new Date(rootMember.created_at);

  // Split posts into active (≤60h), results (61-120h), and expired (>120h)
  const { activePosts, resultsPosts, expiredPosts } = useMemo(() => {
    if (!posts) return { activePosts: [], resultsPosts: [], expiredPosts: [] };
    const relevantPosts = posts.filter(p => new Date(p.posted_date) >= userJoinDate);
    const active: SocialPost[] = [];
    const results: SocialPost[] = [];
    const expired: SocialPost[] = [];
    for (const p of relevantPosts) {
      const status = getPostStatus(p.posted_date);
      if (status === 'active') active.push(p);
      else if (status === 'results') results.push(p);
      else expired.push(p);
    }
    return { activePosts: active, resultsPosts: results, expiredPosts: expired };
  }, [posts, userJoinDate]);

  const filteredActive = useMemo(() => {
    if (activeFilter === 'all') return activePosts;
    return activePosts.filter(p => p.platform === activeFilter);
  }, [activePosts, activeFilter]);

  const filteredResults = useMemo(() => {
    if (resultsFilter === 'all') return resultsPosts;
    return resultsPosts.filter(p => p.platform === resultsFilter);
  }, [resultsPosts, resultsFilter]);

  const activePages = Math.max(1, Math.ceil(filteredActive.length / PAGE_SIZE));
  const pagedActive = filteredActive.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);

  const resultsTotalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const pagedResults = filteredResults.slice(resultsPage * PAGE_SIZE, (resultsPage + 1) * PAGE_SIZE);

  const handleActiveFilter = (f: Platform | 'all') => { setActiveFilter(f); setActivePage(0); };
  const handleResultsFilter = (f: Platform | 'all') => { setResultsFilter(f); setResultsPage(0); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground animate-pulse">Cargando posts…</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No se encontraron posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-1">
        <Button
          size="sm"
          variant={subTab === 'results' ? 'secondary' : 'outline'}
          className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
          onClick={() => setSubTab('results')}
        >
          <Check className="h-2.5 w-2.5" />
          Resultados ({resultsPosts.length})
        </Button>
        <Button
          size="sm"
          variant={subTab === 'active' ? 'secondary' : 'outline'}
          className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
          onClick={() => setSubTab('active')}
        >
          <Clock className="h-2.5 w-2.5" />
          Posts ({activePosts.length})
        </Button>
        <Button
          size="sm"
          variant={subTab === 'expired' ? 'secondary' : 'outline'}
          className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
          onClick={() => setSubTab('expired')}
        >
          <Trophy className="h-2.5 w-2.5" />
          Participaciones
        </Button>
      </div>

      {/* Results tab — posts between 61-120h with participation breakdown */}
      {subTab === 'results' && (
        <div className="space-y-3">
          {/* Animated banner */}
          {resultsPosts.length > 0 && (
            <div className="animate-fade-in rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 overflow-hidden">
              <p className="text-[12px] font-semibold text-emerald-600 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                📊 ¡{resultsPosts.length} posts con resultados!
              </p>
              <div className="mt-1 flex whitespace-nowrap overflow-hidden">
                <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8">
                  {(() => {
                    const total = rootMember.children.length + 1;
                    if (total <= 2) return `¡Buen inicio! Invita a más personas a tu red para mejorar tus resultados 🌱 — Cada miembro nuevo suma fuerza a tu red 💪🚀`;
                    if (total <= 5) return `¡Tu red va creciendo! ${total} miembros sumando comentarios 🎉 — Sigue invitando para multiplicar el impacto de tu red 🔥✨`;
                    return `¡Felicidades! Tu red de ${total} miembros está activa 🏆 — Sigan así y anima a todos a comentar para dominar los resultados 💬🚀`;
                  })()}
                </p>
                <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8" aria-hidden>
                  {(() => {
                    const total = rootMember.children.length + 1;
                    if (total <= 2) return `¡Buen inicio! Invita a más personas a tu red para mejorar tus resultados 🌱 — Cada miembro nuevo suma fuerza a tu red 💪🚀`;
                    if (total <= 5) return `¡Tu red va creciendo! ${total} miembros sumando comentarios 🎉 — Sigue invitando para multiplicar el impacto de tu red 🔥✨`;
                    return `¡Felicidades! Tu red de ${total} miembros está activa 🏆 — Sigan así y anima a todos a comentar para dominar los resultados 💬🚀`;
                  })()}
                </p>
              </div>
            </div>
          )}
          <PlatformFilters posts={resultsPosts} activeFilter={resultsFilter} onFilter={handleResultsFilter} />
          {filteredResults.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No hay posts con resultados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagedResults.map(post => (
                <ResultsPostCard
                  key={`${post.platform}-${post.post_id}`}
                  post={post}
                  rootMember={rootMember}
                  allNetworkMembers={isAdminUser ? allNetworkMembers : undefined}
                />
              ))}
            </div>
          )}
          <Pagination page={resultsPage} totalPages={resultsTotalPages} onPageChange={setResultsPage} />
        </div>
      )}

      {/* Active tab */}
      {subTab === 'active' && (
        <div className="space-y-3">
          {/* Animated banner */}
          {activePosts.length > 0 && (
            <div className="animate-fade-in rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 overflow-hidden">
              <p className="text-[12px] font-semibold text-amber-600 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                🔥 ¡Hay {activePosts.length} posts nuevos!
              </p>
              <div className="mt-1 flex whitespace-nowrap">
                <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8">
                  Comenta en ellos y anima a tu red a participar 💬✨ — ⏳ 60 horas es tu límite, comenta a tiempo y suma puntos para tu red 🚀
                </p>
                <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8" aria-hidden>
                  Comenta en ellos y anima a tu red a participar 💬✨ — ⏳ 60 horas es tu límite, comenta a tiempo y suma puntos para tu red 🚀
                </p>
              </div>
            </div>
          )}
          <PlatformFilters posts={activePosts} activeFilter={activeFilter} onFilter={handleActiveFilter} />
          {filteredActive.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No hay posts nuevos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagedActive.map(post => (
                <ActivePostCard key={`${post.platform}-${post.post_id}`} post={post} />
              ))}
            </div>
          )}
          <Pagination page={activePage} totalPages={activePages} onPageChange={setActivePage} />
        </div>
      )}

      {/* Expired tab — participation summary for posts >120h */}
      {subTab === 'expired' && (
        <div className="space-y-3">
          {/* Animated banner */}
          <div className="animate-fade-in rounded-lg border border-primary/30 bg-primary/5 p-3 overflow-hidden">
            <p className="text-[12px] font-semibold text-primary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              🏆 Historial de participación
            </p>
            <div className="flex whitespace-nowrap overflow-hidden">
              <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8">
                📋 Aquí puedes ver el total de comentarios que ha hecho tu red en las publicaciones desde que se unieron — Revisa quién participa más y motiva a los demás 💬🔍
              </p>
              <p className="text-[10px] text-muted-foreground animate-marquee shrink-0 pr-8" aria-hidden>
                📋 Aquí puedes ver el total de comentarios que ha hecho tu red en las publicaciones desde que se unieron — Revisa quién participa más y motiva a los demás 💬🔍
              </p>
            </div>
          </div>
          <ParticipationTableView
            expiredPosts={expiredPosts}
            rootMember={rootMember}
            members={isAdminUser ? allNetworkMembers : directInvites}
            commentsData={commentsData}
          />
        </div>
      )}
    </div>
  );
}
