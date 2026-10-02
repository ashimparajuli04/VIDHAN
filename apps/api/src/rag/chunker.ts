export interface ChunkOptions {
  /** Soft ceiling per chunk (chars). Cuts prefer paragraph boundaries. */
  maxLength?: number;
  /** Minimum chunk length before a boundary is acceptable. */
  minLength?: number;
}

// HOW CHUNKING WORKS
// ------------------
// chunk() partitions text into ~2000-char pieces for storage and streaming
// (document_chunks table, served by GET /docs/:id/content). The reader
// renders chunks back-to-back as one continuous document, so chunks must
// NOT overlap — duplicated sentences would visibly repeat. Overlap is only
// meaningful for embedding/retrieval, which this app does not do yet.
//
// The cut algorithm walks the window [start, start+maxLength]:
//   1. it never cuts before start+minLength, so chunks near the end of a
//      document don't fragment into slivers;
//   2. it looks for the LAST paragraph break ("\n\n") inside the window and
//      cuts right after it — this is what keeps markdown headings and list
//      blocks intact, since those always sit on their own lines;
//   3. if there is none, it relaxes the boundary: last single newline
//      ("\n"), then sentence end (". "), then plain space;
//   4. only if no word boundary exists in the window does it hard-cut at
//      the ceiling (a run of ~2000 chars without a space — rare for legal
//      prose).
// findCut() implements 2-4: for each delimiter in order of preference it
// returns the occurrence closest to the ceiling (lastIndexOf), so chunks
// stay near maxLength — a paragraph break anywhere in the window wins over
// a space near the ceiling.
//
// chunkPlan() is the same algorithm but reports each piece's start offset
// in the source text. The ingest script uses those offsets to attach a
// table of contents (headings -> chunk) without reparsing.
const DEFAULT_MAX_LENGTH = 2000;
const DEFAULT_MIN_LENGTH = 800;

export interface ChunkPiece {
  content: string;
  /** Character offset of `content` inside the text given to chunkPlan. */
  start: number;
}

export function chunkPlan(text: string, options: ChunkOptions = {}): ChunkPiece[] {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const pieces: ChunkPiece[] = [];

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    if (end === text.length) {
      pieces.push({ start, content: text.slice(start) });
      break;
    }

    const earliest = start + minLength;
    const cut = findCut(text, end, earliest);
    pieces.push({ start, content: text.slice(start, cut) });
    start = cut;
  }

  return pieces.filter((piece) => piece.content.trim().length > 0);
}

export function chunk(text: string, options: ChunkOptions = {}): string[] {
  return chunkPlan(text.trim(), options).map((piece) => piece.content);
}

// Boundary preference: paragraph break, then single newline, then sentence
// end; the LAST occurrence inside the window wins (farthest cut keeps
// chunks near maxLength). Falls back to a hard cut at `end`.
function findCut(source: string, end: number, earliest: number): number {
  const delimiters: readonly string[] = ["\n\n", "\n", ". ", " "];
  for (const delimiter of delimiters) {
    const found = source.lastIndexOf(delimiter, end - 1);
    if (found >= earliest) return found + delimiter.length;
  }
  return end;
}