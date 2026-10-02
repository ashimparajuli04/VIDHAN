export function rrf(rankings: number[][], k = 60): number[] {
  const scores = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((doc, rank) => {
      scores.set(doc, (scores.get(doc) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([doc]) => doc);
}
