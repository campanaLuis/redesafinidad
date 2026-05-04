import { cn } from "@/lib/utils";

interface TreeConnectorProps {
  direction: "up" | "down";
  className?: string;
}

export function TreeConnector({ direction, className }: TreeConnectorProps) {
  return (
    <div className={cn("flex justify-center py-2", className)}>
      <div className="relative flex flex-col items-center">
        {direction === "down" && (
          <div className="w-3 h-3 rounded-full bg-tree-line animate-pulse-soft" />
        )}
        <div className="w-0.5 h-8 tree-line" />
        {direction === "up" && (
          <div className="w-3 h-3 rounded-full bg-tree-line animate-pulse-soft" />
        )}
      </div>
    </div>
  );
}
