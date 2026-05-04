import { NetworkMember } from "@/types/network";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Users, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonCardProps {
  person: NetworkMember;
  variant: "referrer" | "you" | "invited";
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles = {
  referrer: {
    ring: "ring-2 ring-secondary ring-offset-2",
    badge: "bg-secondary text-secondary-foreground",
    label: "Te invitó",
  },
  you: {
    ring: "ring-4 ring-primary ring-offset-2 node-glow",
    badge: "bg-primary text-primary-foreground",
    label: "Tú",
  },
  invited: {
    ring: "ring-2 ring-tree-invited ring-offset-2",
    badge: "bg-tree-invited text-primary-foreground",
    label: "Invitado",
  },
};

export function PersonCard({ person, variant, className, style }: PersonCardProps) {
  const styles = variantStyles[variant];
  const initials = person.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = new Date(person.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-300 hover:scale-[1.02] animate-fade-up",
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-4">
        <Avatar className={cn("h-16 w-16", styles.ring)}>
          <AvatarImage src={person.selfie_url || undefined} alt={person.nombre} />
          <AvatarFallback className="text-lg font-semibold bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", styles.badge)}>
              {styles.label}
            </span>
          </div>
          
          <h3 className="font-semibold text-foreground truncate">{person.nombre}</h3>
          
          {person.colonia && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{person.colonia}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{person.direct_descendants_count || 0} invitados</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
