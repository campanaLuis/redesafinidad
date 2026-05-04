import { useState, useMemo, useCallback } from "react";
import { NetworkMemberWithChildren, CommentsDataMap } from "@/types/network";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PersonDetailModal } from "./PersonDetailModal";
import { SocialCommentBadges } from "./SocialCommentBadges";
import { getLevelColor } from "./levelColors";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface NetworkRankingViewProps {
  rootMember: NetworkMemberWithChildren;
  commentsData: CommentsDataMap;
}

interface FlattenedMember {
  member: NetworkMemberWithChildren;
  level: number;
}

type SortField = 'total' | 'level' | 'direct' | 'indirect' | 'days';
type SortDirection = 'asc' | 'desc';

// Calculate days since last direct invitation or registration date
function getDaysSinceLastActivity(member: NetworkMemberWithChildren): number {
  const now = new Date();
  let lastDate: Date;
  
  if (member.children.length > 0) {
    const latestChild = member.children.reduce((latest, child) => {
      const childDate = new Date(child.created_at);
      const latestDate = new Date(latest.created_at);
      return childDate > latestDate ? child : latest;
    });
    lastDate = new Date(latestChild.created_at);
  } else {
    lastDate = new Date(member.created_at);
  }
  
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

const ITEMS_PER_PAGE = 10;

// Flatten tree into list with levels
function flattenTree(member: NetworkMemberWithChildren, level: number = 1): FlattenedMember[] {
  const result: FlattenedMember[] = [{ member, level }];
  for (const child of member.children) {
    result.push(...flattenTree(child, level + 1));
  }
  return result;
}

// Medal emojis for top 3
function getMedal(position: number): string {
  switch (position) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return "";
  }
}

export function NetworkRankingView({ rootMember, commentsData }: NetworkRankingViewProps) {
  const [selectedMember, setSelectedMember] = useState<NetworkMemberWithChildren | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Flatten tree
  const flattenedMembers = useMemo(() => flattenTree(rootMember), [rootMember]);

  // Get unique levels for filter
  const uniqueLevels = useMemo(() => {
    const levels = new Set(flattenedMembers.map(({ level }) => level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [flattenedMembers]);

  // Map for quick referrer lookup
  const memberMap = useMemo(() => {
    const map = new Map<number, { member: NetworkMemberWithChildren; level: number }>();
    flattenedMembers.forEach(({ member, level }) => {
      map.set(member.id, { member, level });
    });
    return map;
  }, [flattenedMembers]);

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...flattenedMembers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(({ member }) =>
        member.nombre.toLowerCase().includes(query)
      );
    }

    // Apply level filter
    if (levelFilter !== "all") {
      const targetLevel = parseInt(levelFilter, 10);
      result = result.filter(({ level }) => level === targetLevel);
    }

    // Sort
    result.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      const aTotal = parseInt(String(a.member.total_descendants_count || 0), 10);
      const bTotal = parseInt(String(b.member.total_descendants_count || 0), 10);
      const aDirect = a.member.children.length;
      const bDirect = b.member.children.length;

      switch (sortField) {
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'direct':
          aValue = aDirect;
          bValue = bDirect;
          break;
        case 'indirect':
          aValue = aTotal - aDirect;
          bValue = bTotal - bDirect;
          break;
        case 'days':
          aValue = getDaysSinceLastActivity(a.member);
          bValue = getDaysSinceLastActivity(b.member);
          break;
        case 'total':
        default:
          aValue = aTotal;
          bValue = bTotal;
          break;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return result;
  }, [flattenedMembers, searchQuery, levelFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedMembers, currentPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, levelFilter, sortField, sortDirection]);

  const handleMemberClick = useCallback((member: NetworkMemberWithChildren) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMember(null);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-0.5 opacity-50" />;
    }
    // For 'days': more days = worse, so invert colors
    // For others: more = better (green for desc)
    const isGood = field === 'days' 
      ? sortDirection === 'asc'  // Less days first = good
      : sortDirection === 'desc'; // More first = good
    const colorClass = isGood ? 'text-emerald-500' : 'text-red-500';
    return sortDirection === 'desc' 
      ? <ArrowDown className={cn("h-3 w-3 ml-0.5", colorClass)} />
      : <ArrowUp className={cn("h-3 w-3 ml-0.5", colorClass)} />;
  };

  const getSortDescription = (): { text: string; isGood: boolean } => {
    const direction = sortDirection === 'desc' ? 'Mayor a menor' : 'Menor a mayor';
    // For 'days': ascending (less days) is good
    // For others: descending (more) is good
    const isGood = sortField === 'days' 
      ? sortDirection === 'asc' 
      : sortDirection === 'desc';
    
    let text = '';
    switch (sortField) {
      case 'level':
        text = `${direction}: Nivel en la red`;
        break;
      case 'direct':
        text = `${direction}: Invitados directos`;
        break;
      case 'indirect':
        text = `${direction}: Invitados indirectos`;
        break;
      case 'total':
        text = `${direction}: Total de red`;
        break;
      case 'days':
        text = `${direction}: Días sin agregar invitado directo`;
        break;
    }
    return { text, isGood };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-2 space-y-2 border-b">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Level filter */}
        <div className="flex gap-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Filtrar por nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              {uniqueLevels.map((level) => (
                <SelectItem key={level} value={String(level)}>
                  Nivel {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sort indicator */}
      {(() => {
        const { text, isGood } = getSortDescription();
        return (
          <div className={cn(
            "px-2 py-0.5 text-[10px] text-center border-b",
            isGood ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
          )}>
            {text}
          </div>
        );
      })()}

      {/* Table with scroll */}
      <div className="flex-1 overflow-auto min-h-0">
        <Table>
          <TableHeader>
            <TableRow className="text-sm">
              <TableHead className="w-6 px-0.5 py-1 text-center">#</TableHead>
              <TableHead className="px-0.5 py-1">Nombre</TableHead>
              <TableHead 
                className="w-8 px-0.5 py-1 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('level')}
              >
                <div className="flex items-center justify-center">
                  Niv
                  <SortIcon field="level" />
                </div>
              </TableHead>
              <TableHead 
                className="w-8 px-0.5 py-1 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('direct')}
              >
                <div className="flex items-center justify-center">
                  Dir
                  <SortIcon field="direct" />
                </div>
              </TableHead>
              <TableHead 
                className="w-8 px-0.5 py-1 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('indirect')}
              >
                <div className="flex items-center justify-center">
                  Ind
                  <SortIcon field="indirect" />
                </div>
              </TableHead>
              <TableHead 
                className="w-10 px-0.5 py-1 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center justify-center">
                  Tot
                  <SortIcon field="total" />
                </div>
              </TableHead>
              <TableHead 
                className="w-8 px-0.5 py-1 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('days')}
              >
                <div className="flex items-center justify-center">
                  Días
                  <SortIcon field="days" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.map(({ member, level }, index) => {
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
              const position = globalIndex + 1;
              const medal = getMedal(position);
              const isRoot = member.id === rootMember.id;
              const levelColors = getLevelColor(level);
              
              const totalDescendants = parseInt(String(member.total_descendants_count || 0), 10);
              const directCount = member.children.length;
              const indirectCount = totalDescendants - directCount;

              return (
                <TableRow
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  className={cn(
                    "cursor-pointer text-sm",
                    "hover:bg-muted/50 active:bg-muted",
                    position <= 3 && "bg-muted/30"
                  )}
                >
                  {/* Position */}
                  <TableCell className="px-1 py-1.5 text-center font-medium">
                    {medal || position}
                  </TableCell>

                  {/* Name */}
                  <TableCell className="px-1 py-1.5 max-w-[120px]">
                    <div className="flex flex-col">
                      <span className={cn(
                        "truncate block",
                        isRoot && "font-semibold"
                      )}>
                        {member.nombre}
                        {isRoot && " (Tú)"}
                      </span>
                      <SocialCommentBadges member={member} commentsData={commentsData} />
                    </div>
                  </TableCell>

                  {/* Level - with color */}
                  <TableCell className="px-1 py-1.5 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold",
                      levelColors.bg,
                      levelColors.text
                    )}>
                      {level}
                    </span>
                  </TableCell>

                  {/* Direct */}
                  <TableCell className="px-1 py-1.5 text-center">
                    {directCount}
                  </TableCell>

                  {/* Indirect */}
                  <TableCell className="px-1 py-1.5 text-center text-muted-foreground">
                    {indirectCount}
                  </TableCell>

                  {/* Total */}
                  <TableCell className="px-1 py-1.5 text-center font-semibold text-primary">
                    {totalDescendants}
                  </TableCell>

                  {/* Days since last activity */}
                  <TableCell className="px-1 py-1.5 text-center text-muted-foreground">
                    {getDaysSinceLastActivity(member)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - always visible */}
      <div className="flex items-center justify-between px-2 py-2 border-t bg-background shrink-0">
        <span className="text-xs text-muted-foreground">
          {filteredAndSortedMembers.length} miembros
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Person Detail Modal */}
      <PersonDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        referrerName={selectedMember?.refiereid 
          ? memberMap.get(parseInt(String(selectedMember.refiereid), 10))?.member.nombre 
          : null}
        commentsData={commentsData}
      />
    </div>
  );
}
