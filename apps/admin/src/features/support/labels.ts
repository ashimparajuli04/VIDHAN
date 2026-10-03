import type {
  TSupportTicketCategory,
  TSupportTicketSource,
  TSupportTicketStatus,
} from "@vidhan/schema";

const CATEGORY_LABELS: Record<TSupportTicketCategory, string> = {
  missing_document: "Missing document",
  missing_lawyer: "Missing lawyer",
  other: "Other",
};

const SOURCE_LABELS: Record<TSupportTicketSource, string> = {
  support_page: "Support page",
  chat: "Chat",
  enterprise_request: "Enterprise request",
};

export function categoryLabel(category: TSupportTicketCategory): string {
  return CATEGORY_LABELS[category];
}

export function sourceLabel(source: TSupportTicketSource): string {
  return SOURCE_LABELS[source];
}

export function statusLabel(status: TSupportTicketStatus): string {
  return status === "open" ? "Open" : "Closed";
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
