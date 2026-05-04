import { useState } from "react";
import { NetworkTree as NetworkTreeType, NetworkMemberWithChildren, NetworkMember, CommentsDataMap } from "@/types/network";
import { NetworkLevelsView, LevelsSubView } from "./NetworkLevelsView";
import { NetworkRankingView } from "./NetworkRankingView";
import { NetworkVersusView } from "./NetworkVersusView";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Users, Layers, Trophy, AtSign, GitBranch, FolderTree, CalendarCheck } from "lucide-react";
import { NetworkSocialView } from "./NetworkSocialView";
import { NetworkEventsView } from "./NetworkEventsView";

interface NetworkTreeProps {
  tree: NetworkTreeType;
  allMembers: NetworkMember[];
  globalTotal: number;
  commentsData: CommentsDataMap;
}

export function NetworkTree({ tree, allMembers, globalTotal, commentsData }: NetworkTreeProps) {
  const [viewMode, setViewMode] = useState<'levels' | 'ranking' | 'social' | 'eventos'>('levels');
  const [rankingSubTab, setRankingSubTab] = useState<'mi-red' | 'global'>('mi-red');
  const [levelsSubView, setLevelsSubView] = useState<LevelsSubView>('list');

  const rootMemberWithChildren: NetworkMemberWithChildren = {
    ...tree.you,
    children: tree.invited,
  };

  return (
    <div className="flex flex-col items-stretch px-4 py-6">

      {/* View Toggle */}
      <div className="w-full mb-4 px-0">
        <div className="flex items-center justify-between gap-0.5 px-1 py-1.5 bg-muted/50 rounded-lg">
          {([
            { key: 'levels' as const, icon: Layers, label: 'Niveles' },
            { key: 'ranking' as const, icon: Trophy, label: 'Ranking' },
            { key: 'social' as const, icon: AtSign, label: 'Redes' },
            { key: 'eventos' as const, icon: CalendarCheck, label: 'Eventos' },
          ]).map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              size="sm"
              variant={viewMode === key ? 'default' : 'ghost'}
              className="h-7 flex-1 px-1 text-[11px] gap-0.5 min-w-0"
              onClick={() => setViewMode(key)}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>
      </div>


      {/* Social */}
      {viewMode === 'social' && (
        <NetworkSocialView rootMember={rootMemberWithChildren} allNetworkMembers={allMembers} commentsData={commentsData} />
      )}

      {/* Ranking (direct, no sub-tabs) */}
      {viewMode === 'ranking' && (
        <div className="w-full flex flex-col gap-3">
          {tree.invited.length > 0 ? (
            <div className="w-full border rounded-xl bg-muted/20 overflow-hidden" style={{ height: '60vh' }}>
              <NetworkRankingView rootMember={rootMemberWithChildren} commentsData={commentsData} />
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full mt-2 text-center p-6 rounded-2xl bg-muted/50 border border-dashed border-border">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">Aún no has invitado a nadie a la red</p>
            </div>
          )}
        </div>
      )}

      {/* Levels with sub-tabs outside the container */}
      {viewMode === 'levels' && (
        <div className="w-full flex flex-col gap-3">
          {tree.invited.length > 0 && (
            <div className="flex items-center gap-1 px-1">
              <Button
                size="sm"
                variant={levelsSubView === 'list' ? 'secondary' : 'outline'}
                className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
                onClick={() => setLevelsSubView('list')}
              >
                <Layers className="h-2.5 w-2.5" />
                Lista
              </Button>
              <Button
                size="sm"
                variant={levelsSubView === 'breakdown' ? 'secondary' : 'outline'}
                className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
                onClick={() => setLevelsSubView('breakdown')}
              >
                <FolderTree className="h-2.5 w-2.5" />
                Desglose
              </Button>
              <Button
                size="sm"
                variant={levelsSubView === 'tree' ? 'secondary' : 'outline'}
                className="h-6 flex-1 text-[10px] gap-0.5 font-medium"
                onClick={() => setLevelsSubView('tree')}
              >
                <GitBranch className="h-2.5 w-2.5" />
                Árbol
              </Button>
            </div>
          )}
          {tree.invited.length > 0 ? (
            <div className="w-full border rounded-xl bg-muted/20 overflow-hidden" style={{ height: '60vh' }}>
              <NetworkLevelsView rootMember={rootMemberWithChildren} commentsData={commentsData} subView={levelsSubView} />
            </div>
          ) : (
            <div className="max-w-md mx-auto w-full mt-6 text-center p-6 rounded-2xl bg-muted/50 border border-dashed border-border">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">Aún no has invitado a nadie a la red</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Comparte tu enlace para comenzar a crecer tu red</p>
            </div>
          )}
        </div>
      )}

      {/* Eventos */}
      {viewMode === 'eventos' && (
        <NetworkEventsView hashCode={tree.you.hash_code || ''} />
      )}
    </div>
  );
}
