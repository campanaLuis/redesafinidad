import { DashboardShell } from "@/components/layout/DashboardShell";
import { Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function EncuestaPage() {
  return (
    <DashboardShell title="Encuesta Telefónica">
      <div className="shrink-0">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Módulo</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Encuesta Telefónica</h1>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-card text-center shadow-sm"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Phone className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">En construcción</p>
          <p className="text-sm text-muted-foreground">Este módulo estará disponible próximamente.</p>
        </div>
      </motion.div>
    </DashboardShell>
  );
}
