# RAG Database Design for Legal Citation Formatting (Nepal Legal Corpus)

## 1. Objective

The goal of this design is to structure Nepal's legal documents (Constitutions, Acts, Rules, Regulations, Codes, Ordinances, Schedules, Annexes, and Forms) so that a RAG-based chatbot can consistently return answers in the exact canonical citation format, e.g.:

> `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a) (Freedom of opinion and expression)`

This must work uniformly across all document types present in the corpus.

## 2. Core Design Principles

1. **Chunk by citeable units, not token windows** – The smallest retrievable unit must be the smallest legally citeable provision (leaf node).
2. **Pre-compute citations** – Store canonical citation strings at the provision/chunk level. The LLM must return the stored citation, not reconstruct it.
3. **Hierarchy-aware & schema-agnostic** – Handle terminology differences (Articles in Constitution vs. Sections in Acts/Rules/Codes) via flexible hierarchy fields.
4. **Preserve original fidelity** – Retain exact numbering, punctuation, labels (English/Nepali, `(a)`, `(क)`, `(१)`, `(i)`) as in original PDFs.
5. **Full parent chain grounding** – Every atomic provision carries its complete ancestor hierarchy to ensure unambiguous citations.
6. **Archival-first** – Keep both structured (JSON/tree) and flattened (provisions table) representations. Never lose original page boundaries, tables, schedules, or annexes.
7. **Deterministic formatting** – Citation generation must be rule-based (pre-computed) to guarantee consistency across 100+ documents.
8. **Amendment/version ready** – Design supports `status`, versioning, repeals, and amendments without breaking citation integrity.

## 3. Data Model Overview (High-Level)

| Layer | Purpose |
|---|---|
| `documents` | Document-level metadata + archival blobs (structured JSON, page-wise text, raw/markdown). |
| `provisions` | **Atomic citeable provisions** (recommended retrieval unit). One row = smallest citeable unit (leaf). Flattened from hierarchy with full citation metadata. |
| `chunks` | Optional sub-chunks if a provision is very long. Always inherit full citation from parent. |
| `embeddings` | Vector embeddings linked to `provisions` (preferred) or `chunks` for semantic search. |
| `citations_index` | Denormalized citation lookup (exact/fuzzy/trigram) to support citation-based queries and guardrails. |

## 4. Table Definitions

### 4.1 `documents`

Stores per-document metadata, provenance, and full extracted content.

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `id` | UUID | PK | `7f5b2f42-...` | Primary key |
| `document_slug` | VARCHAR(512) | UNIQUE, NOT NULL | `constitution_of_nepal_2nd_amendment` | Machine-friendly dedup key |
| `priority_group` | VARCHAR(100) | NULL | `p1`, `Priority_05_Government_Administration` | Original folder grouping |
| `category` | VARCHAR(150) | NULL | `Land_Surveying_Property_Enactments` | Domain/category |
| `document_type` | VARCHAR(50) | NOT NULL | `Constitution`, `Act`, `Rules`, `Regulation`, `Code`, `Ordinance` | Drives citation hierarchy order |
| `title_en` | TEXT | NOT NULL | `Constitution of Nepal` | Canonical English title |
| `title_np` | TEXT | NULL | `नेपालको संविधान` | Original Nepali title |
| `document_short` | VARCHAR(255) | NULL | `Constitution` | Short citation form |
| `act_number` | VARCHAR(50) | NULL | `2034`, `2064` | Act/Rule/Ordinance number (string) |
| `year_bs` | INT | NULL | `2072`, `2034` | Bikram Sambat |
| `year_ad` | INT | NULL | `2015`, `1977` | Gregorian |
| `language` | VARCHAR(50) | NOT NULL | `English`, `Nepali`, `Mixed`, `Bilingual` | Document language |
| `jurisdiction` | VARCHAR(50) | DEFAULT 'Nepal' | `Nepal` | Jurisdiction |
| `file_name` | VARCHAR(512) | NOT NULL | `Constitution of Nepal (2nd amd. English)_xf33zb3.pdf` | Original filename |
| `file_path` | TEXT | NOT NULL | `C:\Users\yadev\Desktop\p1-30\p1\...pdf` | Source path |
| `file_hash` | CHAR(64) | NULL | `sha256` | Deduplication/provenance |
| `page_count` | INT | NULL | `305` | Total pages |
| `status` | VARCHAR(50) | DEFAULT 'unknown' | `in_force`, `repealed`, `amended`, `partially_repealed`, `unknown` | Legal status |
| `preamble` | TEXT | NULL | (full preamble) | Preamble text |
| `content_structured` | JSONB | NULL | (tree JSON) | Full hierarchy (Parts/Chapters/Arts/Secs/Schedules) |
| `content_by_page` | JSONB | NULL | `[{"page":1,"text":"..."}]` | Page-wise extraction (citation-critical) |
| `content_markdown` | TEXT | NULL | (full MD) | Clean Markdown (LLM/RAG) |
| `raw_text` | TEXT | NULL | (raw text) | Unprocessed fallback |
| `tables` | JSONB | NULL | `[{"table_id":1,"page":5,"headers":[],"rows":[]}]` | Extracted tables |
| `schedules_annexes` | JSONB | NULL | (schedules/annexes/forms) | Substantive content blocks |
| `definitions` | JSONB | NULL | `[{"term":"...","definition":"...","ref":"Sec 2(a)"}]` | Definition list |
| `cross_references` | JSONB | NULL | `[{"ref":"Section 3 of Act X 2049","target_doc":null}]` | Inter-document refs |
| `extracted_at` | TIMESTAMP WITH TIME ZONE | NOT NULL DEFAULT NOW() | `2026-10-02T...` | Extraction time |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Last update |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Ingestion time |

### 4.2 `provisions` (Atomic Citeable Provisions) – **Core Retrieval Unit**

One row = smallest citeable unit (leaf). Stores full hierarchy, pre-computed citation strings/parts, text, and provenance.

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `id` | UUID | PK | `d96b...` | Provision ID |
| `document_id` | UUID | FK → documents.id, NOT NULL, ON DELETE CASCADE | `7f5b...` | Parent document |
| `parent_id` | UUID | FK → provisions.id (self), NULL | (parent UUID) | Tree parent (attach proviso/explanation) |
| `level` | VARCHAR(50) | NOT NULL | `subclause`, `clause`, `section`, `article`, `preamble`, `schedule`, `annex`, `form`, `proviso`, `explanation`, `definition`, `paragraph`, `item`, `part`, `chapter`, `subsection`, `subrule` | Node type |
| `hierarchy_path` | TEXT | NOT NULL | `article:17/clause:2/subclause:a` | Stable machine path |
| `depth` | INT | NULL | `5` | Nesting depth |
| `order_index` | INT | NOT NULL | `42` | Original document order |

**Hierarchy Numbers/Labels**

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `part_no` | VARCHAR(50) | NULL | `Part-3`, `Part I` | Part number/label |
| `part_title` | TEXT | NULL | `Fundamental Rights and Duties` | Part title |
| `chapter_no` | VARCHAR(50) | NULL | `Chapter 2` | Chapter |
| `chapter_title` | TEXT | NULL | `Fundamental Rights` | Chapter title |
| `article_no` | VARCHAR(50) | NULL | `17` | Constitution Articles |
| `section_no` | VARCHAR(50) | NULL | `3` | Acts/Rules/Codes/Regs |
| `rule_no` | VARCHAR(50) | NULL | `5` | Rules/Regulations |
| `regulation_no` | VARCHAR(50) | NULL | `2` | Regulations |
| `subsection_no` | VARCHAR(50) | NULL | `(1)`, `1` | Preserve original format |
| `subrule_no` | VARCHAR(50) | NULL | `(2)` | Sub-rule |
| `clause_no` | VARCHAR(50) | NULL | `(2)`, `(b)`, `(क)` | Clause |
| `subclause_no` | VARCHAR(50) | NULL | `(a)`, `(i)`, `(१)` | Sub-clause |
| `paragraph_no` | VARCHAR(50) | NULL | `(A)`, `Para 1` | Paragraph |
| `item_no` | VARCHAR(50) | NULL | `(1)`, `item (i)` | Item/list |
| `schedule_no` | VARCHAR(50) | NULL | `Schedule 1`, `First Schedule` | Schedule |
| `schedule_title` | TEXT | NULL | `Form of Application` | Schedule title |
| `annex_no` | VARCHAR(50) | NULL | `Annex-A` | Annex |
| `form_no` | VARCHAR(50) | NULL | `Form 1` | Form |

**Titles & Flags**

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `heading_title` | TEXT | NULL | `Freedom of opinion and expression` | Marginal/section/article heading |
| `provision_title` | TEXT | NULL | `Freedom of opinion and expression` | Title for parenthetical |
| `is_preamble` | BOOLEAN | DEFAULT FALSE | `TRUE` | Preamble block |
| `is_proviso` | BOOLEAN | DEFAULT FALSE | `TRUE` | Starts with "Provided that..." |
| `is_explanation` | BOOLEAN | DEFAULT FALSE | `TRUE` | Explanation/Note |
| `is_definition` | BOOLEAN | DEFAULT FALSE | `TRUE` | Definition clause/block |
| `is_schedule_annex` | BOOLEAN | DEFAULT FALSE | `FALSE` | Schedule/Annex/Form unit |

**Pre-computed Citations (Critical)**

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `citation_parts` | JSONB | NOT NULL | `["Article 17","Clause (2)","Sub-clause (a)"]` | Ordered non-null hierarchy parts (deterministic) |
| `citation_string_canonical` | TEXT | NOT NULL | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a)` | Canonical (no parenthetical title) |
| `citation_string_full` | TEXT | NULL | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a) (Freedom of opinion and expression)` | **Full citation to return in answers** |
| `citation_string_short` | VARCHAR(255) | NULL | `Art. 17(2)(a)` | Compact form |
| `citation_normalized` | TEXT | NULL | `constitution of nepal article 17 clause 2 subclause a` | Lowercased normalized |
| `compact_key` | VARCHAR(255) | NULL | `nep_const_art17_cl2_suba` | Deterministic compact key |

**Content & Provenance**

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `text` | TEXT | NOT NULL | (full clean text) | Complete clean text of this citeable unit |
| `page_start` | INT | NULL | `23` | First page |
| `page_end` | INT | NULL | `23` | Last page |
| `page_range` | VARCHAR(50) | NULL | `23-24` | Page range string |
| `line_start` | INT | NULL | `412` | Line start (optional) |
| `line_end` | INT | NULL | `418` | Line end (optional) |
| `has_tables` | BOOLEAN | DEFAULT FALSE | `TRUE` | Contains tables |
| `tables_ref` | JSONB | NULL | `["t1","t2"]` or table objects | References to `documents.tables` |
| `footnotes` | JSONB | NULL | `[{"marker":"*","text":"...","page":23}]` | Footnotes in this provision |
| `token_count` | INT | NULL | `87` | Estimated tokens |
| `char_count` | INT | NULL | `412` | Character count |
| `confidence` | NUMERIC(3,2) | DEFAULT 1.00 CHECK (confidence BETWEEN 0 AND 1.00) | `0.98` | Parsing confidence |
| `extracted_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Extraction timestamp |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Row created |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Row updated |

**Indexes (recommended):**

```sql
CREATE INDEX IF NOT EXISTS idx_provisions_document_id ON provisions(document_id);
CREATE INDEX IF NOT EXISTS idx_provisions_parent_id ON provisions(parent_id);
CREATE INDEX IF NOT EXISTS idx_provisions_level ON provisions(level);
CREATE INDEX IF NOT EXISTS idx_provisions_hierarchy_path ON provisions(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_provisions_order_index ON provisions(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_provisions_canonical_trgm ON provisions USING gin (citation_string_canonical gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provisions_full_trgm ON provisions USING gin (citation_string_full gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_provisions_doc_type ON provisions(document_id, level);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provisions_doc_path ON provisions(document_id, hierarchy_path);
```

### 4.3 `chunks` (Optional Sub-Chunks)

Use only if a single provision is very long. **Must inherit all citation fields** from parent.

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `id` | UUID | PK | `ae43...` | Chunk ID |
| `provision_id` | UUID | FK → provisions.id, NOT NULL, ON DELETE CASCADE | `d96b...` | Parent provision |
| `document_id` | UUID | FK → documents.id, NOT NULL | `7f5b...` | Denormalized |
| `chunk_index` | INT | NOT NULL | `0`, `1` | Order within provision |
| `chunk_text` | TEXT | NOT NULL | (text slice) | Chunk content |
| `token_count` | INT | NULL | `256` | Tokens |
| `char_count` | INT | NULL | `1180` | Chars |
| `overlap_with_prev` | INT | DEFAULT 0 | `50` | Overlap (if sliding window) |
| `page_start` | INT | NULL | `23` | Page start |
| `page_end` | INT | NULL | `23` | Page end |
| `citation_string_canonical` | TEXT | NOT NULL | (inherited) | Inherited – do not recompute |
| `citation_string_full` | TEXT | NOT NULL | (inherited) | Inherited |
| `citation_parts` | JSONB | NOT NULL | (inherited) | Inherited |
| `hierarchy_path` | TEXT | NOT NULL | (inherited) | Inherited |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Created |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_chunks_provision_id ON chunks(provision_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
```

### 4.4 `embeddings` (Vector Index)

Semantic search. Prefer linking to `provisions` (recommended).

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `id` | UUID | PK | `eb92...` | Embedding ID |
| `provision_id` | UUID | FK → provisions.id, NULL, ON DELETE CASCADE | `d96b...` | Link to provision (preferred) |
| `chunk_id` | UUID | FK → chunks.id, NULL, ON DELETE CASCADE | `ae43...` | Link to chunk (if used). Enforce one-of. |
| `document_id` | UUID | FK → documents.id, NOT NULL | `7f5b...` | Denormalized filter |
| `embedding` | VECTOR(<dim>) | NOT NULL | `[0.0123,...]` | Dense vector (pgvector) |
| `embedding_model` | VARCHAR(150) | NOT NULL | `bge-m3`, `text-embedding-3-large` | Embedding model |
| `embedding_dim` | INT | NOT NULL | `1024`, `3072` | Dimensions |
| `content_type` | VARCHAR(50) | DEFAULT 'text' | `text`, `table`, `definition`, `schedule`, `annex` | Content type |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Created |

**Vector index (pgvector):**

```sql
-- HNSW (recommended for quality+speed)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Optional: filter by document
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_provision_id ON embeddings(provision_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
```

**Constraint (one target):**

```sql
ALTER TABLE embeddings
  ADD CONSTRAINT chk_embeddings_single_target
  CHECK ((provision_id IS NOT NULL AND chunk_id IS NULL) OR (provision_id IS NULL AND chunk_id IS NOT NULL));
```

### 4.5 `citations_index` (Denormalized Citation Lookup)

Fast exact/fuzzy citation lookup and search keys.

| Column | Data Type | Constraints | Example | Description |
|---|---|---|---|---|
| `id` | UUID | PK | `c9a7...` | ID |
| `provision_id` | UUID | FK → provisions.id, UNIQUE, NOT NULL, ON DELETE CASCADE | `d96b...` | 1:1 with provision |
| `document_id` | UUID | FK → documents.id, NOT NULL | `7f5b...` | Parent document |
| `document_type` | VARCHAR(50) | NOT NULL | `Constitution` | Doc type |
| `canonical_citation` | TEXT | NOT NULL | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a)` | Canonical |
| `full_citation` | TEXT | NOT NULL | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a) (Freedom of opinion and expression)` | Full |
| `compact_citation` | VARCHAR(255) | NULL | `Const. Nepal, Art. 17(2)(a)` | Compact |
| `citation_normalized` | TEXT | NULL | `constitution of nepal article 17 clause 2 subclause a` | Normalized lowercase |
| `citation_key_compact` | VARCHAR(255) | NULL | `nep_const_art17_cl2_suba` | Deterministic key |
| `search_keys` | TSVECTOR | NULL | (tsvector) | Full-text search vector |
| `level_key` | VARCHAR(50) | NULL | `subclause` | Leaf level |
| `article_no_norm` | VARCHAR(50) | NULL | `17` | Normalized |
| `section_no_norm` | VARCHAR(50) | NULL | `3` | Normalized |
| `rule_no_norm` | VARCHAR(50) | NULL | `5` | Normalized |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | `2026-10-02T...` | Created |

**Indexes:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_index_provision ON citations_index(provision_id);
CREATE INDEX IF NOT EXISTS idx_citations_canonical_trgm ON citations_index USING gin (canonical_citation gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_citations_full_trgm ON citations_index USING gin (full_citation gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_citations_norm_trgm ON citations_index USING gin (citation_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_citations_search_keys ON citations_index USING gin (search_keys);
CREATE INDEX IF NOT EXISTS idx_citations_compact_key ON citations_index(citation_key_compact);
CREATE INDEX IF NOT EXISTS idx_citations_document_id ON citations_index(document_id);
```

## 5. `content_structured` JSON Schema (Reference)

Canonical tree stored in `documents.content_structured` (JSONB).

```json
{
  "preamble": "Whereas it is expedient...",
  "parts": [
    {
      "number": "Part-3",
      "title": "Fundamental Rights and Duties",
      "order_index": 1,
      "chapters": [
        {
          "number": "2",
          "title": "Fundamental Rights",
          "order_index": 1,
          "articles": [
            {
              "number": "17",
              "title": "Freedom of opinion and expression",
              "order_index": 17,
              "body": "Every citizen shall have the freedom...",
              "clauses": [
                {
                  "number": "(2)",
                  "body": "Nothing in sub-clause (a)...",
                  "order_index": 2,
                  "subclauses": [
                    {
                      "number": "(a)",
                      "body": "in the interests of sovereignty, territorial integrity, national security, public peace, stability and public order...",
                      "order_index": 1
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "schedules": [
    {
      "number": "First Schedule",
      "title": "...",
      "order_index": 1,
      "body": "...",
      "items": []
    }
  ],
  "annexes": [],
  "forms": [],
  "rules": [],
  "regulations": []
}
```

## 6. Citation Construction Rules

### 6.1 Hierarchy Order by Document Type

Concatenate **only non-null** levels in order:

| `document_type` | Order of Citation Levels |
|---|---|
| `Constitution` | `Document Title` → `Part` → `Chapter` (if present) → `Article` → `Clause` → `Sub-clause` → `Paragraph` → `Item` |
| `Act` | `Document Title, [Act Number, Year BS/AD]` → `Part` → `Chapter` → `Section` → `Subsection` → `Clause` → `Sub-clause` → `Paragraph` → `Item` |
| `Rules` | `Document Title, [Year BS/AD]` → `Part` → `Chapter` → `Rule` → `Sub-rule` → `Clause` → `Sub-clause` → `Paragraph` → `Item` |
| `Regulation` | `Document Title, [Year BS/AD]` → `Part` → `Chapter` → `Regulation` → `Clause` → `Sub-clause` → `Paragraph` → `Item` |
| `Code` | `Document Title` → `Part`/`Book` → `Chapter/Title` → `Section/Article` → `Subsection` → `Clause` → `Sub-clause` → `Paragraph` → `Item` |
| `Ordinance` | Same as `Act` (include Ordinance reference if present) |
| `Schedule`/`Annex`/`Form` | `Document Title` → `Schedule/Annex/Form [No./Name]` → `Part/Chapter` → `Paragraph/Item/Clause/Sub-clause` |

### 6.2 Deterministic Formatting Logic

**Step 1: Base title**
```text
base = title_en
```

**Step 2: Act/Rule/Year suffix (when applicable)**
- If `document_type IN ('Act','Ordinance')` and `act_number` exists: append `", {act_number}"`
- If `year_bs` exists: append `", {year_bs} (BS)"` OR prefer `", {year_bs}"` as in Nepal citations (commonly `Land Revenue Act, 2034`). Recommended: `", {act_number or ''}", trim -> ", {year_bs}"` (drop BS if corpus standard uses BS year). Use `", {year_bs}"` by default for BS-heavy corpus.
- If only `year_ad`: append `", {year_ad}"`
- Apply after title, before hierarchy parts (e.g. `Land Revenue Act, 2034, ...`)

**Step 3: Build `citation_parts[]` (in order, skip NULL/empty)**
Examples:
- Constitution: `["Article 17","Clause (2)","Sub-clause (a)"]`
- Act (expanded): `["Section 3","Subsection (1)","Clause (a)"]` (preferred) OR compact `["Section 3(1)(a)"]`. **Preferred expanded** for uniform cross-doc formatting.

**Step 4: Canonical**
```text
citation_string_canonical = trim("{title_en}{act_year_suffix}, {join(', ', citation_parts)}")
```

**Step 5: Full (with parenthetical title)**
```text
t = coalesce(provision_title, heading_title)
if t is not null and t <> '' and lower(t) not in lower(citation_string_canonical):
  citation_string_full = citation_string_canonical + " (" + trim(t) + ")"
else:
  citation_string_full = citation_string_canonical
```

Rules:
- Preserve **exact original numbering** (`(1),(2),(a),(b),(i),(ii),(क),(ख),(१),(२)`) – no normalization/reordering.
- Only append non-null hierarchy levels.
- Treat `Proviso`/`Explanation` as attached to parent (`parent_id`) unless citing explicitly as a distinct unit.
- For Schedules/Annexes/Forms, cite by their reference (Schedule/Annex/Form No./Name) explicitly.
- Avoid redundant parenthetical (skip if title already implied).

## 7. Parsing & Extraction (Recommended Tools)

| Task | Tool/Approach | Notes |
|---|---|---|
| Layout-aware PDF extraction | [Docling](https://github.com/docling-project/docling) | Best for tables, TOC, hierarchy, multi-layout PDFs |
| Page/table extraction | [pdfplumber](https://github.com/jsvine/pdfplumber) | Precise table/line/page boundaries |
| Scanned PDFs (OCR) | [OCRmyPDF](https://ocrmypdf.readthedocs.io/) + Tesseract (eng+nep/Devanagari) | Legacy/scanned docs |
| Hierarchy/TOC detection | Docling TOC + custom rules | Build tree before flattening to provisions |
| English numbering | Regex | `(Article|Section|Sec\.?|Rule|Sub-rule|Regulation|Sub-section)\s+([A-Z0-9IVXivx\.\-]+)` |
| Nepali/Devanagari numbering | Regex | `\(([०-९]+|[क-ज्ञख-ह]|[a-zA-Z]|[ivxIVX]+)\)`, Devanagari digits `([०-९]+)` |
| Proviso/Explanation | Regex | `^(Provided that|Provided, that|Explanation|Explanation\:?|Note|Note\:?|स्पष्टीकरण|नोट)` → set flags + `parent_id` |
| Definitions (Sec/Art 2) | `means|includes|shall mean|परिभाषित|भन्नाले` | Populate `definitions`, `is_definition` |

## 8. RAG Implementation Guidelines

| Aspect | Recommendation | Rationale |
|---|---|---|
| **Retrieval unit** | Embed `provisions.text` (preferred). Use `chunks` only if length degrades retrieval. | Matches citeable atomicity + clean citation grounding. |
| **Retrieval strategy** | Hybrid (Dense + BM25/Keyword). Add citation filters if user cites (Art/Sec/Rule). | Legal terms (exact numbering/labels) + semantic meaning. |
| **Reranking** | Cross-encoder reranker (e.g. `bge-reranker-v2-m3`) on top-K | Improves precision for legal queries. |
| **Context assembly** | Return: `text`, `citation_string_full`, `document_title`, `document_type`, `page_start`, `page_end`, `page_range`, `hierarchy_path`, `provision_id`, `document_id` | Full grounding + verifiable citations. |
| **System prompt (enforcement)** | Strict: *"Answer ONLY using retrieved provisions. Use `citation_string_full` exactly as provided for each cited provision. Do NOT invent, reorder, paraphrase, or abbreviate the citation hierarchy. Quote relevant text concisely. Include page reference (Page {page_start}{–page_end}) when available. If uncertain, state retrieved basis only."* | Forces citation discipline. |
| **Grounding metadata** | Return structured citations array: `[{provision_id, document_id, citation_string_full, page_start, page_end, score}]` alongside answer | Verifiable, machine-checkable citations. |
| **Post-validation** | Require answer to include document title + >=1 numbered unit (Article/Section/Rule + hierarchy). If fails, retry with stricter instruction. | Guardrail against hallucinations. |
| **Embeddings** | Multilingual: `bge-m3`, `voyage-multilingual-2`, `text-embedding-3-large` | Nepali + English mixed corpus. |
| **Index choice** | pgvector HNSW (cosine) | Good balance of recall/latency/quality. |

## 9. Example Data (Reference)

### 9.1 Constitution of Nepal – Article 17(2)(a)

| Field | Value |
|---|---|
| `document_type` | `Constitution` |
| `title_en` | `Constitution of Nepal` |
| `article_no` | `17` |
| `clause_no` | `(2)` |
| `subclause_no` | `(a)` |
| `level` | `subclause` |
| `hierarchy_path` | `article:17/clause:2/subclause:a` |
| `citation_parts` | `["Article 17","Clause (2)","Sub-clause (a)"]` |
| `citation_string_canonical` | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a)` |
| `citation_string_full` | `Constitution of Nepal, Article 17, Clause (2), Sub-clause (a) (Freedom of opinion and expression)` |
| `text` | `in the interests of sovereignty, territorial integrity, national security, public peace, stability and public order...` |

### 9.2 Land Revenue Act, 2034 (BS) – Section 3(1)(a)

| Field | Value |
|---|---|
| `document_type` | `Act` |
| `title_en` | `Land Revenue Act, 2034` |
| `act_number` | `2034` |
| `year_bs` | `2034` |
| `section_no` | `3` |
| `subsection_no` | `(1)` |
| `clause_no` | `(a)` |
| `level` | `clause` |
| `hierarchy_path` | `section:3/subsection:1/clause:a` |
| `citation_parts` | `["Section 3","Subsection (1)","Clause (a)"]` |
| `citation_string_canonical` | `Land Revenue Act, 2034, Section 3(1)(a)` |
| `citation_string_full` | `Land Revenue Act, 2034, Section 3(1)(a) (Definitions)` |
| `text` | (clean clause text) |

## 10. Minimal Viable Schema (MVP Recommendation)

To cover **all content for all documents** with least complexity, implement:

1. **`documents`** – Full metadata + archival JSON (content_structured, content_by_page, tables, schedules_annexes)
2. **`provisions`** – Atomic citeable units with **all** `citation_*` fields + `text` + `page_start/page_end/page_range`
3. **`embeddings`** – Linked to `provisions.id` (preferred)

Defer `chunks` and `citations_index` until scale/lookup performance requires them. The `citation_string_full` + `citation_parts` on `provisions` are sufficient to guarantee the exact requested format.

## 11. Design Summary

- **Single source-of-truth for citations:** `provisions.citation_string_full` (pre-computed at ingestion/parsing).
- **Retrieval = citeable atomicity:** Provisions (leaf-level) ensure answers map 1:1 to legal citations.
- **Uniform across all doc types:** Schema-agnostic hierarchy + type-based ordering covers Constitution, Acts, Rules, Regulations, Codes, Ordinances, Schedules, Annexes, Forms.
- **Preserves legal fidelity:** Page boundaries + original numbering + tables + schedules + annexes fully retained.
- **RAG-ready + verifiable:** Every answer can be grounded to (`provision_id`, `document_id`, pages, full citation) with no citation hallucinations.