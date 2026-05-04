import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * created_at de reportes (Postgres) → "dd/mm/aaaa"
 */
export function reporteFechaCorta(createdAt: string | null | undefined): string | null {
  if (createdAt == null || !String(createdAt).trim()) return null;
  const d = parseISO(String(createdAt).replace(" ", "T"));
  if (!isValid(d)) return null;
  return format(d, "dd/MM/yyyy", { locale: es });
}

/**
 * Texto relativo: "hace 5 minutos" (es)
 */
export function reporteFechaRelativa(createdAt: string | null | undefined): string | null {
  if (createdAt == null || !String(createdAt).trim()) return null;
  const s = String(createdAt);
  const d = parseISO(s.replace(" ", "T"));
  if (!isValid(d)) return null;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}
