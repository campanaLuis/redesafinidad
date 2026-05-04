import { useMemo, useState } from "react";
import { NetworkMemberWithChildren, NetworkMember, SocialPost, CommentsDataMap } from "@/types/network";
import { Twitter, Instagram, Facebook, Check, X, ChevronUp, ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const PLATFORMS: { key: Platform; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'twitter', label: 'X', icon: Twitter, color: 'text-sky-500' },
  { key: 'instagram', label: 'IG', icon: Instagram, color: 'text-pink-500' },
  { key: 'facebook', label: 'FB', icon: Facebook, color: 'text-blue-600' },
  { key: 'tiktok', label: 'TK', icon: TikTokIcon, color: 'text-foreground' },
];

type SortKey = 'total' | Platform;
type SortDir = 'desc' | 'asc';

interface MemberRow {
  id: number;
  nombre: string;
  isRoot: boolean;
  totalCommented: number;
  totalPosts: number;
  byPlatform: { platform: Platform; commented: number; total: number }[];
  pct: number;
}

interface ParticipationTableViewProps {
  expiredPosts: SocialPost[];
  rootMember: NetworkMemberWithChildren;
  members: NetworkMember[];
  commentsData: CommentsDataMap;
}

export function ParticipationTableView({ expiredPosts, rootMember, members, commentsData }: ParticipationTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const rows = useMemo(() => {
    function getPostsForMember(joinDate: string) {
      const joined = new Date(joinDate);
      return expiredPosts.filter(p => new Date(p.posted_date) >= joined);
    }

    function buildRow(member: NetworkMember, isRoot: boolean): MemberRow {
      const memberPosts = getPostsForMember(member.created_at);
      const memberByPlatform: Record<Platform, number> = { twitter: 0, instagram: 0, facebook: 0, tiktok: 0 };
      for (const p of memberPosts) memberByPlatform[p.platform]++;
      const totalMemberPosts = memberPosts.length;

      const summaries = commentsData.get(String(member.id)) ?? [];
      let totalCommented = 0;
      const byPlatform: { platform: Platform; commented: number; total: number }[] = [];
      for (const plat of PLATFORMS) {
        const s = summaries.find(x => x.platform === plat.key);
        const commented = s ? Math.min(s.total, memberByPlatform[plat.key]) : 0;
        totalCommented += commented;
        byPlatform.push({ platform: plat.key, commented, total: memberByPlatform[plat.key] });
      }
      const pct = totalMemberPosts > 0 ? Math.round((totalCommented / totalMemberPosts) * 100) : 0;
      return { id: member.id, nombre: member.nombre, isRoot, totalCommented, totalPosts: totalMemberPosts, byPlatform, pct };
    }

    const allRows: MemberRow[] = [buildRow(rootMember, true)];
    const seen = new Set<number>([rootMember.id]);
    for (const m of members) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      allRows.push(buildRow(m, false));
    }
    return allRows;
  }, [expiredPosts, rootMember, members, commentsData]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortKey === 'total') {
        aVal = a.totalCommented;
        bVal = b.totalCommented;
      } else {
        aVal = a.byPlatform.find(p => p.platform === sortKey)?.commented ?? 0;
        bVal = b.byPlatform.find(p => p.platform === sortKey)?.commented ?? 0;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pagedRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  }

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ChevronDown className="h-2.5 w-2.5 opacity-30" />;
    return dir === 'desc' ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />;
  };

  if (expiredPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">No hay participaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground px-1">
        {expiredPosts.length} posts · {rows.length} miembros
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(5,36px)] bg-muted/50 border-b border-border/30">
          <div className="px-2 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase">Nombre</div>
          {PLATFORMS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => handleSort(p.key)}
                className="flex items-center justify-center gap-0.5 py-1.5 text-[9px] font-semibold hover:bg-muted/80 transition-colors"
              >
                <Icon className={cn("h-3 w-3", p.color)} />
                <SortIcon active={sortKey === p.key} dir={sortDir} />
              </button>
            );
          })}
          <button
            onClick={() => handleSort('total')}
            className="flex items-center justify-center gap-0.5 py-1.5 text-[8px] font-bold text-foreground hover:bg-muted/80 transition-colors"
          >
            Total
            <SortIcon active={sortKey === 'total'} dir={sortDir} />
          </button>
        </div>

        {/* Rows */}
        {pagedRows.map((row, idx) => (
          <div
            key={row.id}
            className={cn(
              "grid grid-cols-[1fr_repeat(5,36px)] items-center",
              idx % 2 === 0 ? 'bg-card' : 'bg-muted/20',
              row.isRoot && 'bg-primary/5 border-l-2 border-l-primary'
            )}
          >
            <div className="px-2 py-1.5 min-w-0">
              <span className={cn("text-[10px] truncate block", row.isRoot ? 'font-bold text-primary' : 'text-foreground')}>
                {row.isRoot ? `Yo` : row.nombre}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] text-muted-foreground">{row.pct}%</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className={cn("h-full rounded-full", row.pct >= 70 ? 'bg-emerald-500' : row.pct >= 40 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            </div>
            {row.byPlatform.map(bp => (
              <div key={bp.platform} className="text-center py-1.5">
                <span className="text-[10px] font-medium text-foreground">{bp.commented}</span>
                <span className="text-[8px] text-muted-foreground">/{bp.total}</span>
              </div>
            ))}
            <div className="text-center py-1.5">
              <span className="text-[10px] font-bold text-foreground">{row.totalCommented}</span>
              <span className="text-[8px] text-muted-foreground">/{row.totalPosts}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
          >
            Anterior
          </button>
          <span className="text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
