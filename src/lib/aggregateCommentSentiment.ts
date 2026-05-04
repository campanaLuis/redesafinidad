import type { SocialCommentRow } from "@/hooks/useSocialPlatformStats";

export type OverallSentiment = {
  total: number;
  counts: { positivo: number; neutro: number; negativo: number };
  pct: { positivo: number; neutro: number; negativo: number };
};

/**
 * Distribución global de sentimiento en todos los comentarios (todas las redes).
 * Neutro = cualquier valor distinto de positivo/negativo.
 */
export function aggregateOverallSentiment(
  commentsByPlatform: Record<string, SocialCommentRow[]> | null | undefined,
): OverallSentiment | null {
  if (!commentsByPlatform) return null;

  let positivo = 0;
  let neutro = 0;
  let negativo = 0;

  for (const rows of Object.values(commentsByPlatform)) {
    for (const row of rows) {
      const s = (row.sentimiento || "").toLowerCase();
      if (s === "positivo") positivo++;
      else if (s === "negativo") negativo++;
      else neutro++;
    }
  }

  const total = positivo + neutro + negativo;
  if (total === 0) {
    return {
      total: 0,
      counts: { positivo: 0, neutro: 0, negativo: 0 },
      pct: { positivo: 0, neutro: 0, negativo: 0 },
    };
  }

  return {
    total,
    counts: { positivo, neutro, negativo },
    pct: {
      positivo: (positivo / total) * 100,
      neutro: (neutro / total) * 100,
      negativo: (negativo / total) * 100,
    },
  };
}
