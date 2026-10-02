import { ZPublicLawyer, ZPublicLawyerDetail } from "@vidhan/schema";
import type {
  TDistrict,
  TLanguage,
  TPracticeArea,
  TPublicLawyer,
  TPublicLawyerDetail,
} from "@vidhan/schema";

import { apiGet } from "@/lib/api";

// ───────────────────────── Query contract ─────────────────────────
// Maps 1:1 onto the GET /lawyers query string params. `search` has no
// server-side counterpart yet, so it is applied client-side in getLawyers.

export interface LawyerQuery {
  search?: string;
  practiceArea?: string;
  district?: string;
  language?: string;
}

const MAX_RESULTS = 50;

// ───────────────────────── Mock data ─────────────────────────
// Temporary stand-in so the catalogue can be previewed without a running
// API. The real fetches are commented out in getLawyers/getLawyer below;
// uncomment them and delete MOCK_LAWYERS to go back to live data.
const MOCK_LAWYERS: TPublicLawyerDetail[] = [
  {
    id: "mock-01",
    name: "Aasha Thapa",
    practiceAreas: ["family", "civil"],
    district: "kathmandu",
    languages: ["ne", "en"],
    yearsOfExperience: 12,
    bio: "Family and civil disputes, with a focus on mediation and amicable settlement.",
    bookingUrl: "https://cal.com/aasha-thapa",
    barNumber: "1204",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-02",
    name: "Bikash Rai",
    practiceAreas: ["criminal"],
    district: "lalitpur",
    languages: ["en", "ne"],
    yearsOfExperience: 8,
    bio: null,
    bookingUrl: null,
    barNumber: null,
    verified: false,
    imageUrl: null,
  },
  {
    id: "mock-03",
    name: "Chanda Gurung",
    practiceAreas: ["property", "banking"],
    district: "bhaktapur",
    languages: ["ne", "en"],
    yearsOfExperience: 15,
    bio: "Property registration, land disputes, and banking litigation.",
    bookingUrl: "https://cal.com/chanda-gurung",
    barNumber: "3319",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-04",
    name: "Dipesh Shrestha",
    practiceAreas: ["corporate", "tax"],
    district: "kathmandu",
    languages: ["en", "ne"],
    yearsOfExperience: 20,
    bio: "Corporate structuring, compliance, and tax advisory for growing businesses.",
    bookingUrl: "https://cal.com/dipesh-shrestha",
    barNumber: "552",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-05",
    name: "Elina Maharjan",
    practiceAreas: ["family"],
    district: "lalitpur",
    languages: ["ne", "roman_ne"],
    yearsOfExperience: null,
    bio: null,
    bookingUrl: null,
    barNumber: null,
    verified: false,
    imageUrl: null,
  },
  {
    id: "mock-06",
    name: "Farhan Ansari",
    practiceAreas: ["consumer", "civil"],
    district: "jhapa",
    languages: ["en", "ne"],
    yearsOfExperience: 9,
    bio: "Consumer protection and civil claims, including defective goods and services.",
    bookingUrl: "https://cal.com/farhan-ansari",
    barNumber: "2047",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-07",
    name: "Gita Karki",
    practiceAreas: ["labor", "human_rights"],
    district: "kaski",
    languages: ["ne", "en"],
    yearsOfExperience: 11,
    bio: "Employment disputes, workplace rights, and human rights advocacy.",
    bookingUrl: null,
    barNumber: "998",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-08",
    name: "Hari Prasad Adhikari",
    practiceAreas: ["criminal", "constitutional"],
    district: "chitwan",
    languages: ["ne"],
    yearsOfExperience: 18,
    bio: "Criminal defence and constitutional petitions before the high courts.",
    bookingUrl: "https://cal.com/hari-adhikari",
    barNumber: "314",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-09",
    name: "Ishita Joshi",
    practiceAreas: ["cyber", "corporate"],
    district: "kathmandu",
    languages: ["en", "ne"],
    yearsOfExperience: 6,
    bio: "Cyber crime, data privacy, and technology contracts.",
    bookingUrl: "https://cal.com/ishita-joshi",
    barNumber: "1782",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-10",
    name: "Janak Bhandari",
    practiceAreas: ["immigration", "consumer"],
    district: "rupandehi",
    languages: ["en", "ne", "roman_ne"],
    yearsOfExperience: 10,
    bio: "Immigration filings, visa appeals, and consumer disputes for families abroad.",
    bookingUrl: null,
    barNumber: "2201",
    verified: true,
    imageUrl: null,
  },
  {
    id: "mock-11",
    name: "Krishna Bahadur Thapa",
    practiceAreas: ["civil", "property"],
    district: "morang",
    languages: ["ne"],
    yearsOfExperience: 22,
    bio: null,
    bookingUrl: null,
    barNumber: null,
    verified: false,
    imageUrl: null,
  },
  {
    id: "mock-12",
    name: "Luna Tamang",
    practiceAreas: ["family", "human_rights"],
    district: "bhaktapur",
    languages: ["ne", "en"],
    yearsOfExperience: 7,
    bio: "Family law and protection orders, with trauma-informed practice.",
    bookingUrl: "https://cal.com/luna-tamang",
    barNumber: "1416",
    verified: true,
    imageUrl: null,
  },
];

// Static export needs every route's params at build time. The mock ids
// stand in until the API is live — swap for the real id source then.
export const MOCK_LAWYER_IDS: string[] = MOCK_LAWYERS.map(
  (lawyer) => lawyer.id,
);

export async function getLawyers(
  query: LawyerQuery
): Promise<TPublicLawyer[]> {
  // ── MOCK MODE — real API call kept commented out for preview ──
  // const params = new URLSearchParams();
  // if (query.practiceArea) params.set("practiceArea", query.practiceArea);
  // if (query.district) params.set("district", query.district);
  // if (query.language) params.set("language", query.language);
  // params.set("limit", String(MAX_RESULTS));
  // const payload = (await apiGet(`/lawyers?${params}`)) as {
  //   lawyers?: unknown;
  // };
  // if (!Array.isArray(payload.lawyers)) throw new Error("invalid_response");
  // const lawyers = payload.lawyers.map((item) => ZPublicLawyer.parse(item));

  // Serve from the mock, applying the same filters client-side so the
  // preview behaves like the real endpoint.
  const { practiceArea, district, language } = query;
  let lawyers = MOCK_LAWYERS;
  if (practiceArea)
    lawyers = lawyers.filter((lawyer) =>
      lawyer.practiceAreas.includes(practiceArea as TPracticeArea)
    );
  if (district)
    lawyers = lawyers.filter((lawyer) => lawyer.district === (district as TDistrict));
  if (language)
    lawyers = lawyers.filter((lawyer) =>
      lawyer.languages.includes(language as TLanguage)
    );

  const search = query.search?.trim().toLowerCase();
  if (!search) return lawyers;

  return lawyers.filter(
    (lawyer) =>
      lawyer.name.toLowerCase().includes(search) ||
      lawyer.practiceAreas.some((area) => area.includes(search))
  );
}

export async function getLawyer(
  id: string
): Promise<TPublicLawyerDetail | null> {
  // ── MOCK MODE — real API call kept commented out for preview ──
  // const payload = (await apiGet(`/lawyers/${id}`)) as {
  //   lawyer?: unknown;
  // };
  // if (!payload.lawyer) return null;
  // return ZPublicLawyerDetail.parse(payload.lawyer);

  return MOCK_LAWYERS.find((lawyer) => lawyer.id === id) ?? null;
}