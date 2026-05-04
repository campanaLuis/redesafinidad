import { cn } from "@/lib/utils";

/** Fondo principal del shell del dashboard. */
export const appShellBg = "bg-background";

/** Superficie estándar de tarjeta: borde sutil, sin sombra pesada. */
export const cardSurface = "rounded-2xl border border-border/70 bg-card shadow-sm";

/** Tarjeta KPI reutilizable. */
export const kpiCardClass = cn(
  cardSurface,
  "flex flex-col gap-3 p-5 shadow-none transition-colors hover:bg-muted/20",
);

export const kpiLabelRowClass = "flex items-center gap-2";

export const kpiLabelClass =
  "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

export const kpiIconClass = "h-4 w-4 shrink-0 text-muted-foreground/70";

export const kpiValueClass = "text-2xl font-semibold tabular-nums tracking-tight text-foreground";

export const kpiSubClass = "text-xs text-muted-foreground mt-0.5";

/** Barra de título en móvil (sticky). */
export const mobilePageHeaderClass =
  "sticky top-0 z-40 flex h-12 shrink-0 items-center border-b border-border/50 bg-card/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 md:hidden";

export const mobilePageTitleClass = "text-sm font-semibold tracking-tight text-foreground";

/** Padding del área principal del dashboard. */
export const appMainPaddingClass = "px-4 py-3 md:px-5 md:py-4";

/**
 * Tarjeta contenedora de tablas/listas que se ajusta al alto disponible.
 * El padre debe ser un flex column (lo provee DashboardShell por defecto),
 * y dentro de esta tarjeta:
 *   - toolbar/filtros llevan `shrink-0`
 *   - la región de tabla usa `flex-1 min-h-0 overflow-auto`
 *   - paginación lleva `shrink-0`
 */
export const fitCardClass =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm";

/**
 * Wrapper para apilar varios bloques DENTRO del último hijo (ej. cuando una
 * página tiene 'demografía + tabla' como contenido scroleable). Aplica scroll
 * interno y permite que el contenedor padre lo trate como flex-fit.
 */
export const fitScrollClass =
  "flex h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1";

/**
 * Layout split: resumen a la izquierda + panel tipo sidebar a la derecha (estrecho).
 * Desde `md` ya en 2 columnas (el átil útil suele ser <1024px con sidebar, antes `lg` se quedaba en 1 col).
 */
export const splitListLayoutClass =
  "grid h-full min-h-0 min-w-0 grid-cols-1 gap-2 [&>*]:min-h-0 [&>*]:min-w-0 md:grid-cols-[minmax(0,1fr)_260px] md:gap-2.5 lg:grid-cols-[minmax(0,1fr)_min(300px,28vw)]";

/**
 * Columna izquierda del split: stack vertical con scroll interno propio.
 * Contiene KPIs, charts, breakdowns…
 */
export const splitLeftClass =
  "flex min-h-0 min-w-0 flex-col gap-2 text-sm leading-snug md:gap-3 md:overflow-y-auto md:pr-1";

/**
 * Encabezado de página en vistas split (más bajo que el título “hero” clásico).
 */
export const splitPageKickerClass =
  "text-[10px] font-medium uppercase tracking-widest text-muted-foreground";
export const splitPageTitleClass =
  "mt-0.5 text-base font-semibold tracking-tight text-foreground";
export const splitPageDescClass = "mt-0.5 text-[11px] leading-snug text-muted-foreground";

/**
 * Panel derecho: lista / “tabla” como barra lateral fija, con borde y fondo sutil.
 */
export const listSidebarCardClass = cn(
  fitCardClass,
  "min-w-0 border-l-2 border-l-border/60 bg-muted/15",
);

/**
 * Botón/fila de una tarjeta compacta para listas en columnas angostas.
 * Avatar + texto principal + texto secundario; click opcional.
 */
export const compactRowClass =
  "flex w-full items-start gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";
