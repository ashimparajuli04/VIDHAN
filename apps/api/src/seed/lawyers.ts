import { writeFile } from "node:fs/promises";
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
  TConsultationMode,
  TCourt,
  TDistrict,
  TLanguage,
  TLawyerEducation,
  TPracticeArea,
} from "@vidhan/schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "..", "..", "..", "data", "lawyers.seed.sql");

const COUNT = 80;
const NOW = "2026-01-15T09:00:00.000Z";
const NOW_YEAR = 2026;

// Every fee and year below is fictional; phone-like and email-like values
// are deliberately fake (`example.com`) — seed data must never contain
// real people's contact details.
const FEES = [1000, 1500, 2000, 2500, 3000, 5000] as const;
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

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullable(value: string | null): string {
  return value === null ? "NULL" : sqlString(value);
}

function buildRow(index: number) {
  const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
    LAST_NAMES[(index * 7) % LAST_NAMES.length]
  }`;
  const district: TDistrict = DISTRICTS[index % DISTRICTS.length]!;
  const practiceAreas: TPracticeArea[] = [
    PRACTICE_AREAS[index % PRACTICE_AREAS.length]!,
    ...(rand() < 0.4 ? [pick(PRACTICE_AREAS)] : []),
  ];
  const languages: TLanguage[] = [
    "ne",
    ...sample(LANGUAGES.filter((l) => l !== "ne"), 0, 2),
  ];
  const yearsOfExperience = 1 + Math.floor(rand() * 40);
  const bio = `${name.split(" ")[0]} practises in ${district}, with ${yearsOfExperience} years at the bar.`;
  const bookingUrl =
    rand() < 0.5 ? `https://vidhan.example/lawyers/${index + 1}` : null;
  const barNumber = rand() < 0.2 ? null : `NEB-${String(index + 1).padStart(4, "0")}`;
  const verified = rand() < 0.85;
  const active = rand() < 0.92;

  // ── Newer decision-useful fields (draws appended so the PRNG stream for
  // ── the columns above stays identical to earlier seed runs) ──
  const firmName = rand() < 0.4
    ? `${LAST_NAMES[(index * 11) % LAST_NAMES.length]} & Associates`
    : null;
  const consultationFee = rand() < 0.65
    ? FEES[Math.floor(rand() * FEES.length)]
    : null;
  const freeFirstConsultation = rand() < 0.35;
  const consultationModes =
    rand() < 0.7 ? sample(CONSULTATION_MODES, 1, 3) : null;
  const courts = rand() < 0.75 ? sample(COURTS, 1, 3) : null;
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

  return {
    id: `seed-${String(index + 1).padStart(3, "0")}`,
    name,
    practiceAreas: [...new Set(practiceAreas)],
    district,
    languages,
    bookingUrl,
    barNumber,
    yearsOfExperience,
    bio,
    verified,
    active,
    firmName,
    consultationFee,
    freeFirstConsultation,
    consultationModes,
    courts,
    education,
    barEnrollmentYear,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function main() {
  const rows = [];
  for (let i = 0; i < COUNT; i++) {
    const candidate = buildRow(i);
    const parsed = ZLawyerCreate.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(`seed row ${i} invalid: ${parsed.error.message}`);
    }
    // Create schema omits server-set fields; keep them from the candidate.
    rows.push({ ...candidate, ...parsed.data });
  }

  const values = rows
    .map((row) =>
      [
        sqlString(row.id),
        sqlString(row.name),
        sqlString(JSON.stringify(row.practiceAreas)),
        sqlString(row.district),
        sqlString(JSON.stringify(row.languages)),
        sqlNullable(row.bookingUrl ?? null),
        sqlNullable(row.barNumber ?? null),
        row.yearsOfExperience === undefined || row.yearsOfExperience === null
          ? "NULL"
          : String(row.yearsOfExperience),
        sqlNullable(row.bio ?? null),
        row.verified ? 1 : 0,
        row.active ? 1 : 0,
        sqlString(row.createdAt),
        sqlString(row.updatedAt),
        sqlNullable(row.firmName ?? null),
        row.consultationFee === null || row.consultationFee === undefined
          ? "NULL"
          : String(row.consultationFee),
        row.freeFirstConsultation ? 1 : 0,
        row.consultationModes
          ? sqlString(JSON.stringify(row.consultationModes))
          : "NULL",
        row.courts ? sqlString(JSON.stringify(row.courts)) : "NULL",
        row.education ? sqlString(JSON.stringify(row.education)) : "NULL",
        row.barEnrollmentYear === null || row.barEnrollmentYear === undefined
          ? "NULL"
          : String(row.barEnrollmentYear),
      ].join(", "),
    )
    .map((cols) => `  (${cols})`)
    .join(",\n");

  const sql = `INSERT INTO lawyers (id, name, practice_areas, district, languages, booking_url, bar_number, years_of_experience, bio, verified, active, created_at, updated_at, firm_name, consultation_fee, free_first_consultation, consultation_modes, courts, education, bar_enrollment_year) VALUES\n${values};\n`;

  await writeFile(OUT, sql, "utf-8");
  console.log(`[seed] wrote ${rows.length} lawyers to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
