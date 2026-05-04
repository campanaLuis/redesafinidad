import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cardSurface } from "@/lib/appUi";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 px-4">
      <Card className={cn(cardSurface, "max-w-md text-center shadow-md")}>
        <CardHeader>
          <CardTitle className="text-4xl font-bold tracking-tight text-foreground">404</CardTitle>
          <CardDescription className="text-base">Página no encontrada</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/">Ir al panel</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
