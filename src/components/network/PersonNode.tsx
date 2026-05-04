import { NetworkMemberWithChildren } from "@/types/network";
import { PersonCard } from "./PersonCard";
import { TreeConnector } from "./TreeConnector";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PersonNodeProps {
  member: NetworkMemberWithChildren;
  level: number;
}

export function PersonNode({ member, level }: PersonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = member.children.length > 0;

  return (
    <div className="relative">
      {/* Indentation based on level */}
      <div 
        className="relative"
        style={{ marginLeft: `${level * 16}px` }}
      >
        {/* Connector line from parent */}
        {level > 0 && (
          <div className="absolute left-2 -top-3 w-0.5 h-3 tree-line" />
        )}
        
        {/* Card with expand/collapse button */}
        <div className="relative">
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "absolute -left-6 top-1/2 -translate-y-1/2 z-10",
                "w-5 h-5 rounded-full bg-muted border border-border",
                "flex items-center justify-center",
                "hover:bg-accent transition-colors"
              )}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
          
          <PersonCard
            person={member}
            variant="invited"
            className={cn(
              hasChildren && "cursor-pointer"
            )}
          />
          
          {/* Badge showing children count */}
          {hasChildren && (
            <span className="absolute -right-2 -bottom-1 bg-tree-invited text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              +{member.children.length}
            </span>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            <TreeConnector direction="down" className="ml-4" />
            {member.children.map((child) => (
              <PersonNode
                key={child.id}
                member={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
