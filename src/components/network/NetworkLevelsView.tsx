import { useState, useMemo, useCallback } from "react";
import { NetworkMemberWithChildren, CommentsDataMap } from "@/types/network";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { getLevelColor, levelColors } from "./levelColors";
import { PersonDetailModal } from "./PersonDetailModal";
import { SocialCommentBadges } from "./SocialCommentBadges";
import { NetworkMap } from "./NetworkMap";
import { Button } from "@/components/ui/button";
import { GitBranch, Layers, FolderTree } from "lucide-react";
import { NetworkBreakdownView } from "./NetworkBreakdownView";

export type LevelsSubView = 'list' | 'breakdown' | 'tree';

interface NetworkLevelsViewProps {
  rootMember: NetworkMemberWithChildren;
  commentsData: CommentsDataMap;
  subView: LevelsSubView;
}

interface FlattenedMember {
  member: NetworkMemberWithChildren;
  level: number;
}

// Flatten tree into list with levels
function flattenTree(member: NetworkMemberWithChildren, level: number = 1): FlattenedMember[] {
  const result: FlattenedMember[] = [{ member, level }];
  for (const child of member.children) {
    result.push(...flattenTree(child, level + 1));
  }
  return result;
}


export function NetworkLevelsView({ rootMember, commentsData, subView }: NetworkLevelsViewProps) {
  const [selectedMember, setSelectedMember] = useState<NetworkMemberWithChildren | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flatten tree
  const flattenedMembers = useMemo(() => flattenTree(rootMember), [rootMember]);

  // Map for quick referrer lookup
  const memberMap = useMemo(() => {
    const map = new Map<number, NetworkMemberWithChildren>();
    flattenedMembers.forEach(({ member }) => {
      map.set(member.id, member);
    });
    return map;
  }, [flattenedMembers]);

  // Group by level and sort within each group
  const membersByLevel = useMemo(() => {
    const groups: Record<number, FlattenedMember[]> = {};
    flattenedMembers.forEach(item => {
      if (!groups[item.level]) groups[item.level] = [];
      groups[item.level].push(item);
    });
    // Sort each group by total descendants (most to least)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => 
        (parseInt(String(b.member.total_descendants_count || 0), 10)) - 
        (parseInt(String(a.member.total_descendants_count || 0), 10))
      );
    });
    return groups;
  }, [flattenedMembers]);

  const levels = useMemo(() => Object.keys(membersByLevel).map(Number).sort((a, b) => a - b), [membersByLevel]);

  const handleMemberClick = useCallback((member: NetworkMemberWithChildren) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMember(null);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden w-full max-w-full">

      {subView === 'tree' ? (
        <div className="flex-1">
          <NetworkMap rootMember={rootMember} commentsData={commentsData} />
        </div>
      ) : subView === 'breakdown' ? (
        <div className="flex-1 overflow-hidden">
          <NetworkBreakdownView rootMember={rootMember} commentsData={commentsData} />
        </div>
      ) : (
      <ScrollArea className="flex-1 w-full [&>div>div]:!block">
        <div className="p-3 w-full max-w-full">
          <Accordion type="multiple" defaultValue={["level-1"]} className="space-y-2">
            {levels.map(level => {
              const members = membersByLevel[level];
              const colors = getLevelColor(level);
              
              return (
                <AccordionItem 
                  key={level} 
                  value={`level-${level}`}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className={cn(
                    "px-4 py-3 hover:no-underline",
                    colors.bg
                  )}>
                    <div className="flex items-center gap-2 w-full overflow-hidden">
                      <div className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0",
                        colors.border,
                        "border-2"
                      )} 
                      style={{ 
                        backgroundColor: `hsl(var(--${colors.border.replace('border-', '').replace('-500', '-500')}))` 
                      }}
                      />
                      <span className={cn("font-semibold", colors.text)}>
                        Nivel {level}
                      </span>
                      {/* Total centrado con texto arriba */}
                      <div className="flex flex-col items-center ml-auto">
                        <span className="text-[9px] text-muted-foreground">Total usuarios</span>
                        <span className="text-2xl font-bold text-foreground leading-none">{members.length}</span>
                      </div>
                      
                      {/* Stats en 2 filas */}
                      <div className="flex flex-col items-end text-[10px] ml-4 mr-2 gap-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{members.filter(({ member }) => member.children.length > 0).length}</span>
                          <span className="text-muted-foreground">con invitados</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-red-600 dark:text-red-400">{members.filter(({ member }) => member.children.length === 0).length}</span>
                          <span className="text-muted-foreground">sin invitados</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="divide-y overflow-hidden">
                      {members.map(({ member }) => {
                        const initials = member.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const isRoot = level === 1 && member.id === rootMember.id;
                        const referrerName = member.refiereid 
                          ? memberMap.get(parseInt(String(member.refiereid), 10))?.nombre 
                          : null;
                        const totalDescendants = parseInt(String(member.total_descendants_count || 0), 10);
                        const directCount = member.children.length;
                        const indirectCount = totalDescendants - directCount;

                        return (
                          <div
                            key={member.id}
                            onClick={() => handleMemberClick(member)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer overflow-hidden",
                              "hover:bg-muted/50 active:bg-muted transition-colors"
                            )}
                          >
                            {/* Avatar */}
                            <div className="relative">
                              <Avatar className={cn("h-10 w-10 ring-2 ring-offset-1", colors.ring)}>
                                <AvatarImage src={member.selfie_url || undefined} alt={member.nombre} />
                                <AvatarFallback className={cn("text-xs font-semibold", colors.bg, colors.text)}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              {isRoot && (
                                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0 rounded-full font-medium">
                                  Tú
                                </span>
                              )}
                            </div>

                            {/* Name and details */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.nombre}</p>
                              {referrerName && !isRoot && (
                                <p className="text-[10px] text-muted-foreground/70 truncate">
                                  Invitado por {referrerName}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {directCount} directos
                                {indirectCount > 0 && ` • ${indirectCount} indirectos`}
                              </p>
                              <SocialCommentBadges member={member} commentsData={commentsData} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </ScrollArea>
      )}

      {/* Person Detail Modal */}
      <PersonDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        referrerName={selectedMember?.refiereid 
          ? memberMap.get(parseInt(String(selectedMember.refiereid), 10))?.nombre 
          : null}
        commentsData={commentsData}
      />
    </div>
  );
}
