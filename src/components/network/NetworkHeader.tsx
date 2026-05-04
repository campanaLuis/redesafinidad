import { Network, Users, UserPlus, UsersRound, Percent, Calendar, Clock, Share2, Twitter, Instagram, Facebook, Link, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NetworkMember, CommentsDataMap } from "@/types/network";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

function extractWaLink(waMessage: string): string | null {
  const match = waMessage.match(/(https:\/\/wa\.me\/\S+)/);
  return match ? match[1] : null;
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

interface NetworkHeaderProps {
  memberName: string;
  directCount: number;
  indirectCount: number;
  totalNetwork: number;
  globalTotal: number;
  joinDate?: string;
  latestJoinDate?: string | null;
  rootMember?: NetworkMember;
  commentsData?: CommentsDataMap;
  referrerName?: string | null;
}

export function NetworkHeader({ 
  memberName, 
  directCount, 
  indirectCount, 
  totalNetwork,
  globalTotal,
  joinDate,
  latestJoinDate,
  rootMember,
  commentsData,
  referrerName,
}: NetworkHeaderProps) {
  // Calculate percentage (user + all descendants) / global total
  const percentage = globalTotal > 0 
    ? Math.round((totalNetwork / globalTotal) * 100 * 10) / 10 
    : 0;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
      <div className="max-w-md mx-auto">
        {/* Top row: Name and icon */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-base text-foreground">Redes de Afinidad LN</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {memberName}
            </p>
            {referrerName && (
              <p className="text-[10px] text-muted-foreground">
                Me invitó: <span className="font-medium text-foreground">{referrerName}</span>
              </p>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 animate-invite-glow rounded-full">
                <Share2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <button
                className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  const link = rootMember?.wa_message;
                  if (!link) {
                    toast({ title: "Sin enlace", description: "No tienes enlace de invitación configurado", variant: "destructive" });
                    return;
                  }
                  navigator.clipboard.writeText(link);
                  toast({ title: "Enlace copiado", description: "Tu enlace de invitación ha sido copiado al portapapeles" });
                }}
              >
                <Link className="h-4 w-4" />
                Copiar enlace
              </button>
              <button
                className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  const msg = rootMember?.wa_message;
                  if (!msg) {
                    toast({ title: "Sin enlace", description: "No tienes enlace de invitación configurado", variant: "destructive" });
                    return;
                  }
                  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Compartir por WhatsApp</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1a1a2e;color:white;font-family:system-ui,sans-serif;text-align:center;}</style></head><body><div><p style="font-size:1.25rem;">Cierra esta pestaña para regresar a tu red de afinidad</p></div><script>window.location.replace("${waUrl}");<\/script></body></html>`;
                  const blob = new Blob([html], { type: "text/html" });
                  const blobUrl = URL.createObjectURL(blob);
                  window.open(blobUrl, "_blank");
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Compartir por WhatsApp
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Dates row */}
        <div className="flex items-center gap-4 mb-2 text-[10px]">
          {joinDate && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Me uní: <span className="font-medium text-foreground">{formatDate(joinDate)}</span></span>
            </div>
          )}
          {latestJoinDate && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Invitado más reciente: <span className="font-medium text-foreground">{formatDate(latestJoinDate)}</span></span>
            </div>
          )}
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-muted/50 rounded-lg p-1.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <UserPlus className="h-3 w-3 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">{directCount}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Directos</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-1.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <UsersRound className="h-3 w-3 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">{indirectCount}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Indirectos</p>
          </div>

          <div className="bg-primary/10 rounded-lg p-1.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Share2 className="h-3 w-3 text-primary" />
            </div>
            <p className="text-base font-bold text-primary">{totalNetwork}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Mi Red</p>
          </div>
        </div>

        {/* Social media status icons */}
        {rootMember && commentsData && (() => {
          const missingPlatforms = PLATFORMS.filter(p => !rootMember[p.usernameField]);
          return (
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-center gap-3">
                {PLATFORMS.map(({ key, icon: Icon, label, usernameField }) => {
                  const hasUsername = !!rootMember[usernameField];
                  const summaries = commentsData.get(String(rootMember.id));
                  const platformSummary = summaries?.find(s => s.platform === key);
                  const count = platformSummary?.total ?? 0;

                  if (!hasUsername) {
                    return (
                      <div key={key} className="flex items-center gap-0.5 text-muted-foreground/40" title={`${label}: no registrado`}>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium">N/R</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-semibold",
                        count > 0 ? "text-emerald-500" : "text-red-500"
                      )}
                      title={`${label}: ${count} comentarios`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
              {missingPlatforms.length > 0 && (
                <p className="text-[8px] text-muted-foreground text-center mt-1">
                  ⚠️ No registraste: {missingPlatforms.map(p => p.label).join(', ')} · Regístralas a través del chatbot
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </header>
  );
}
