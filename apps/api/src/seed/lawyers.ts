import { readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONSULTATION_MODES,
  COURTS,
  DISTRICTS,
  LANGUAGES,
  PRACTICE_AREAS,
  ZLawyerCreate,
} from "@vidhan/schema";
import type {
  TCaseCounts,
  TConsultationMode,
  TCourt,
  TDistrict,
  TLanguage,
  TLawyerEducation,
  TPracticeArea,
  TSeniority,
} from "@vidhan/schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "..", "..", "..", "data", "lawyers.seed.sql");
const PORTRAITS = resolve(HERE, "..", "..", "..", "..", "data", "portraits");

const COUNT = 150;
const NOW = "2026-01-15T09:00:00.000Z";
const NOW_YEAR = 2026;

// Portrait gender follows the first name. The FIRST_NAMES list below
// alternates male/female; distinguishing by name (rather than position) stays
// correct if the list is ever reordered. Names not listed are male.
const FEMALE_FIRST_NAMES = new Set([
  "Sita", "Gita", "Sunita", "Anjali", "Nisha", "Kamala", "Pooja", "Sarita",
  "Laxmi", "Bina", "Rekha", "Manisha", "Sabina", "Rita", "Sangita", "Shanti",
]);

// All names and years below are fictional; phone-like and email-like values
// are deliberately fake (`example.com`) — seed data must never contain
// real people's contact details.
const DEGREES = ["LLB", "BA LLB", "BCom LLB"] as const;
const INSTITUTIONS = [
  "Nepal Law Campus, Tribhuvan University",
  "Kathmandu School of Law",
  "Purbanchal University Faculty of Law",
  "Pokhara University School of Law",
  "Mid-Western University Faculty of Law",
] as const;

const FIRST_NAMES = [
  "Aarav", "Sita", "Ramesh", "Gita", "Bishal", "Sunita", "Prakash", "Anjali",
  "Dipak", "Nisha", "Rajesh", "Kamala", "Suresh", "Pooja", "Binod", "Sarita",
  "Krishna", "Laxmi", "Hari", "Bina", "Nabin", "Rekha", "Santosh", "Manisha",
  "Kiran", "Sabina", "Deepak", "Rita", "Pramod", "Sangita", "Ashok", "Shanti",
];

const LAST_NAMES = [
  "Sharma", "Adhikari", "Thapa", "Gurung", "Shrestha", "Karki", "Bhattarai",
  "Magar", "Rai", "Limbu", "Tamang", "Maharjan", "Poudel", "Basnet", "Khadka",
  "Joshi", "Pandey", "Acharya", "Regmi", "Dahal", "Subedi", "Bista", "Rana",
  "Yadav", "Chaudhary", "Lama", "Sherpa", "Malla", "Shah", "Rijal", "Neupane",
  "Pradhan", "Gautam", "Baral", "Dhakal",
];

// Deterministic PRNG so the seed file is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260115);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function sample<T>(items: readonly T[], min: number, max: number): T[] {
  const count = min + Math.floor(rand() * (max - min + 1));
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  }
  return out;
}

// Portraits are assigned with their own PRNG streams so buildRow's stream —
// and therefore every non-portrait column — stays identical to earlier seeds.
type PortraitDeck = { pool: string[]; deck: string[]; rng: () => number };

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function nextPortrait(deck: PortraitDeck): string {
  if (deck.deck.length === 0) {
    deck.deck = shuffle(deck.pool, deck.rng);
  }
  return deck.deck.pop()!;
}

async function loadPortraits(): Promise<{ male: string[]; female: string[] }> {
  const read = async (gender: "male" | "female") =>
    (await readdir(resolve(PORTRAITS, gender)))
      .filter((f) => f.endsWith(".jpg"))
      .sort();
  return { male: await read("male"), female: await read("female") };
}

function portraitKeyFor(
  firstName: string,
  portraits: { male: string[]; female: string[] },
  decks: { male: PortraitDeck; female: PortraitDeck },
): string {
  const deck = FEMALE_FIRST_NAMES.has(firstName) ? decks.female : decks.male;
  const file = nextPortrait(deck);
  return `lawyers/seed/${file}`;
}

// Profile copy in the lawyer's own voice — professional, first-person, free
// of placeholder phrasing. Deterministic per row; no real contact details.
function buildBio(options: {
  firstName: string;
  district: TDistrict;
  yearsOfExperience: number;
  seniority: TSeniority;
  firmName: string | null;
  supremeCourtCases: number;
}): string {
  const { firstName, district, yearsOfExperience, seniority, firmName, supremeCourtCases } =
    options;
  const place = district
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const firmClause = firmName
    ? ` I practise at ${firmName}.`
    : "";
  if (seniority === "senior_advocate") {
    return (
      `${firstName} is a Senior Advocate with ${yearsOfExperience} years at the bar, based in ${place}.` +
      firmClause +
      ` My practice has taken me from the district benches to the Supreme Court, ` +
      `where I have argued ${supremeCourtCases} matters.`
    );
  }
  return (
    `${firstName} is an advocate in ${place} with ${yearsOfExperience} years at the bar.` +
    firmClause +
    ` I appear regularly before the district and high courts and take pride in ` +
    `advising clients clearly before a single paper is filed.`
  );
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullable(value: string | null): string {
  return value === null ? "NULL" : sqlString(value);
}

function buildRow(index: number, district: TDistrict) {
  const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
    LAST_NAMES[(index * 7) % LAST_NAMES.length]
  }`;
  // 1–4 distinct areas: the primary practice plus up to three more
  // (the set dedupes picks, so extraCount is an upper bound).
  const practiceSet = new Set<TPracticeArea>([
    PRACTICE_AREAS[index % PRACTICE_AREAS.length]!,
  ]);
  const extraCount = Math.floor(rand() * 4);
  for (let i = 0; i < extraCount; i++) practiceSet.add(pick(PRACTICE_AREAS));
  const practiceAreas: TPracticeArea[] = [...practiceSet];
  const languages: TLanguage[] = [
    "ne",
    ...sample(LANGUAGES.filter((l) => l !== "ne"), 0, 2),
  ];
  const yearsOfExperience = 1 + Math.floor(rand() * 40);
  const barNumber = rand() < 0.2 ? null : `NEB-${String(index + 1).padStart(4, "0")}`;
  const verified = rand() < 0.85;
  const active = rand() < 0.92;

  // Senior advocates are appointed from the highest ranks of the bar, so the
  // designation requires 16+ years of practice. Their dockets are believable
  // for that career length: a higher per-year case rate and a mix skewed to
  // the Supreme/High Courts. The breakdown is split info — it need not sum
  // exactly to totalCases (see docs/database.md).
  const isSenior = yearsOfExperience >= 16 && rand() < 0.35;
  const seniority: TSeniority = isSenior ? "senior_advocate" : "advocate";

  // ── Decision-useful fields for the profile page ──
  const firmName = rand() < 0.4
    ? `${LAST_NAMES[(index * 11) % LAST_NAMES.length]} & Associates`
    : null;
  const consultationModes =
    rand() < 0.7 ? sample(CONSULTATION_MODES, 1, 3) : null;
  // Lawyers juggle several benches; senior advocates always hold the
  // Supreme Court plus 1–4 of the others, advocates 2–4 courts.
  const courts = isSenior
    ? [
        "supreme_court",
        ...sample(
          COURTS.filter((court) => court !== "supreme_court"),
          1,
          4,
        ),
      ]
    : rand() < 0.95
      ? sample(COURTS, 2, 4)
      : null;
  const barEnrollmentYear = rand() < 0.8
    ? Math.max(1990, NOW_YEAR - yearsOfExperience)
    : null;
  const education: TLawyerEducation[] | null = rand() < 0.7
    ? [
        {
          degree: pick(DEGREES),
          institution: pick(INSTITUTIONS),
          year: barEnrollmentYear
            ? barEnrollmentYear - 1 - Math.floor(rand() * 5)
            : undefined,
        },
        ...(rand() < 0.3
          ? [{ degree: "LLM", institution: pick(INSTITUTIONS) }]
          : []),
      ]
    : null;

  const totalCases = Math.round(
    yearsOfExperience * (isSenior ? 9 + rand() * 13 : 2.5 + rand() * 8),
  );
  let caseCounts: TCaseCounts;
  if (isSenior) {
    const supremeShare = 0.15 + rand() * 0.2;
    const highShare = 0.35 + rand() * 0.25;
    caseCounts = {
      supreme_court: Math.round(totalCases * supremeShare),
      high_court: Math.round(totalCases * highShare),
      district_court: Math.round(totalCases * (1 - supremeShare - highShare)),
    };
  } else {
    const districtShare = 0.5 + rand() * 0.35;
    const highShare = (1 - districtShare) * (0.5 + rand() * 0.4);
    caseCounts = {
      supreme_court: Math.round(totalCases * (1 - districtShare - highShare)),
      high_court: Math.round(totalCases * highShare),
      district_court: Math.round(totalCases * districtShare),
    };
  }

  const bio = buildBio({
    firstName: name.split(" ")[0]!,
    district,
    yearsOfExperience,
    seniority,
    firmName,
    supremeCourtCases: caseCounts.supreme_court,
  });

  return {
    id: `seed-${String(index + 1).padStart(3, "0")}`,
    name,
    practiceAreas: [...new Set(practiceAreas)],
    district,
    languages,
    barNumber,
    yearsOfExperience,
    bio,
    verified,
    active,
    firmName,
    consultationModes,
    courts,
    education,
    barEnrollmentYear,
    seniority,
    totalCases,
    caseCounts,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function main() {
  const portraits = await loadPortraits();
  const decks = {
    male: { pool: portraits.male, deck: [], rng: mulberry32(20261003) },
    female: { pool: portraits.female, deck: [], rng: mulberry32(20261004) },
  };

  const rows = [];
  for (let i = 0; i < COUNT; i++) {
    // First full pass assigns one lawyer per district so every district is
    // represented; the remaining rows densify randomly chosen districts.
    const district = i < DISTRICTS.length ? DISTRICTS[i]! : pick(DISTRICTS);
    const candidate = buildRow(i, district);
    const imageKey = portraitKeyFor(candidate.name.split(" ")[0]!, portraits, decks);
    const withImage = { ...candidate, imageKey };
    const parsed = ZLawyerCreate.safeParse(withImage);
    if (!parsed.success) {
      throw new Error(`seed row ${i} invalid: ${parsed.error.message}`);
    }
    // Create schema omits server-set fields; keep them from the candidate.
    rows.push({ ...withImage, ...parsed.data });
  }

  const values = rows
    .map((row) =>
      [
        sqlString(row.id),
        sqlString(row.name),
        sqlString(JSON.stringify(row.practiceAreas)),
        sqlString(row.district),
        sqlString(JSON.stringify(row.languages)),
        sqlNullable(row.barNumber ?? null),
        row.yearsOfExperience === undefined || row.yearsOfExperience === null
          ? "NULL"
          : String(row.yearsOfExperience),
        sqlNullable(row.bio ?? null),
        sqlNullable(row.imageKey ?? null),
        row.verified ? 1 : 0,
        row.active ? 1 : 0,
        sqlString(row.createdAt),
        sqlString(row.updatedAt),
        sqlNullable(row.firmName ?? null),
        row.consultationModes
          ? sqlString(JSON.stringify(row.consultationModes))
          : "NULL",
        row.courts ? sqlString(JSON.stringify(row.courts)) : "NULL",
        row.education ? sqlString(JSON.stringify(row.education)) : "NULL",
        row.barEnrollmentYear === null || row.barEnrollmentYear === undefined
          ? "NULL"
          : String(row.barEnrollmentYear),
        sqlNullable(row.seniority ?? null),
        row.totalCases === null || row.totalCases === undefined
          ? "NULL"
          : String(row.totalCases),
        row.caseCounts ? sqlString(JSON.stringify(row.caseCounts)) : "NULL",
      ].join(", "),
    )
    .map((cols) => `  (${cols})`)
    .join(",\n");

  const sql = `DELETE FROM lawyers;
INSERT INTO lawyers (id, name, practice_areas, district, languages, bar_number, years_of_experience, bio, image_key, verified, active, created_at, updated_at, firm_name, consultation_modes, courts, education, bar_enrollment_year, seniority, total_cases, case_counts) VALUES\n${values};\n`;

  await writeFile(OUT, sql, "utf-8");
  console.log(`[seed] wrote ${rows.length} lawyers to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
