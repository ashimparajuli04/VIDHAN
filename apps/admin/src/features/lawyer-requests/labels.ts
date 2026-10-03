import type { TConsultationMode, TRequestStatus } from "@vidhan/schema";

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

export function consultationModeLabel(mode: TConsultationMode): string {
  return CONSULTATION_MODE_LABELS[mode];
}

export function requestStatusLabel(status: TRequestStatus): string {
  return REQUEST_STATUS_LABELS[status];
}
