import type { Lawyer } from "@vidhan/schema";
import { LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";

// ───────────────────────── Display labels ─────────────────────────
// The schema stores enum keys (e.g. "human_rights", "ne"); the UI shows
// human-readable text. These maps are display-only.

export const practiceAreaLabels = {
  criminal: "Criminal",
  civil: "Civil",
  family: "Family",
  property: "Property",
  consumer: "Consumer",
  labor: "Labor",
  corporate: "Corporate",
  immigration: "Immigration",
  tax: "Tax",
  constitutional: "Constitutional",
  cyber: "Cyber",
  banking: "Banking",
  human_rights: "Human Rights",
  other: "Other",
} as const satisfies Record<(typeof PRACTICE_AREAS)[number], string>;

export const languageLabels = {
  en: "English",
  ne: "नेपाली",
  roman_ne: "Roman Nepali",
} as const satisfies Record<(typeof LANGUAGES)[number], string>;

export function practiceAreaLabel(value: (typeof PRACTICE_AREAS)[number]): string {
  return practiceAreaLabels[value];
}

export function languageLabel(value: (typeof LANGUAGES)[number]): string {
  return languageLabels[value];
}

// ───────────────────────── Query contract ─────────────────────────
// Mirrors the future GET /lawyers endpoint params so that when the API
// lands, the filtering logic maps 1:1 onto query string params.

export interface LawyerQuery {
  search?: string;
  practiceArea?: string;
  city?: string;
  language?: string;
}

// ───────────────────────── Mock data ─────────────────────────
// Typed as Lawyer so a shape mismatch fails typecheck immediately.

const MOCK_LAWYERS: Lawyer[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    practiceAreas: ["criminal", "constitutional"],
    city: "Kathmandu",
    languages: ["ne", "en"],
    bookingUrl: "https://cal.com/aarav-sharma",
    barNumber: "KTM-2014-0821",
    yearsOfExperience: 11,
    bio: "Defense counsel with a focus on constitutional and criminal matters before the District and High Courts.",
    verified: true,
    active: true,
    createdAt: "2024-09-12T08:30:00.000Z",
    updatedAt: "2025-03-01T10:15:00.000Z",
  },
  {
    id: "2",
    name: "Sita Thapa",
    practiceAreas: ["family", "civil"],
    city: "Lalitpur",
    languages: ["ne", "roman_ne"],
    bookingUrl: "https://cal.com/sita-thapa",
    barNumber: "LAL-2017-0344",
    yearsOfExperience: 8,
    bio: "Handles divorce, custody, and property partition cases with a mediation-first approach.",
    verified: true,
    active: true,
    createdAt: "2024-11-02T12:00:00.000Z",
    updatedAt: "2025-02-18T09:45:00.000Z",
  },
  {
    id: "3",
    name: "Bikash Rai",
    practiceAreas: ["corporate", "tax", "banking"],
    city: "Kathmandu",
    languages: ["en", "ne"],
    bookingUrl: "https://cal.com/bikash-rai",
    barNumber: "KTM-2010-1190",
    yearsOfExperience: 15,
    bio: "Corporate and tax advisor to startups and financial institutions operating in Nepal.",
    verified: true,
    active: true,
    createdAt: "2024-06-21T06:10:00.000Z",
    updatedAt: "2025-01-09T14:20:00.000Z",
  },
  {
    id: "4",
    name: "Anjali Gurung",
    practiceAreas: ["human_rights", "civil"],
    city: "Pokhara",
    languages: ["ne", "en", "roman_ne"],
    bookingUrl: "https://cal.com/anjali-gurung",
    barNumber: "PKR-2019-0077",
    yearsOfExperience: 6,
    bio: "Public-interest litigator working on gender equality and freedom-of-expression cases.",
    verified: false,
    active: true,
    createdAt: "2025-01-15T03:30:00.000Z",
    updatedAt: "2025-04-02T11:05:00.000Z",
  },
  {
    id: "5",
    name: "Rohit Poudel",
    practiceAreas: ["property", "civil"],
    city: "Bharatpur",
    languages: ["ne", "roman_ne"],
    bookingUrl: "https://cal.com/rohit-poudel",
    barNumber: "BHR-2015-0562",
    yearsOfExperience: 10,
    bio: "Specializes in land ownership disputes, title transfers, and agro-land contracts.",
    verified: true,
    active: true,
    createdAt: "2024-08-03T09:00:00.000Z",
    updatedAt: "2025-03-22T16:40:00.000Z",
  },
  {
    id: "6",
    name: "Maya Tamang",
    practiceAreas: ["consumer", "labor"],
    city: "Biratnagar",
    languages: ["ne", "en"],
    bookingUrl: "https://cal.com/maya-tamang",
    barNumber: "BIR-2020-0219",
    yearsOfExperience: 5,
    bio: "Represents workers in wrongful-termination and wage disputes and consumers in product-liability claims.",
    verified: false,
    active: true,
    createdAt: "2025-02-10T07:25:00.000Z",
    updatedAt: "2025-04-18T08:50:00.000Z",
  },
  {
    id: "7",
    name: "Deepak Karki",
    practiceAreas: ["immigration", "civil"],
    city: "Kathmandu",
    languages: ["en", "ne"],
    bookingUrl: "https://cal.com/deepak-karki",
    barNumber: "KTM-2012-0943",
    yearsOfExperience: 13,
    bio: "Assists with visas, work permits, and citizenship matters for Nepalis abroad and foreigners in Nepal.",
    verified: true,
    active: true,
    createdAt: "2024-05-19T11:11:00.000Z",
    updatedAt: "2025-02-27T13:13:00.000Z",
  },
  {
    id: "8",
    name: "Nisha Shrestha",
    practiceAreas: ["cyber", "criminal"],
    city: "Lalitpur",
    languages: ["en", "ne", "roman_ne"],
    bookingUrl: "https://cal.com/nisha-shrestha",
    barNumber: "LAL-2018-0410",
    yearsOfExperience: 7,
    bio: "Focuses on cybercrime, online fraud, and data-privacy compliance for tech companies.",
    verified: true,
    active: true,
    createdAt: "2024-10-30T15:45:00.000Z",
    updatedAt: "2025-03-14T10:30:00.000Z",
  },
  {
    id: "9",
    name: "Sujan Basnet",
    practiceAreas: ["family", "property"],
    city: "Butwal",
    languages: ["ne", "roman_ne"],
    bookingUrl: "https://cal.com/sujan-basnet",
    barNumber: "BUT-2016-0308",
    yearsOfExperience: 9,
    bio: "Handles inheritance, succession, and family-property matters in the Lumbini region.",
    verified: false,
    active: false,
    createdAt: "2024-07-08T04:20:00.000Z",
    updatedAt: "2025-01-30T09:00:00.000Z",
  },
  {
    id: "10",
    name: "Kavita Maharjan",
    practiceAreas: ["labor", "corporate", "tax"],
    city: "Kathmandu",
    languages: ["ne", "en"],
    bookingUrl: "https://cal.com/kavita-maharjan",
    barNumber: "KTM-2009-0233",
    yearsOfExperience: 16,
    bio: "Employment-law and corporate-compliance advisor with cross-border experience.",
    verified: true,
    active: true,
    createdAt: "2024-04-02T08:00:00.000Z",
    updatedAt: "2025-04-25T12:00:00.000Z",
  },
];

const SIMULATED_LATENCY_MS = 600;

/**
 * Single integration point for lawyer data.
 *
 * Today it filters the in-repo mock data behind a simulated network delay so
 * the UI can exercise loading states. When the real API exists, replace the
 * body with something like:
 *
 *   const params = new URLSearchParams(
 *     Object.entries(query).filter(([, v]) => v != null) as [string, string][]
 *   );
 *   const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/lawyers?${params}`);
 *   if (!res.ok) throw new Error("Failed to load lawyers");
 *   return lawyerSchema.array().parse(await res.json());
 *
 * Nothing in the UI needs to change — LawyerQuery already mirrors the
 * endpoint's query params.
 */
export async function getLawyers(query: LawyerQuery = {}): Promise<Lawyer[]> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  let results = MOCK_LAWYERS;

  const search = query.search?.trim().toLowerCase();
  if (search) {
    results = results.filter((lawyer) => {
      const nameMatch = lawyer.name.toLowerCase().includes(search);
      const bioMatch = lawyer.bio?.toLowerCase().includes(search) ?? false;
      return nameMatch || bioMatch;
    });
  }

  if (query.practiceArea) {
    results = results.filter((lawyer) =>
      lawyer.practiceAreas.includes(
        query.practiceArea as Lawyer["practiceAreas"][number]
      )
    );
  }

  if (query.city) {
    results = results.filter((lawyer) => lawyer.city === query.city);
  }

  if (query.language) {
    results = results.filter((lawyer) =>
      lawyer.languages.includes(query.language as Lawyer["languages"][number])
    );
  }

  return results;
}

// City options derived from the data, for the filter <select>.
export const lawyerCities = Array.from(
  new Set(MOCK_LAWYERS.map((lawyer) => lawyer.city))
).sort();
