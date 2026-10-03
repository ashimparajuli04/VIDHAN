import type {
  TConsultationMode,
  TCourt,
  TDistrict,
  TLanguage,
  TPracticeArea,
  TRequestStatus,
} from "@vidhan/schema";

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

const COURT_LABELS: Record<TCourt, string> = {
  supreme_court: "Supreme Court",
  high_court: "High Court",
  district_court: "District Court",
  special_courts: "Special Courts",
  tribunals: "Tribunals",
};

const CONSULTATION_MODE_LABELS: Record<TConsultationMode, string> = {
  in_person: "In person",
  phone: "Phone",
  video: "Video",
};

const REQUEST_STATUS_LABELS: Record<TRequestStatus, string> = {
  pending: "Pending",
  contacted: "Contacted",
  closed: "Closed",
};

export function practiceAreaLabel(area: TPracticeArea): string {
  return PRACTICE_AREA_LABELS[area];
}

export function languageLabel(language: TLanguage): string {
  return LANGUAGE_LABELS[language];
}

export function courtLabel(court: TCourt): string {
  return COURT_LABELS[court];
}

export function consultationModeLabel(mode: TConsultationMode): string {
  return CONSULTATION_MODE_LABELS[mode];
}

export function requestStatusLabel(status: TRequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}

export function formatNpr(amount: number): string {
  return `NPR ${new Intl.NumberFormat("en-NP").format(amount)}`;
}

export function districtLabel(district: TDistrict): string {
  return district
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
