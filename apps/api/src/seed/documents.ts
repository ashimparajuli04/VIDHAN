import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "..", "..", "..", "data", "documents.seed.sql");

// ~200 documents so the alphabetical repository feels real. Titles come
// from a curated pool of Nepali statutes (English titles, B.S. years);
// the pool is extended deterministically with Rules/Regulations/amendment
// variants — same instrument family, distinct entries, no statuses/tags.
const TARGET_COUNT = 200;
const POOL: { title: string; year: number | null }[] = [
  { title: "Air Transport Act, 2053", year: 2053 },
  { title: "Act Relating to Rights of Persons with Disabilities, 2074", year: 2074 },
  { title: "Administrative Court Act, 2048", year: 2048 },
  { title: "Animals Health and Livestock Services Act, 2055", year: 2055 },
  { title: "Arbitration Act, 2055", year: 2055 },
  { title: "Archives Preservation Act, 2046", year: 2046 },
  { title: "Arms and Ammunition Act, 2019", year: 2019 },
  { title: "Audit Act, 2048", year: 2048 },
  { title: "Bank and Financial Institution Act, 2073", year: 2073 },
  { title: "Banking Offence and Punishment Act, 2064", year: 2064 },
  { title: "Bankruptcy Act, 2063", year: 2063 },
  { title: "Bonus Act, 2030", year: 2030 },
  { title: "Chartered Accountants Act, 2053", year: 2053 },
  { title: "Child Rights Act, 2075", year: 2075 },
  { title: "Citizenship Act, 2063", year: 2063 },
  { title: "Civil Aviation Authority of Nepal Act, 2053", year: 2053 },
  { title: "Civil Code, 2074", year: 2074 },
  { title: "Civil Service Act, 2049", year: 2049 },
  { title: "Commission on Investigation of Abuse of Authority Act, 2048", year: 2048 },
  { title: "Companies Act, 2063", year: 2063 },
  { title: "Competition Promotion and Market Protection Act, 2063", year: 2063 },
  { title: "Constitution of Nepal, 2072", year: 2072 },
  { title: "Consumer Protection Act, 2075", year: 2075 },
  { title: "Contract Act, 2056", year: 2056 },
  { title: "Cooperative Act, 2074", year: 2074 },
  { title: "Copyright Act, 2059", year: 2059 },
  { title: "Criminal Code, 2074", year: 2074 },
  { title: "Customs Act, 2064", year: 2064 },
  { title: "Debt Recovery Act, 2058", year: 2058 },
  { title: "Disaster Risk Reduction and Management Act, 2074", year: 2074 },
  { title: "Domestic Violence (Crime and Punishment) Act, 2066", year: 2066 },
  { title: "Drugs Act, 2035", year: 2035 },
  { title: "Electricity Act, 2049", year: 2049 },
  { title: "Electronic Transactions Act, 2063", year: 2063 },
  { title: "Employee Provident Fund Act, 2019", year: 2019 },
  { title: "Environment Protection Act, 2076", year: 2076 },
  { title: "Evidence Act, 2031", year: 2031 },
  { title: "Extradition Act, 2071", year: 2071 },
  { title: "Fiscal Procedures and Financial Responsibility Act, 2076", year: 2076 },
  { title: "Food Act, 2023", year: 2023 },
  { title: "Foreign Employment Act, 2064", year: 2064 },
  { title: "Foreign Investment and Technology Transfer Act, 2075", year: 2075 },
  { title: "Forest Act, 2076", year: 2076 },
  { title: "Good Governance (Management and Operation) Act, 2064", year: 2064 },
  { title: "Government Proceedings Act, 2047", year: 2047 },
  { title: "Human Trafficking and Transportation (Control) Act, 2064", year: 2064 },
  { title: "Immigration Act, 2049", year: 2049 },
  { title: "Income Tax Act, 2058", year: 2058 },
  { title: "Industrial Enterprises Act, 2076", year: 2076 },
  { title: "Insurance Act, 2079", year: 2079 },
  { title: "Judicial Service Commission Act, 2047", year: 2047 },
  { title: "Kathmandu Valley Development Authority Act, 2045", year: 2045 },
  { title: "Labor Act, 2074", year: 2074 },
  { title: "Land Acquisition Act, 2034", year: 2034 },
  { title: "Land Reform Act, 2021", year: 2021 },
  { title: "Land Revenue Act, 2034", year: 2034 },
  { title: "Local Government Operation Act, 2074", year: 2074 },
  { title: "Mediation Act, 2068", year: 2068 },
  { title: "Mining and Minerals Act, 2042", year: 2042 },
  { title: "Money Laundering Prevention Act, 2064", year: 2064 },
  { title: "Mountaineering Expedition Regulations, 2063", year: 2063 },
  { title: "National Civil Code, 2074", year: 2074 },
  { title: "National Criminal Procedure Code, 2074", year: 2074 },
  { title: "National Human Rights Commission Act, 2069", year: 2069 },
  { title: "National Natural Resources and Fiscal Commission Act, 2074", year: 2074 },
  { title: "National Parks and Wildlife Conservation Act, 2029", year: 2029 },
  { title: "Nepal Police Act, 2013", year: 2013 },
  { title: "Nepal Rastra Bank Act, 2058", year: 2058 },
  { title: "Nepal Telecommunication Authority Act, 2053", year: 2053 },
  { title: "Oaths Act, 2039", year: 2039 },
  { title: "Passport Act, 2023", year: 2023 },
  { title: "Patent, Design and Trademark Act, 2022", year: 2022 },
  { title: "Plant Protection Act, 2064", year: 2064 },
  { title: "Police Act, 2013", year: 2013 },
  { title: "Prevention of Corruption Act, 2059", year: 2059 },
  { title: "Prison Act, 2019", year: 2019 },
  { title: "Public Health Service Act, 2075", year: 2075 },
  { title: "Public Procurement Act, 2063", year: 2063 },
  { title: "Quarantine Act, 2042", year: 2042 },
  { title: "Railways Act, 2075", year: 2075 },
  { title: "Revenue Leakage (Investigation and Control) Act, 2052", year: 2052 },
  { title: "Right to Information Act, 2064", year: 2064 },
  { title: "Secured Transaction Act, 2063", year: 2063 },
  { title: "Securities Act, 2063", year: 2063 },
  { title: "Social Security Act, 2074", year: 2074 },
  { title: "Stamp Act, 2062", year: 2062 },
  { title: "Supreme Court Act, 2048", year: 2048 },
  { title: "Telecommunication Act, 2053", year: 2053 },
  { title: "Tourism Act, 2035", year: 2035 },
  { title: "Trade Union Act, 2049", year: 2049 },
  { title: "Treaty Act, 2047", year: 2047 },
  { title: "Urban Planning and Building Construction Act, 2060", year: 2060 },
  { title: "Value Added Tax Act, 2052", year: 2052 },
  { title: "Vehicle and Transport Management Act, 2049", year: 2049 },
  { title: "Waste Management Act, 2068", year: 2068 },
  { title: "Water Resources Act, 2049", year: 2049 },
  { title: "Youth and Sports Act, 2072", year: 2072 },
];

const VARIANTS = ["Rules", "Ordinance", "First Amendment", "Second Amendment"] as const;
const BASE_TIME = Date.parse("2026-01-15T09:00:00.000Z");
const COVERAGE = "ABCDEFGHIJKLMNOPQRSTUVWY"; // X and Z intentionally uncovered

type VariantKind = (typeof VARIANTS)[number];

function stemOf(title: string): string {
  return title.replace(/,\s*\d{4}\s*$/, "").trim();
}

function buildVariant(
  base: { title: string; year: number | null },
  kind: VariantKind,
  index: number,
): { title: string; year: number | null } {
  // A constitution has no rules — amendments only.
  if (
    base.title.startsWith("Constitution of Nepal") &&
    kind !== "First Amendment" &&
    kind !== "Second Amendment"
  ) {
    kind = index % 2 === 0 ? "First Amendment" : "Second Amendment";
  }
  const year =
    base.year === null || index % 9 === 0
      ? null
      : base.year + (kind === "Rules" || kind === "Ordinance" ? 1 : 2);
  const yearText = year === null ? "" : `, ${year}`;
  return {
    title: `${stemOf(base.title)} (${kind})${yearText}`,
    year,
  };
}

function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase();
}

async function main() {
  const rows: { id: string; title: string; year: number | null; status: "indexed" | "pending" | "failed" }[] = [];

  let variantIndex = 0;
  while (rows.length < TARGET_COUNT) {
    const sourceIndex = rows.length < POOL.length ? rows.length : variantIndex % POOL.length;
    const base = POOL[sourceIndex]!;
    const entry =
      rows.length < POOL.length
        ? { ...base }
        : buildVariant(base, VARIANTS[Math.floor(variantIndex / POOL.length) % VARIANTS.length]!, variantIndex);
    variantIndex++;

    const status: "indexed" | "pending" | "failed" =
      rows.length % 97 === 0 ? "failed" : rows.length % 23 === 0 ? "pending" : "indexed";
    rows.push({
      id: `seed-doc-${String(rows.length + 1).padStart(3, "0")}`,
      ...entry,
      status,
    });
  }

  const missing = [...COVERAGE].filter(
    (letter) => !rows.some((row) => initialOf(row.title) === letter),
  );
  if (missing.length) throw new Error(`letter coverage missing: ${missing.join("")}`);

  const values = rows
    .map((row, rowIndex) => {
      const createdAt = new Date(BASE_TIME + rowIndex * 60_000).toISOString();
      return [
        `'${row.id}'`,
        `'${row.title.replace(/'/g, "''")}'`,
        row.year === null ? "NULL" : String(row.year),
        "NULL",
        `'${row.status}'`,
        row.status === "indexed" ? String(8 + ((rowIndex * 5) % 33)) : "0",
        `'${createdAt}'`,
        `'${createdAt}'`,
      ].join(", ");
    })
    .map((cols) => `  (${cols})`)
    .join(",\n");

  const sql = `INSERT INTO documents (id, title, year, summary, status, chunk_count, created_at, updated_at) VALUES\n${values};\n`;

  await writeFile(OUT, sql, "utf-8");
  console.log(`[seed] wrote ${rows.length} documents to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});