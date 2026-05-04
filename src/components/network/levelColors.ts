// Level color mapping - unique colors for each level (shared across NetworkMap and NetworkListView)
export const levelColors: Record<number, { bg: string; text: string; border: string; ring: string }> = {
  1: { bg: 'bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500', ring: 'ring-emerald-500' },
  2: { bg: 'bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500' },
  3: { bg: 'bg-sky-500/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-500', ring: 'ring-sky-500' },
  4: { bg: 'bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500', ring: 'ring-rose-500' },
  5: { bg: 'bg-violet-500/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500', ring: 'ring-violet-500' },
  6: { bg: 'bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500', ring: 'ring-cyan-500' },
  7: { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500', ring: 'ring-orange-500' },
  8: { bg: 'bg-pink-500/20', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-500', ring: 'ring-pink-500' },
  9: { bg: 'bg-teal-500/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500', ring: 'ring-teal-500' },
  10: { bg: 'bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500', ring: 'ring-indigo-500' },
};

export function getLevelColor(level: number) {
  return levelColors[level] || levelColors[10];
}
