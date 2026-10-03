import type {
  TCourt,
  TDistrict,
  TLanguage,
  TPracticeArea,
  TSeniority,
} from "@vidhan/schema";

const COURT_LABELS: Record<TCourt, string> = {
  supreme_court: "Supreme Court",
  high_court: "High Court",
  district_court: "District Court",
};

const SENIORITY_LABELS: Record<TSeniority, string> = {
  senior_advocate: "Senior Advocate",
  advocate: "Advocate",
};

const PRACTICE_AREA_LABELS: Record<TPracticeArea, string> = {
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
};

const LANGUAGE_LABELS: Record<TLanguage, string> = {
  en: "English",
  ne: "Nepali",
  roman_ne: "Roman Nepali",
};

export function practiceAreaLabel(area: TPracticeArea): string {
  return PRACTICE_AREA_LABELS[area];
}

export function languageLabel(language: TLanguage): string {
  return LANGUAGE_LABELS[language];
}

export function seniorityLabel(seniority: TSeniority): string {
  return SENIORITY_LABELS[seniority];
}

export function districtLabel(district: TDistrict): string {
  return district
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function courtLabel(court: TCourt): string {
  return COURT_LABELS[court];
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
