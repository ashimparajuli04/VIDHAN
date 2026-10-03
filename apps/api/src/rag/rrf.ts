// Reciprocal-rank fusion of two ranked lists. `score = Σ 1/(k + rank)` with a
// 1-based rank; the constant dampens the tail so a single list's top hit does
// not dominate. Returns ids ordered by descending fused score.
const RRF_K = 60;

export function rrfFuse<T>(
  lists: T[][],
  keyOf: (item: T) => string,
  limit: number,
): T[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  for (const list of lists) {
    list.forEach((item, index) => {
      const key = keyOf(item);
      items.set(key, item);
      scores.set(key, (scores.get(key) ?? 0) + 1 / (RRF_K + index + 1));
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .flatMap(([key]) => {
      const item = items.get(key);
      return item ? [item] : [];
    });
}

export { RRF_K };
