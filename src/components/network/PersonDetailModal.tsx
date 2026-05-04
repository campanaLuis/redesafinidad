import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NetworkMemberWithChildren, CommentsDataMap } from "@/types/network";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MapPin,
  Users,
  MessageCircle,
  Twitter,
  Instagram,
  Facebook,
  UserPlus,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useMemberSocialComments, type SocialPlatform } from "@/hooks/useMemberSocialComments";
import { cn } from "@/lib/utils";
import { getLevelColor } from "./levelColors";

interface PersonDetailModalProps {
  member: NetworkMemberWithChildren | null;
  isOpen: boolean;
  onClose: () => void;
  referrerName?: string | null;
  commentsData?: CommentsDataMap;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

const PLATFORMS = [
  { key: 'twitter' as const, icon: Twitter, label: 'Twitter', usernameField: 'twitter_username' as const },
  { key: 'instagram' as const, icon: Instagram, label: 'Instagram', usernameField: 'instagram_username' as const },
  { key: 'facebook' as const, icon: Facebook, label: 'Facebook', usernameField: 'facebook_username' as const },
  { key: 'tiktok' as const, icon: TikTokIcon, label: 'TikTok', usernameField: 'tiktok_username' as const },
];

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  twitter: "Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

function SentimentDistributionBar({
  positivo,
  negativo,
  neutro,
  total,
  loading,
}: {
  positivo: number;
  negativo: number;
  neutro: number;
  total: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="px-1 space-y-1.5">
        <p className="text-[10px] text-muted-foreground text-center">Distribución de sentimiento</p>
        <div className="h-2.5 w-full rounded-full bg-muted animate-pulse" />
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="px-1 space-y-1">
        <p className="text-[10px] text-muted-foreground text-center">Distribución de sentimiento</p>
        <p className="text-[10px] text-muted-foreground/80 text-center py-1">Sin comentarios para graficar</p>
      </div>
    );
  }
  const pPos = (positivo / total) * 100;
  const pNeg = (negativo / total) * 100;
  const pNeu = (neutro / total) * 100;
  return (
    <div className="px-1 space-y-1.5">
      <p className="text-[10px] text-muted-foreground text-center">Distribución de sentimiento</p>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted ring-1 ring-border/50">
        {pPos > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all min-w-[2px]"
            style={{ width: `${pPos}%` }}
            title={`Positivo ${Math.round(pPos)}%`}
          />
        )}
        {pNeg > 0 && (
          <div
            className="h-full bg-red-500 transition-all min-w-[2px]"
            style={{ width: `${pNeg}%` }}
            title={`Negativo ${Math.round(pNeg)}%`}
          />
        )}
        {pNeu > 0 && (
          <div
            className="h-full bg-slate-400 dark:bg-slate-500 transition-all min-w-[2px]"
            style={{ width: `${pNeu}%` }}
            title={`Neutro / otro ${Math.round(pNeu)}%`}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
          Pos. {Math.round(pPos)}%
        </span>
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 align-middle" />
          Neg. {Math.round(pNeg)}%
        </span>
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mr-1 align-middle" />
          Neutro {Math.round(pNeu)}%
        </span>
      </div>
    </div>
  );
}

function SentimentBadge({ sentimiento }: { sentimiento: string }) {
  const t = (sentimiento || "").toLowerCase();
  if (t === "positivo") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        Positivo
      </span>
    );
  }
  if (t === "negativo") {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-700 dark:text-red-400">
        Negativo
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
      {sentimiento || "Neutro"}
    </span>
  );
}

export function PersonDetailModal({ member, isOpen, onClose, referrerName, commentsData }: PersonDetailModalProps) {
  const { hashCode: viewerHashCode } = useParams<{ hashCode: string }>();
  const [showInvites, setShowInvites] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitePage, setInvitePage] = useState(0);
  const INVITE_PAGE_SIZE = 10;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentPlatformFilter, setCommentPlatformFilter] = useState<"all" | SocialPlatform>("all");

  const { data: socialDetail, isLoading: loadingSocialDetail } = useMemberSocialComments(member, isOpen);

  useEffect(() => {
    if (!isOpen) {
      setCommentsOpen(false);
      setCommentPlatformFilter("all");
    }
  }, [isOpen]);

  const sentimentCounts = useMemo(() => {
    const list = socialDetail?.list ?? [];
    let positivo = 0;
    let negativo = 0;
    let neutro = 0;
    for (const c of list) {
      const t = (c.sentimiento || "").toLowerCase();
      if (t === "positivo") positivo++;
      else if (t === "negativo") negativo++;
      else neutro++;
    }
    return {
      positivo,
      negativo,
      neutro,
      total: list.length,
    };
  }, [socialDetail?.list]);

  const filteredCommentList = useMemo(() => {
    const list = socialDetail?.list ?? [];
    if (commentPlatformFilter === "all") return list;
    return list.filter((row) => row.platform === commentPlatformFilter);
  }, [socialDetail?.list, commentPlatformFilter]);

  if (!member) return null;

  const initials = member.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const directCount = member.direct_descendants_count || 0;
  const totalCount = member.total_descendants_count || 0;
  const indirectCount = totalCount - directCount;

  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysSinceLastInvite = (() => {
    if (member.children.length > 0) {
      const latestChild = member.children.reduce((latest, child) => {
        const childDate = new Date(child.created_at);
        const latestDate = new Date(latest.created_at);
        return childDate > latestDate ? child : latest;
      });
      return Math.floor(
        (Date.now() - new Date(latestChild.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  })();

  const hasLocation = member.codigopostal || member.colonia;

  // Invitees social participation summary
  const inviteesSocialSummary = (() => {
    if (!commentsData || member.children.length === 0) return null;
    const summary = PLATFORMS.map(({ key, usernameField, label }) => {
      let registered = 0;
      let withComments = 0;
      let totalComments = 0;
      member.children.forEach(child => {
        if (child[usernameField]) {
          registered++;
          const childSummaries = commentsData.get(String(child.id));
          const platformData = childSummaries?.find(s => s.platform === key);
          if (platformData && platformData.total > 0) {
            withComments++;
            totalComments += platformData.total;
          }
        }
      });
      return { key, label, registered, withComments, totalComments };
    });
    return summary;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl rounded-xl p-4 sm:p-6 max-h-[90vh] overflow-x-hidden flex flex-col gap-0">
        <DialogHeader className="items-center text-center sm:pb-2">
          <Avatar className="h-16 w-16 mb-2 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={member.selfie_url || undefined} alt={member.nombre} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="text-base">{member.nombre}</DialogTitle>
          {viewerHashCode === '8hkozysa' && member.hash_code && (
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.hash_code}</p>
          )}
        </DialogHeader>

        <div className="space-y-3 mt-2 overflow-y-auto min-h-0 flex-1">
          {/* Redes sociales del usuario */}
          <div className="flex items-center justify-center gap-3 p-2.5 rounded-lg bg-muted/50 flex-wrap">
            {PLATFORMS.map(({ key, icon: Icon, label, usernameField }) => {
              const hasUsername = !!member[usernameField];
              const fromDetail = socialDetail?.totals[key as SocialPlatform];
              const summaries = commentsData?.get(String(member.id));
              const platformSummary = summaries?.find((s) => s.platform === key);
              const count =
                fromDetail !== undefined ? fromDetail : platformSummary?.total ?? 0;

              if (!hasUsername) {
                return (
                  <div key={key} className="flex items-center gap-0.5 text-muted-foreground/40" title={`${label}: no registrado`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">N/R</span>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold",
                    loadingSocialDetail ? "text-muted-foreground" : count > 0 ? "text-emerald-500" : "text-red-500",
                  )}
                  title={`${label}: ${count} comentarios`}
                >
                  <Icon className="h-4 w-4" />
                  {loadingSocialDetail ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{count}</span>}
                </div>
              );
            })}
          </div>

          {/* Distribución de sentimiento (todos los comentarios del usuario) */}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-2.5">
            <SentimentDistributionBar
              positivo={sentimentCounts.positivo}
              negativo={sentimentCounts.negativo}
              neutro={sentimentCounts.neutro}
              total={sentimentCounts.total}
              loading={loadingSocialDetail}
            />
          </div>

          {/* Días de actividad */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 flex-1">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">En la red</p>
                <p className="text-sm font-medium">{daysSinceJoined} días</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-1.5 flex-1">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Sin invitar</p>
                <p className="text-sm font-medium">
                  {daysSinceLastInvite !== null ? `${daysSinceLastInvite} días` : 'Sin invitados'}
                </p>
              </div>
            </div>
          </div>

          {/* Teléfono */}
          {member.telefono && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.telefono}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                  <a href={`tel:${member.telefono}`}>
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                  <a 
                    href={`https://wa.me/52${member.telefono}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Invitado por */}
          {referrerName && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Invitado por</p>
                <p className="text-sm font-medium truncate">{referrerName}</p>
              </div>
            </div>
          )}

          {/* Ubicación */}
          {hasLocation && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                {member.codigopostal && (
                  <p className="text-sm font-medium">CP: {member.codigopostal}</p>
                )}
                {member.colonia && (
                  <p className="text-xs text-muted-foreground truncate">{member.colonia}</p>
                )}
              </div>
            </div>
          )}

          {/* Estadísticas de red + listado de invitados */}
          <div className="p-2.5 rounded-lg bg-muted/50">
            <button
              onClick={() => { if (member.children.length > 0) { setShowInvites(!showInvites); setInvitePage(0); setInviteSearch(""); } }}
              className={cn("flex items-center gap-2 w-full text-left", member.children.length > 0 && "cursor-pointer")}
            >
              {member.children.length > 0 ? (
                showInvites ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : null}
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{directCount}</span> directos
                  {indirectCount > 0 && (
                    <> • <span className="font-medium">{indirectCount}</span> indirectos</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total en su red: {totalCount}
                </p>
              </div>
            </button>
              {showInvites && (() => {
                const filtered = member.children
                  .filter(c => c.nombre.toLowerCase().includes(inviteSearch.toLowerCase()))
                  .sort((a, b) => (b.direct_descendants_count || 0) - (a.direct_descendants_count || 0));
                const maxInvites = Math.max(...member.children.map(c => c.direct_descendants_count || 0), 1);
                const allDays = member.children.map(c => {
                  const last = c.children.length > 0
                    ? Math.max(...c.children.map(gc => new Date(gc.created_at).getTime()))
                    : new Date(c.created_at).getTime();
                  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
                });
                const maxDays = Math.max(...allDays, 1);
                const totalInvPages = Math.max(1, Math.ceil(filtered.length / INVITE_PAGE_SIZE));
                const paged = filtered.slice(invitePage * INVITE_PAGE_SIZE, (invitePage + 1) * INVITE_PAGE_SIZE);
                return (
                  <div className="mt-2">
                    {/* Search */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={inviteSearch}
                        onChange={(e) => { setInviteSearch(e.target.value); setInvitePage(0); }}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    {/* List */}
                    <div className="space-y-1">
                      {paged.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-2">Sin resultados</p>
                      ) : paged.map((child) => {
                      const childInitials = child.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                        const invCount = child.direct_descendants_count || 0;
                        const lastInviteDate = child.children.length > 0
                          ? Math.max(...child.children.map(c => new Date(c.created_at).getTime()))
                          : new Date(child.created_at).getTime();
                        const daysNoInvite = Math.floor((Date.now() - lastInviteDate) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={child.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-background/50">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={child.selfie_url || undefined} alt={child.nombre} />
                              <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                                {childInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{child.nombre}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span style={{ color: `hsl(${Math.round((invCount / maxInvites) * 120)}, 70%, ${invCount === 0 ? '30%' : '40%'})` }} className="font-semibold">
                                  {invCount} inv.
                                </span>
                                <span className="text-muted-foreground">·</span>
                                <span style={{ color: `hsl(${Math.round(Math.max(0, 120 - (daysNoInvite / maxDays) * 120))}, 70%, ${daysNoInvite === 0 ? '40%' : '30%'})` }} className="font-semibold">
                                  {daysNoInvite}d sin invitar
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {child.telefono ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" asChild>
                                    <a href={`https://wa.me/52${child.telefono}`} target="_blank" rel="noopener noreferrer">
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" asChild>
                                    <a href={`tel:${child.telefono}`}>
                                      <Phone className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                </>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">Sin tel.</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Pagination */}
                    {totalInvPages > 1 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <button
                          onClick={() => setInvitePage(p => Math.max(0, p - 1))}
                          disabled={invitePage === 0}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
                        </button>
                        <span className="text-[10px] text-muted-foreground">{invitePage + 1} / {totalInvPages}</span>
                        <button
                          onClick={() => setInvitePage(p => Math.min(totalInvPages - 1, p + 1))}
                          disabled={invitePage >= totalInvPages - 1}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>

          {/* Comentarios en publicaciones (colapsable, debajo del desglose de invitados) */}
          <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen}>
            <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left p-2.5 hover:bg-muted/50 transition-colors"
                >
                  {commentsOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Comentarios en publicaciones</p>
                    <p className="text-xs text-muted-foreground">
                      {loadingSocialDetail
                        ? "Cargando…"
                        : socialDetail
                          ? `${socialDetail.list.length} comentario${socialDetail.list.length === 1 ? "" : "s"} en posts`
                          : "—"}
                    </p>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2.5 pb-3 pt-0 space-y-3 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                    <span className="text-[11px] text-muted-foreground shrink-0">Filtrar por red</span>
                    <Select
                      value={commentPlatformFilter}
                      onValueChange={(v) => setCommentPlatformFilter(v as "all" | SocialPlatform)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full sm:max-w-[220px]">
                        <SelectValue placeholder="Red social" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las redes</SelectItem>
                        {PLATFORMS.map(({ key, label }) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {loadingSocialDetail && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando comentarios…
                    </div>
                  )}
                  {!loadingSocialDetail && socialDetail && socialDetail.list.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin comentarios registrados en estas redes.</p>
                  )}
                  {!loadingSocialDetail && socialDetail && socialDetail.list.length > 0 && filteredCommentList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Ningún comentario en la red seleccionada.</p>
                  )}
                  {!loadingSocialDetail && filteredCommentList.length > 0 && (
                    <ul className="space-y-3 max-h-[min(320px,40vh)] overflow-y-auto pr-1">
                      {filteredCommentList.map((row, idx) => (
                        <li
                          key={`${row.platform}-${row.post_id}-${idx}`}
                          className="rounded-md border border-border/80 bg-background/80 p-2.5 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                                {PLATFORM_LABEL[row.platform]}
                              </span>
                              <SentimentBadge sentimiento={row.sentimiento} />
                            </div>
                            {row.postUrl ? (
                              <Button size="sm" variant="outline" className="h-7 shrink-0 text-[10px] gap-1 px-2" asChild>
                                <a href={row.postUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                  Ver post
                                </a>
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sin URL</span>
                            )}
                          </div>
                          {row.captionPreview && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 italic">Post: {row.captionPreview}</p>
                          )}
                          <p className="text-xs text-foreground leading-snug break-words">{row.comentario}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Participación en redes de invitados directos */}
          {inviteesSocialSummary && member.children.length > 0 && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Redes sociales de sus {member.children.length} invitados
              </p>
              <div className="space-y-1.5">
                    {inviteesSocialSummary.map(({ key, label, registered, withComments, totalComments }) => {
                      const Icon = PLATFORMS.find(p => p.key === key)!.icon;
                      const pctRegistered = member.children.length > 0 ? Math.round((registered / member.children.length) * 100) : 0;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            registered === 0 ? "text-muted-foreground/40" : withComments > 0 ? "text-emerald-500" : "text-red-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              {registered === 0 ? (
                                <span className="text-muted-foreground/50 text-[10px]">Sin registros</span>
                              ) : (
                                <span className="font-medium">
                                  <span className={cn(withComments > 0 ? "text-emerald-500" : "text-red-500")}>
                                    {withComments}/{registered}
                                  </span>
                                  <span className="text-muted-foreground ml-1">
                                    ({totalComments} com.)
                                  </span>
                                  <span className="text-muted-foreground ml-1 text-[10px]">
                                    · {pctRegistered}% reg.
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
