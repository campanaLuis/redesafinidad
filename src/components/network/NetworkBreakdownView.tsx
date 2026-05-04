import { useState, useCallback, useMemo } from "react";
import { NetworkMemberWithChildren, CommentsDataMap } from "@/types/network";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelColor } from "./levelColors";
import { PersonDetailModal } from "./PersonDetailModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface NetworkBreakdownViewProps {
  rootMember: NetworkMemberWithChildren;
  commentsData: CommentsDataMap;
}

function DepthIndicator({ hasChildren, isOpen }: { hasChildren: boolean; isOpen: boolean }) {
  return (
    <div className="flex h-10 w-5 shrink-0 items-center justify-center">
      {hasChildren ? (
        isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
      ) : (
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      )}
    </div>
  );
}

function BreakdownNode({ member, level, commentsData, onMemberClick, searchQuery }: {
  member: NetworkMemberWithChildren;
  level: number;
  commentsData: CommentsDataMap;
  onMemberClick: (m: NetworkMemberWithChildren) => void;
  searchQuery: string;
}) {
  const matchesSelf = searchQuery === "" || member.nombre.toLowerCase().includes(searchQuery);

  const hasMatchingDescendant = useMemo(() => {
    if (searchQuery === "") return true;
    const check = (m: NetworkMemberWithChildren): boolean => {
      if (m.nombre.toLowerCase().includes(searchQuery)) return true;
      return m.children.some(check);
    };
    return member.children.some(check);
  }, [member, searchQuery]);

  const [isOpen, setIsOpen] = useState(level === 0 || (searchQuery !== "" && hasMatchingDescendant));

  if (searchQuery !== "" && !matchesSelf && !hasMatchingDescendant) return null;

  const hasChildren = member.children.length > 0;
  const colors = getLevelColor(level + 1);
  const initials = member.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const directCount = member.children.length;
  const totalDesc = parseInt(String(member.total_descendants_count || 0), 10);

  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "grid grid-cols-[20px_32px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg py-2 pl-3 pr-3 transition-colors",
          "hover:bg-muted/60 active:bg-muted",
          hasChildren && "cursor-pointer"
        )}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <DepthIndicator hasChildren={hasChildren} isOpen={isOpen} />

        <Avatar className={cn("h-8 w-8 ring-2 ring-offset-1 flex-shrink-0", colors.ring)}>
          <AvatarImage src={member.selfie_url || undefined} alt={member.nombre} />
          <AvatarFallback className={cn("text-[10px] font-semibold", colors.bg, colors.text)}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div
          className="min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMemberClick(member);
          }}
        >
          <p className="truncate text-sm font-medium">{member.nombre}</p>
          <p className="text-[10px] text-muted-foreground">
            {directCount} directos
            {totalDesc - directCount > 0 && ` · ${totalDesc - directCount} indirectos`}
          </p>
        </div>

        {hasChildren && (
          <span className={cn("flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", colors.bg, colors.text)}>
            {directCount}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div>
          {member.children
            .sort((a, b) => (b.direct_descendants_count || 0) - (a.direct_descendants_count || 0))
            .map((child) => (
              <BreakdownNode
                key={child.id}
                member={child}
                level={level + 1}
                commentsData={commentsData}
                onMemberClick={onMemberClick}
                searchQuery={searchQuery}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function NetworkBreakdownView({ rootMember, commentsData }: NetworkBreakdownViewProps) {
  const [selectedMember, setSelectedMember] = useState<NetworkMemberWithChildren | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchQuery = search.toLowerCase().trim();

  const handleMemberClick = useCallback((member: NetworkMemberWithChildren) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="overflow-hidden py-2">
          <BreakdownNode
            member={rootMember}
            level={0}
            commentsData={commentsData}
            onMemberClick={handleMemberClick}
            searchQuery={searchQuery}
          />
        </div>
      </ScrollArea>

      <PersonDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMember(null);
        }}
        referrerName={null}
        commentsData={commentsData}
      />
    </div>
  );
}
