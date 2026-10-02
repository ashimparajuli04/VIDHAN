All decisions locked. Here's the final plan.
Final schema (D1 / SQLite)
CREATE TABLE documents (
  document_id       TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  document_type     TEXT NOT NULL,
  instrument_number TEXT,            -- NULL when unknown
  year_bs           INTEGER,
  year_ad           INTEGER,
  source_file       TEXT,
  page_count        INTEGER,
  default_unit_kind TEXT,            -- section | rule | article
  summary           TEXT,            -- whole-document abstract (nullable)
  node_types        TEXT NOT NULL,   -- edge-map manifest JSON
  metadata          TEXT DEFAULT '{}'
);

CREATE TABLE nodes (
  node_id     INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(document_id),
  parent_id   INTEGER REFERENCES nodes(node_id),
  kind        TEXT NOT NULL,         -- Section|Article|Rule|Part|Chapter|Preamble|Annex
  level       INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  number      TEXT,
  title       TEXT,
  body        TEXT NOT NULL,         -- leaf: full text incl. deeper structure; non-leaf: own intro
  content     TEXT NOT NULL,         -- own + descendants
  ordinal     INTEGER NOT NULL,
  path        TEXT NOT NULL,         -- "constitution/3/article-18"
  breadcrumb  TEXT,
  metadata    TEXT DEFAULT '{}',
  UNIQUE(document_id, path)
);
CREATE INDEX idx_nodes_tree ON nodes(document_id, parent_id, ordinal);

CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title, body, content='nodes', content_rowid='node_id', tokenize='unicode61'
);
-- + sync triggers
Manifest format (validated by MANIFEST.schema.json)
{ "root": ["Part"], "edges": { "Part": ["Article", "Schedule"] } }
Converter (convert/convert.ts)
1. Per dir: parse INDEX.md header → documents row; parse frontmatter with a YAML parser.
2. Per page: keep only ## Page content; strip www.lawcommission.gov.np, trailing page numbers, the 289 continuation notes.
3. Concatenate all pages in numeric order (no gaps confirmed).
4. Split on ^### (Section|Article|Rule)\s+<number>; leading text → Preamble.
5. Attach units to Part/Chapter via the edge-map manifest and starting-page frontmatter; cap at level 3 (deeper text stays in leaf body).
6. Compute ordinal, path, breadcrumb, content (bottom-up rollup).
7. Fallback bucket: any unattachable text → Preamble/Annex node, never dropped.
8. Emit batched import.sql for wrangler d1 execute --file.
Verification (convert/verify.ts) — required
- Reconciliation: source_chars − stripped == Σ body chars per document.
- Round-trip: rebuild each doc from DB, diff vs source; expect only known boilerplate.
- QA report: duplicate heading groups, trailing heading-less pages (poliru 11), empty bodies, number mismatches vs INDEX.