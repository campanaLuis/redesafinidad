import { useMemo, useRef, useEffect, useCallback } from "react";
import { NetworkMemberWithChildren, NetworkMember, NetworkSibling, CommentsDataMap } from "@/types/network";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Globe,
  Timer,
  PieChart,
  MessageSquare,
  Users,
  TrendingUp,
} from "lucide-react";

interface NetworkVersusViewProps {
  rootMember: NetworkMemberWithChildren;
  siblings: NetworkSibling[];
  allMembers: NetworkMember[];
  globalTotal: number;
  commentsData: CommentsDataMap;
}

export function NetworkVersusView({
  rootMember,
  siblings,
  allMembers,
  globalTotal,
  commentsData,
}: NetworkVersusViewProps) {
  const myDirectCount = parseInt(String(rootMember.direct_descendants_count || 0), 10);
  const myTotalCount = parseInt(String(rootMember.total_descendants_count || 0), 10);
  

  const data = useMemo(() => {
    const now = new Date();
    const joinedAt = new Date(rootMember.created_at);
    const daysInNetwork = Math.max(differenceInDays(now, joinedAt), 1);

    const filteredMembers = allMembers.filter((m) => m.hash_code !== "8hkozysa");

    const myLevel = rootMember.path.split(".").length;
    const levelPeers = filteredMembers.filter((m) =>
      m.path.split(".").length === myLevel && m.id !== rootMember.id
    );
    const peerDirects = levelPeers.map((m) => parseInt(String(m.direct_descendants_count || 0), 10));
    const allLevelDirects = [myDirectCount, ...peerDirects].sort((a, b) => b - a);
    const levelRank = allLevelDirects.indexOf(myDirectCount) + 1;
    const levelTotal = allLevelDirects.length;
    const top5Level = allLevelDirects.slice(0, 5);

    const peerTotals = levelPeers.map((m) => parseInt(String(m.total_descendants_count || 0), 10));
    const peerDays = levelPeers.map((m) => Math.max(differenceInDays(now, new Date(m.created_at)), 1));
    const peerFreqs = levelPeers.map((m, i) => {
      const dc = parseInt(String(m.direct_descendants_count || 0), 10);
      return dc > 0 ? peerDays[i] / dc : null;
    }).filter((f): f is number => f !== null);
    const myFreq = myDirectCount > 0 ? daysInNetwork / myDirectCount : null;
    const allFreqs = myFreq !== null ? [myFreq, ...peerFreqs] : peerFreqs;
    const levelAvgFreq = allFreqs.length > 0 ? allFreqs.reduce((a, b) => a + b, 0) / allFreqs.length : null;
    const globalSorted = [...filteredMembers]
      .map((m) => ({
        direct: parseInt(String(m.direct_descendants_count || 0), 10),
        total: parseInt(String(m.total_descendants_count || 0), 10),
        days: Math.max(differenceInDays(now, new Date(m.created_at)), 1),
      }))
      .sort((a, b) => b.direct - a.direct);

    const globalRank = globalSorted.findIndex((m) => m.direct <= myDirectCount) + 1;
    const number1 = globalSorted[0];
    const number1Freq = number1 && number1.direct > 0 ? (number1.days / number1.direct).toFixed(1) : null;
    const number1Contribution = number1 ? (((number1.total + 1) / globalTotal) * 100).toFixed(1) : null;

    const allLevelTotals = [myTotalCount, ...peerTotals];
    const levelAvgContribution = globalTotal > 0
      ? (allLevelTotals.reduce((a, b) => a + b, 0) / allLevelTotals.length + 1) / globalTotal * 100
      : 0;

    const myContribution = globalTotal > 0 ? ((myTotalCount + 1) / globalTotal) * 100 : 0;

    // --- Ranking timeline: approximate rank at key moments ---
    // We reconstruct rank at: join date, each direct invite date, and now
    const children = (rootMember as NetworkMemberWithChildren).children || [];
    const childDates = children
      .map(c => new Date(c.created_at))
      .sort((a, b) => a.getTime() - b.getTime());

    const timelinePoints: { date: Date; rank: number; directCount: number; totalMembers: number; label: string }[] = [];

    // At join time: 0 directs
    const joinRank = filteredMembers.filter(m => {
      const mJoined = new Date(m.created_at);
      return mJoined <= joinedAt && parseInt(String(m.direct_descendants_count || 0), 10) > 0;
    }).length + 1;
    const membersAtJoin = filteredMembers.filter(m => new Date(m.created_at) <= joinedAt).length;
    timelinePoints.push({ date: joinedAt, rank: membersAtJoin, directCount: 0, totalMembers: membersAtJoin, label: "Te uniste" });

    // Group children by day, then create one timeline point per day
    const childsByDay = new Map<string, { dates: Date[]; count: number }>();
    childDates.forEach((childDate) => {
      const dayKey = childDate.toISOString().slice(0, 10);
      const existing = childsByDay.get(dayKey);
      if (existing) {
        existing.count++;
        if (childDate > existing.dates[existing.dates.length - 1]) existing.dates.push(childDate);
      } else {
        childsByDay.set(dayKey, { dates: [childDate], count: 1 });
      }
    });

    let cumulativeDirects = 0;
    Array.from(childsByDay.entries()).forEach(([, { dates, count }]) => {
      cumulativeDirects += count;
      const lastDateOfDay = dates[dates.length - 1];
      const membersAtDate = filteredMembers.filter(m => new Date(m.created_at) <= lastDateOfDay);
      const betterCount = membersAtDate.filter(m => {
        const d = parseInt(String(m.direct_descendants_count || 0), 10);
        return d > cumulativeDirects && m.id !== rootMember.id;
      }).length;
      timelinePoints.push({
        date: lastDateOfDay,
        rank: betterCount + 1,
        directCount: cumulativeDirects,
        totalMembers: membersAtDate.length,
        label: `+${count} invitado${count > 1 ? 's' : ''}`,
      });
    });

    // Current
    timelinePoints.push({
      date: now,
      rank: globalSorted.findIndex((m) => m.direct <= myDirectCount) + 1,
      directCount: myDirectCount,
      totalMembers: filteredMembers.length,
      label: "Hoy",
    });

    const getCommentsTotal = (memberId: number): number => {
      const summaries = commentsData.get(String(memberId));
      if (!summaries) return 0;
      return summaries.reduce((acc, s) => acc + s.total, 0);
    };

    const myCommentsTotal = getCommentsTotal(rootMember.id);

    const levelPeerComments = levelPeers.map((m) => ({ id: m.id, total: getCommentsTotal(m.id) }));
    const allLevelComments = [{ id: rootMember.id, total: myCommentsTotal }, ...levelPeerComments].sort((a, b) => b.total - a.total);
    const levelCommentsRank = allLevelComments.findIndex(c => c.id === rootMember.id) + 1;

    const allGlobalComments = filteredMembers.map((m) => ({ id: m.id, total: getCommentsTotal(m.id) })).sort((a, b) => b.total - a.total);
    const globalCommentsTop = allGlobalComments[0];

    // Percentile calculation for motivational text
    const percentile = levelTotal > 0 ? Math.round(((levelTotal - levelRank) / levelTotal) * 100) : 0;
    const invitesToNextRank = levelRank > 1 ? allLevelDirects[levelRank - 2] - myDirectCount : 0;

    return {
      levelRank,
      levelTotal,
      top5Level,
      globalRank,
      globalTotal: filteredMembers.length,
      myFreq,
      levelAvgFreq,
      number1Freq,
      myContribution,
      levelAvgContribution,
      number1Contribution,
      myDirectCount,
      myLevel,
      myCommentsTotal,
      levelCommentsRank,
      levelCommentsTotal: allLevelComments.length,
      globalCommentsTop,
      percentile,
      invitesToNextRank,
      timelinePoints,
    };
  }, [rootMember, siblings, allMembers, globalTotal, myDirectCount, myTotalCount, commentsData]);

  // Motivational text
  const motivationalText = useMemo(() => {
    if (data.levelRank === 1) return "🏆 ¡Eres el #1 de tu nivel! Sigue invitando para mantener tu posición.";
    if (data.percentile >= 90) return `🔥 Estás en el top ${100 - data.percentile}% de tu nivel. ¡Ya casi llegas al #1!`;
    if (data.invitesToNextRank > 0 && data.invitesToNextRank <= 3) return `⚡ Te ${data.invitesToNextRank === 1 ? "falta" : "faltan"} ${data.invitesToNextRank} invitado${data.invitesToNextRank > 1 ? "s" : ""} para subir de ranking.`;
    if (data.percentile >= 50) return "📈 Vas por buen camino. ¡Un invitado más te acerca al top!";
    return "💪 Cada invitado cuenta. ¡Comparte tu link y sube en el ranking!";
  }, [data]);

  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      {/* Motivational Banner */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-center animate-fade-in">
        <p className="text-xs font-medium text-primary">{motivationalText}</p>
      </div>

      {/* Hero Ranking Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/70 p-4 text-primary-foreground shadow-md animate-scale-in">
        <div className="absolute top-2 right-2 opacity-10">
          <Trophy className="h-12 w-12" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center rounded-full bg-primary-foreground/20 h-14 w-14 backdrop-blur-sm">
            <span className="text-2xl font-black leading-none">#{data.globalRank}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Ranking Global</span>
            <span className="text-xs opacity-70">en toda la red</span>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-medium w-fit">
              <Globe className="h-3 w-3" />
              Nivel {data.myLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Stats: 2 columns */}
      <div className="grid grid-cols-2 gap-2">
        {/* Invitados Directos */}
        <div className="rounded-xl border bg-card p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Invitados</span>
          </div>
          <span className="text-2xl font-black text-foreground leading-tight">{data.myDirectCount}</span>
          <div className="flex gap-0.5 items-end h-[32px]">
            {data.top5Level.map((count, i) => {
              const isYou = count === myDirectCount && i === data.top5Level.indexOf(myDirectCount);
              const maxVal = Math.max(...data.top5Level, 1);
              const barH = Math.max((count / maxVal) * 100, 12);
              return (
                <div key={i} className="flex flex-col items-center flex-1 gap-0">
                  <div
                    className={cn(
                      "w-full rounded-sm",
                      isYou ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                    style={{ height: `${barH}%` }}
                  />
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-muted-foreground">Top 5 de tu nivel</span>
        </div>

        {/* Frecuencia */}
        <div className="rounded-xl border bg-card p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Frecuencia</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground leading-tight">
              {data.myFreq !== null ? data.myFreq.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">días</span>
          </div>
          <div className="flex flex-col gap-1 mt-auto">
            <FreqRow label="Prom. nivel" value={data.levelAvgFreq !== null ? `${data.levelAvgFreq.toFixed(1)}d` : "—"} isBetter={data.myFreq !== null && data.levelAvgFreq !== null && data.myFreq <= data.levelAvgFreq} />
            <FreqRow label="#1 global" value={data.number1Freq ? `${data.number1Freq}d` : "—"} isBetter={data.myFreq !== null && data.number1Freq !== null && data.myFreq <= parseFloat(data.number1Freq)} />
          </div>
        </div>
      </div>

      {/* Ranking Timeline */}
      {data.timelinePoints.length > 1 && (
        <TimelineSlider timelinePoints={data.timelinePoints} />
      )}
    </div>
  );
}

function TimelineSlider({ timelinePoints }: { timelinePoints: { date: Date; rank: number; directCount: number; totalMembers: number; label: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Auto-scroll to end (current ranking) on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  }, [timelinePoints]);

  // Mouse/touch drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - startX.current;
    scrollRef.current.scrollLeft = scrollLeft.current - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.releasePointerCapture(e.pointerId);
      scrollRef.current.style.cursor = 'grab';
    }
  }, []);

  return (
    <div className="rounded-lg border bg-card p-2 flex flex-col h-full">
      <div className="flex items-center gap-1 text-muted-foreground mb-1.5">
        <TrendingUp className="h-3 w-3" />
        <span className="text-[9px] font-medium uppercase tracking-wide">Tu ranking en el tiempo</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-x-auto -mx-1 px-1 pb-1 cursor-grab select-none touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-start gap-0 min-w-max">
          {timelinePoints.map((point, i) => {
            const isFirst = i === 0;
            const isLast = i === timelinePoints.length - 1;
            const prevRank = i > 0 ? timelinePoints[i - 1].rank : point.rank;
            const improved = point.rank < prevRank;
            const worsened = point.rank > prevRank;
            const dateStr = point.date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: isFirst || isLast ? "numeric" : undefined });

            return (
              <div key={i} className="flex flex-col items-center min-w-[64px] px-0.5">
                {/* Rank */}
                <div className="flex items-center gap-1 mb-1">
                  <span className={cn(
                    "text-sm font-black",
                    isLast ? "text-primary" : "text-foreground"
                  )}>
                    #{point.rank}
                  </span>
                  {!isFirst && (
                    <span className={cn(
                      "font-semibold",
                      improved ? "text-green-600" : worsened ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {improved ? <ArrowUp className="h-4 w-4" /> : worsened ? <ArrowDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </span>
                  )}
                </div>
                {/* Dot and line */}
                <div className="flex items-center w-full">
                  {!isFirst && <div className="h-px flex-1 bg-border" />}
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full border-2 shrink-0",
                    isLast ? "bg-primary border-primary" : "bg-card border-primary/50"
                  )} />
                  {!isLast && <div className="h-px flex-1 bg-border" />}
                </div>
                {/* Label and date */}
                <div className="flex flex-col items-center mt-1">
                  <span className={cn(
                    "text-[10px] font-semibold text-center",
                    isLast ? "text-primary" : point.label.startsWith("+") ? "text-green-600" : "text-foreground"
                  )}>
                    {point.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{dateStr}</span>
                  <span className="text-[8px] text-muted-foreground">/ {point.totalMembers}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FreqRow({ label, value, isBetter }: { label: string; value: string; isBetter?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-semibold",
        isBetter === true ? "text-green-600" : isBetter === false ? "text-red-500" : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}
