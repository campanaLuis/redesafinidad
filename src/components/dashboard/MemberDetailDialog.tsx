import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NetworkMember, UserCommentsSummary } from "@/types/network";
import { cn } from "@/lib/utils";
import { differenceInYears, isValid, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Twitter,
  UserPlus,
  Users,
} from "lucide-react";

function TikTokBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

const PLATFORMS: UserCommentsSummary["platform"][] = ["twitter", "instagram", "facebook", "tiktok"];

const PLATFORM_META: Record<
  UserCommentsSummary["platform"],
  { label: string; Icon: ComponentType<{ className?: string }> }
> = {
  twitter: { label: "Twitter / X", Icon: Twitter },
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  tiktok: { label: "TikTok", Icon: TikTokBrandIcon },
};

function displayFullName(m: NetworkMember): string {
  const parts = [m.nombre?.trim(), m.apellidos?.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function getInitials(m: NetworkMember): string {
  const source = displayFullName(m);
  if (source === "—") return "--";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAgeFromBirthDate(m: NetworkMember): string {
  const raw = m.fecha_nacimiento ?? m.fechadenacimiento;
  if (!raw || typeof raw !== "string" || !raw.trim()) return "—";
  const value = raw.trim();
  let d = parseISO(value);
  if (!isValid(d)) {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      d = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      d = new Date(value);
    }
  }
  if (!isValid(d)) return "—";
  if (
    d.getFullYear() <= 1900 ||
    d.getMonth() < 0 ||
    d.getMonth() > 11 ||
    d.getDate() < 1 ||
    d.getDate() > 31
  ) {
    return "—";
  }
  const years = differenceInYears(new Date(), d);
  if (years < 0 || years >= 130) return "—";
  return `${years} años`;
}

function displayTelefono(m: NetworkMember): string {
  if (m.telefono == null || m.telefono === "") return "Sin teléfono";
  return String(m.telefono).trim() || "Sin teléfono";
}

function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function getHandle(m: NetworkMember, platform: UserCommentsSummary["platform"]): string {
  switch (platform) {
    case "twitter":
      return String(m.twitter_username ?? "").trim();
    case "instagram":
      return String(m.instagram_username ?? "").trim();
    case "facebook":
      return String(m.facebook_username ?? "").trim();
    case "tiktok":
      return String(m.tiktok_username ?? "").trim();
    default:
      return "";
  }
}

function mergePlatformSummaries(summaries: UserCommentsSummary[] | undefined): UserCommentsSummary[] {
  const map = new Map(summaries?.map((s) => [s.platform, s]) ?? []);
  return PLATFORMS.map(
    (p) =>
      map.get(p) ?? {
        platform: p,
        total: 0,
        positivo: 0,
        negativo: 0,
        neutro: 0,
      },
  );
}

function getDaysSince(dateLike: string | null | undefined): number | null {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (!isValid(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function SentimentDistributionBar({
  positivo,
  neutro,
  negativo,
  total,
  loading,
}: {
  positivo: number;
  neutro: number;
  negativo: number;
  total: number;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-2.5 w-full rounded-full" />;
  }
  if (total <= 0) {
    return <p className="text-[10px] text-muted-foreground">Sin comentarios para calcular sentimiento</p>;
  }

  const posPct = (positivo / total) * 100;
  const neuPct = (neutro / total) * 100;
  const negPct = (negativo / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/50 ring-1 ring-border/40">
        {posPct > 0 && <div className="h-full bg-emerald-500" style={{ width: `${posPct}%` }} />}
        {neuPct > 0 && <div className="h-full bg-slate-400" style={{ width: `${neuPct}%` }} />}
        {negPct > 0 && <div className="h-full bg-red-500" style={{ width: `${negPct}%` }} />}
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>Pos. {Math.round(posPct)}%</span>
        <span>Neu. {Math.round(neuPct)}%</span>
        <span>Neg. {Math.round(negPct)}%</span>
      </div>
    </div>
  );
}

function InfoCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl bg-muted/35 px-4 py-3", className)}>{children}</div>;
}

type Props = {
  member: NetworkMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentSummaries?: UserCommentsSummary[];
  commentsLoading?: boolean;
  commentsError?: boolean;
  allMembers?: NetworkMember[];
};

export function MemberDetailDialog({
  member,
  open,
  onOpenChange,
  commentSummaries,
  commentsLoading = false,
  commentsError = false,
  allMembers = [],
}: Props) {
  const rows = mergePlatformSummaries(commentSummaries);

  const derived = useMemo(() => {
    if (!member) {
      return {
        referrerName: null as string | null,
        daysInNetwork: null as number | null,
        daysSinceLastInvite: null as number | null,
        directInviteCount: 0,
        totalNetworkCount: 0,
        sentiment: { positivo: 0, neutro: 0, negativo: 0, total: 0 },
      };
    }

    const directChildren = allMembers.filter((row) => Number.parseInt(String(row.refiereid ?? ""), 10) === member.id);
    const latestDirectInvite = directChildren.reduce<string | null>((latest, child) => {
      if (!latest) return child.created_at;
      return new Date(child.created_at).getTime() > new Date(latest).getTime() ? child.created_at : latest;
    }, null);

    return {
      referrerName: member.refiereid
        ? allMembers.find((row) => row.id === Number.parseInt(String(member.refiereid), 10))?.nombre ?? null
        : null,
      daysInNetwork: getDaysSince(member.created_at),
      daysSinceLastInvite: getDaysSince(latestDirectInvite),
      directInviteCount: directChildren.length || (member.direct_descendants_count ?? 0),
      totalNetworkCount: member.total_descendants_count ?? 0,
      sentiment: rows.reduce(
        (acc, row) => ({
          positivo: acc.positivo + row.positivo,
          neutro: acc.neutro + row.neutro,
          negativo: acc.negativo + row.negativo,
          total: acc.total + row.total,
        }),
        { positivo: 0, neutro: 0, negativo: 0, total: 0 },
      ),
    };
  }, [allMembers, member, rows]);

  if (!member) return null;

  const phone = displayTelefono(member);
  const phoneDigits = getPhoneDigits(phone);
  const hasPhone = phone !== "Sin teléfono" && phoneDigits.length >= 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[440px] overflow-hidden rounded-[30px] border-2 border-border/70 p-5 shadow-xl">
        <DialogHeader className="items-center text-center gap-2">
          <Avatar className="h-20 w-20 ring-2 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={member.selfie_url || undefined} alt={displayFullName(member)} />
            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
              {getInitials(member)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <DialogTitle className="pr-8 text-center text-[17px] leading-tight">{displayFullName(member)}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Edad {getAgeFromBirthDate(member)}
              <span className="mx-1.5">·</span>
              ID {member.id}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <InfoCard className="py-3">
            <div className="flex items-center justify-center gap-4 text-sm sm:gap-5">
              {rows.map((row) => {
                const meta = PLATFORM_META[row.platform];
                const Icon = meta.Icon;
                const registered = Boolean(getHandle(member, row.platform));
                return (
                  <div key={row.platform} className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        registered ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                    <span className="tabular-nums text-base font-semibold text-foreground">
                      {commentsLoading ? "..." : row.total.toLocaleString("es-MX")}
                    </span>
                  </div>
                );
              })}
            </div>
          </InfoCard>

          <InfoCard>
            <p className="mb-2 text-center text-[10px] font-medium text-muted-foreground">
              Distribución de sentimiento de sus comentarios
            </p>
            {commentsError ? (
              <p className="text-center text-[10px] text-destructive">No se pudieron cargar los comentarios</p>
            ) : (
              <SentimentDistributionBar
                positivo={derived.sentiment.positivo}
                neutro={derived.sentiment.neutro}
                negativo={derived.sentiment.negativo}
                total={derived.sentiment.total}
                loading={commentsLoading}
              />
            )}
          </InfoCard>

          <InfoCard className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">En la red</p>
                <p className="text-sm font-semibold text-foreground">
                  {derived.daysInNetwork != null ? `${derived.daysInNetwork} días` : "Sin dato"}
                </p>
              </div>
            </div>
            <div className="border-l border-border/70 pl-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Sin invitar</p>
                  <p className="text-sm font-semibold text-foreground">
                    {derived.daysSinceLastInvite != null ? `${derived.daysSinceLastInvite} días` : "Sin invitados"}
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard className="flex items-center gap-3">
            <Phone className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">{phone}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="h-11 w-11 rounded-full" asChild>
                {hasPhone ? (
                  <a href={`tel:${phoneDigits}`} aria-label="Llamar">
                    <Phone className="h-4 w-4" />
                  </a>
                ) : (
                  <span aria-hidden>
                    <Phone className="h-4 w-4" />
                  </span>
                )}
              </Button>
              <Button size="icon" variant="outline" className="h-11 w-11 rounded-full" asChild>
                {hasPhone ? (
                  <a href={`https://wa.me/52${phoneDigits}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                ) : (
                  <span aria-hidden>
                    <MessageCircle className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </InfoCard>

          <InfoCard className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Invitado por</p>
              <p className="truncate text-[15px] font-semibold text-foreground">
                {derived.referrerName || "Sin invitador"}
              </p>
            </div>
          </InfoCard>

          <InfoCard className="flex items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">
                CP: {member.codigopostal != null ? String(member.codigopostal) : "—"}
              </p>
              <p className="truncate text-sm text-slate-500">{member.colonia?.trim() || "Sin colonia"}</p>
            </div>
          </InfoCard>

          <InfoCard className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-[15px] text-foreground">
                <span className="font-semibold">{derived.directInviteCount.toLocaleString("es-MX")}</span> directos
              </p>
              <p className="text-sm text-slate-500">
                Total en su red: {derived.totalNetworkCount.toLocaleString("es-MX")}
              </p>
            </div>
          </InfoCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
