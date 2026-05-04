import { useRef, useState, useCallback, useMemo } from "react";
import { NetworkMemberWithChildren } from "@/types/network";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Minus, ChevronDown, ChevronRight, Crosshair } from "lucide-react";
import { PersonDetailModal } from "./PersonDetailModal";
import { getLevelColor } from "./levelColors";

// Helper to count total descendants
function countDescendants(member: NetworkMemberWithChildren): number {
  let count = member.children.length;
  for (const child of member.children) {
    count += countDescendants(child);
  }
  return count;
}

// Helper to find max depth of tree
function findMaxDepth(member: NetworkMemberWithChildren, currentLevel: number = 1): number {
  if (member.children.length === 0) return currentLevel;
  return Math.max(...member.children.map(child => findMaxDepth(child, currentLevel + 1)));
}

import { CommentsDataMap } from "@/types/network";

interface NetworkMapProps {
  rootMember: NetworkMemberWithChildren;
  commentsData: CommentsDataMap;
}

interface NodeProps {
  member: NetworkMemberWithChildren;
  level: number;
  isRoot?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isOnly?: boolean;
  onNodeClick: (member: NetworkMemberWithChildren) => void;
  maxVisibleLevel: number | null;
  collapsedNodes: Set<number>;
  onToggleCollapse: (nodeId: number) => void;
}

function TreeNode({ 
  member, 
  level, 
  isRoot = false, 
  isFirst = false, 
  isLast = false, 
  isOnly = false, 
  onNodeClick,
  maxVisibleLevel,
  collapsedNodes,
  onToggleCollapse
}: NodeProps) {
  const initials = member.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasChildren = member.children.length > 0;
  const followersCount = member.children.length;
  const isCollapsed = collapsedNodes.has(member.id);
  const hiddenCount = isCollapsed ? countDescendants(member) : 0;
  
  // Get level-specific colors
  const colors = getLevelColor(level);

  // Check if this level should be hidden by global level control
  const isLevelHidden = maxVisibleLevel !== null && level > maxVisibleLevel;
  if (isLevelHidden) return null;

  // Check if children would be visible (not hidden by maxVisibleLevel)
  const childrenWouldBeVisible = maxVisibleLevel === null || level < maxVisibleLevel;
  const showChildrenAndLine = hasChildren && !isCollapsed && childrenWouldBeVisible;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeClick(member);
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse(member.id);
  };

  return (
    <div className="flex flex-col items-center relative">
      {/* Vertical line ABOVE the node (connects from parent's horizontal line) */}
      {!isRoot && (
        <div className="w-px h-3 bg-border" />
      )}

      {/* Horizontal line segment above this node (part of parent's connector) */}
      {!isRoot && !isOnly && (
        <>
          {/* Left half of horizontal line (for non-first children) */}
          {!isFirst && (
            <div className="absolute top-0 right-1/2 h-0.5 bg-border" style={{ left: '-50%' }} />
          )}
          {/* Right half of horizontal line (for non-last children) */}
          {!isLast && (
            <div className="absolute top-0 left-1/2 h-0.5 bg-border" style={{ right: '-50%' }} />
          )}
        </>
      )}

      {/* Level badge with color */}
      <Badge 
        variant="outline" 
        className={cn(
          "mb-0.5 text-[7px] px-1 py-0",
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        Nivel {level}
      </Badge>
      
      {/* Node card - clickeable */}
      <div
        onClick={handleClick}
        className={cn(
          "relative flex flex-col items-center p-1.5 rounded-md bg-card border shadow-sm cursor-pointer",
          "min-w-[55px] max-w-[70px]",
          "transition-transform duration-150 hover:scale-105 active:scale-95",
          colors.border
        )}
      >
        <Avatar className={cn(
          "h-6 w-6 mb-0.5 ring-1 ring-offset-1",
          colors.ring
        )}>
          <AvatarImage src={member.selfie_url || undefined} alt={member.nombre} />
          <AvatarFallback className={cn("text-[8px] font-semibold", colors.bg, colors.text)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <span className="text-[8px] font-medium text-foreground text-center leading-tight line-clamp-2">
          {member.nombre}
        </span>
        
        <span className="text-[7px] text-muted-foreground">
          {followersCount} seg.
        </span>

        {isRoot && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[6px] px-0.5 py-0 rounded-full font-medium">
            Tú
          </span>
        )}

        {/* Collapse/expand button for nodes with children - only show if children would be visible */}
        {hasChildren && childrenWouldBeVisible && (
          <button
            onClick={handleToggleCollapse}
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 z-10",
              "w-4 h-4 rounded-full bg-muted border border-border",
              "flex items-center justify-center",
              "hover:bg-accent transition-colors shadow-sm"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Hidden count badge when collapsed */}
      {isCollapsed && hiddenCount > 0 && (
        <Badge 
          variant="secondary" 
          className="mt-0.5 text-[6px] px-1 py-0 bg-muted text-muted-foreground"
        >
          +{hiddenCount}
        </Badge>
      )}

      {/* Vertical line BELOW the node (towards children) - only if children are visible */}
      {showChildrenAndLine && (
        <div className="w-0.5 h-3 bg-border mt-2" />
      )}

      {/* Children container */}
      {showChildrenAndLine && (
        <div className="flex gap-2">
          {member.children.map((child, index) => (
            <TreeNode 
              key={child.id} 
              member={child} 
              level={level + 1}
              isFirst={index === 0}
              isLast={index === member.children.length - 1}
              isOnly={member.children.length === 1}
              onNodeClick={onNodeClick}
              maxVisibleLevel={maxVisibleLevel}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Zoom constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.15;
const DEFAULT_SCALE = 0.7;

export function NetworkMap({ rootMember, commentsData }: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [selectedMember, setSelectedMember] = useState<NetworkMemberWithChildren | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Collapse state
  const [maxVisibleLevel, setMaxVisibleLevel] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  
  // Calculate max depth of tree
  const maxDepth = useMemo(() => findMaxDepth(rootMember), [rootMember]);
  const levelButtons = useMemo(() => {
    const levels = [];
    for (let i = 1; i <= Math.min(maxDepth, 5); i++) {
      levels.push(i);
    }
    return levels;
  }, [maxDepth]);
  
  // Pinch-to-zoom state
  const lastPinchDistance = useRef<number | null>(null);
  const hasMoved = useRef(false);
  
  const handleToggleCollapse = useCallback((nodeId: number) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);
  
  const handleLevelChange = useCallback((level: number | null) => {
    setMaxVisibleLevel(level);
    // Clear individual collapses when using global level control
    setCollapsedNodes(new Set());
  }, []);

  // No need for initial centering - handled by CSS now

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - ZOOM_STEP, MIN_SCALE));
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    hasMoved.current = false;
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    
    if (Math.abs(newX - position.x) > 3 || Math.abs(newY - position.y) > 3) {
      hasMoved.current = true;
    }
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistance.current = distance;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      hasMoved.current = false;
      setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      // Pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastPinchDistance.current;
      const scaleChange = delta * 0.005;
      
      setScale((prev) => Math.min(Math.max(prev + scaleChange, MIN_SCALE), MAX_SCALE));
      lastPinchDistance.current = distance;
      hasMoved.current = true;
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const newX = touch.clientX - startPos.x;
      const newY = touch.clientY - startPos.y;
      
      if (Math.abs(newX - position.x) > 3 || Math.abs(newY - position.y) > 3) {
        hasMoved.current = true;
      }
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastPinchDistance.current = null;
  };

  const handleNodeClick = useCallback((member: NetworkMemberWithChildren) => {
    // Only open modal if user didn't drag
    if (!hasMoved.current) {
      setSelectedMember(member);
      setIsModalOpen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMember(null);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Top controls container */}
      <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1">
        {/* Instructions */}
        <div className="bg-background/80 backdrop-blur-sm text-[10px] text-muted-foreground px-2 py-1 rounded-md border w-fit">
          Arrastra • Pellizca para zoom
        </div>
        
        {/* Level controls */}
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border w-fit">
          <span className="text-[9px] text-muted-foreground mr-1">Niveles:</span>
          {levelButtons.map(level => (
            <Button
              key={level}
              size="sm"
              variant={maxVisibleLevel === level ? "default" : "ghost"}
              className="h-5 w-5 p-0 text-[10px]"
              onClick={() => handleLevelChange(maxVisibleLevel === level ? null : level)}
            >
              {level}
            </Button>
          ))}
          <Button
            size="sm"
            variant={maxVisibleLevel === null ? "default" : "ghost"}
            className="h-5 px-1.5 text-[9px]"
            onClick={() => handleLevelChange(null)}
          >
            Todos
          </Button>
        </div>
      </div>

      {/* Zoom and center controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={handleZoomIn}
          disabled={scale >= MAX_SCALE}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="text-[10px] text-center text-muted-foreground bg-background/80 rounded px-1">
          {Math.round(scale * 100)}%
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={handleZoomOut}
          disabled={scale <= MIN_SCALE}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="default"
          className="h-8 w-8 mt-2"
          onClick={() => {
            setPosition({ x: 0, y: 0 });
            setScale(DEFAULT_SCALE);
          }}
          title="Centrar árbol"
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Scrollable container - starts below controls */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 top-16 overflow-hidden",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Content - free panning via drag */}
        <div 
          ref={contentRef}
          className="absolute left-1/2 top-8"
          style={{ 
            transform: `translateX(-50%) translateX(${position.x}px) translateY(${position.y}px) scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          <TreeNode 
            member={rootMember} 
            level={1} 
            isRoot 
            onNodeClick={handleNodeClick}
            maxVisibleLevel={maxVisibleLevel}
            collapsedNodes={collapsedNodes}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>
      </div>

      {/* Person Detail Modal */}
      <PersonDetailModal
        member={selectedMember}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        commentsData={commentsData}
      />
    </div>
  );
}
