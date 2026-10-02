import type { TRepoDocument } from "@/lib/documents";

export interface DocumentSection {
  letter: string;
  documents: TRepoDocument[];
}

// Case- and diacritic-insensitive title ordering for the alphabetical index.
export function compareTitles(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

// Non-letter initials (none in the seed) bucket under "#" so nothing drops.
export function initialOf(title: string): string {
  const char = title.trim().charAt(0).toUpperCase();
  return char >= "A" && char <= "Z" ? char : "#";
}

export function groupByInitial(
  documents: TRepoDocument[],
): DocumentSection[] {
  const sorted = [...documents].sort((a, b) =>
    compareTitles(a.title, b.title),
  );

  const byLetter = new Map<string, TRepoDocument[]>();
  for (const document of sorted) {
    const letter = initialOf(document.title);
    const list = byLetter.get(letter) ?? [];
    list.push(document);
    byLetter.set(letter, list);
  }

  return [...byLetter.entries()].map(([letter, docs]) => ({
    letter,
    documents: docs,
  }));
}

export function searchDocuments(
  documents: TRepoDocument[],
  query: string,
): TRepoDocument[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return documents;
  return documents.filter((document) =>
    document.title.toLowerCase().includes(needle),
  );
}