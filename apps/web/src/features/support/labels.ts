import type {
  TSupportTicketCategory,
  TSupportTicketStatus,
} from "@vidhan/schema";

const CATEGORY_LABELS: Record<TSupportTicketCategory, string> = {
  missing_document: "Missing document",
  missing_lawyer: "Missing lawyer",
  other: "Other",
};

export function categoryLabel(category: TSupportTicketCategory): string {
  return CATEGORY_LABELS[category];
}

export function statusLabel(status: TSupportTicketStatus): string {
  return status === "open" ? "Open" : "Closed";
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
