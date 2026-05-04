/**
 * Componentes compartidos de layout KPI.
 * Usados por: Redes de Afinidad, Ejército Digital, Beneficiarios,
 *             Atención Ciudadana, Redes Sociales.
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─── helpers exportables ───────────────────────────────────────── */
export function pct(num: number, den: number, digits = 0) {
  if (!den) return "0%";
  const v = (num / den) * 100;
  return `${v.toLocaleString("es-MX", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}
export function fmt(n: number) {
  return n.toLocaleString("es-MX");
}

/* ─── Paleta de tonos ───────────────────────────────────────────── */
type Tone =
  | "blue" | "emerald" | "amber" | "rose" | "violet"
  | "sky" | "pink" | "teal" | "orange" | "slate";

const TONE_BG: Record<Tone, string> = {
  blue:    "bg-blue-50    text-blue-600    dark:bg-blue-950    dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  amber:   "bg-amber-50   text-amber-600   dark:bg-amber-950   dark:text-amber-400",
  rose:    "bg-rose-50    text-rose-600    dark:bg-rose-950    dark:text-rose-400",
  violet:  "bg-violet-50  text-violet-600  dark:bg-violet-950  dark:text-violet-400",
  sky:     "bg-sky-50     text-sky-600     dark:bg-sky-950     dark:text-sky-400",
  pink:    "bg-pink-50    text-pink-600    dark:bg-pink-950    dark:text-pink-400",
  teal:    "bg-teal-50    text-teal-600    dark:bg-teal-950    dark:text-teal-400",
  orange:  "bg-orange-50  text-orange-600  dark:bg-orange-950  dark:text-orange-400",
  slate:   "bg-slate-100  text-slate-600   dark:bg-slate-800   dark:text-slate-400",
};

const TONE_BORDER: Record<Tone, string> = {
  blue:    "border-blue-200/80    bg-blue-50/70    dark:border-blue-900/70    dark:bg-blue-950/20",
  emerald: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20",
  amber:   "border-amber-200/80   bg-amber-50/70   dark:border-amber-900/70   dark:bg-amber-950/20",
  rose:    "border-rose-200/80    bg-rose-50/70    dark:border-rose-900/70    dark:bg-rose-950/20",
  violet:  "border-violet-200/80  bg-violet-50/70  dark:border-violet-900/70  dark:bg-violet-950/20",
  sky:     "border-sky-200/80     bg-sky-50/70     dark:border-sky-900/70     dark:bg-sky-950/20",
  pink:    "border-pink-200/80    bg-pink-50/70    dark:border-pink-900/70    dark:bg-pink-950/20",
  teal:    "border-teal-200/80    bg-teal-50/70    dark:border-teal-900/70    dark:bg-teal-950/20",
  orange:  "border-orange-200/80  bg-orange-50/70  dark:border-orange-900/70  dark:bg-orange-950/20",
  slate:   "border-slate-200/80   bg-slate-50/70   dark:border-slate-800      dark:bg-slate-900/20",
};

const TONE_TEXT: Record<Tone, string> = {
  blue:    "text-blue-700    dark:text-blue-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  amber:   "text-amber-700   dark:text-amber-300",
  rose:    "text-rose-700    dark:text-rose-300",
  violet:  "text-violet-700  dark:text-violet-300",
  sky:     "text-sky-700     dark:text-sky-300",
  pink:    "text-pink-700    dark:text-pink-300",
  teal:    "text-teal-700    dark:text-teal-300",
  orange:  "text-orange-700  dark:text-orange-300",
  slate:   "text-foreground",
};

/* ─── MainKpi — tarjeta grande con ícono ────────────────────────── */
export function MainKpi({
  label, value, sub, icon: Icon, tone = "blue", delay = 0, loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone?: Tone;
  delay?: number;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card px-6 py-5 shadow-sm"
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONE_BG[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-24 rounded-lg" />
        ) : (
          <>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─── SecKpi — tarjeta compacta con borde de color ─────────────── */
export function SecKpi({
  label, value, hint, tone = "slate", delay = 0, loading,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  delay?: number;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className={cn("space-y-1.5 rounded-xl border px-4 py-3", TONE_BORDER[tone])}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="h-5 w-20 rounded" />
      ) : (
        <>
          <p className={cn("text-xl font-semibold tabular-nums", TONE_TEXT[tone])}>{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </motion.div>
  );
}

/* ─── KpiSection — bloque con título separador ──────────────────── */
export function KpiSection({
  title, children, delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="space-y-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </motion.div>
  );
}

/* ─── PageHeader — encabezado estándar de módulo ────────────────── */
export function PageHeader({
  module, title, description,
}: {
  module?: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {module ?? "Módulo"}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </motion.div>
  );
}

/* ─── ErrorBanner ────────────────────────────────────────────────── */
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
      {message}
    </div>
  );
}
