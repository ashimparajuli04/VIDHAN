import type {
  TEnterpriseCapability,
  TEnterpriseContactMethod,
  TEnterpriseRequestStatus,
} from "@vidhan/schema";

const CAPABILITY_LABELS: Record<TEnterpriseCapability, string> = {
  higher_token_allocation: "Higher token allocation",
  multiple_employee_accounts: "Multiple employee accounts",
  organization_wide_access: "Organization-wide access",
  team_user_management: "Team/user management",
  usage_analytics: "Usage analytics",
  custom_document_repository: "Custom legal document repository",
  api_access: "API access",
  custom_integrations: "Custom integrations",
  dedicated_support: "Dedicated support",
  custom_security_deployment: "Custom security/deployment requirements",
  other: "Other",
};

const CONTACT_METHOD_LABELS: Record<TEnterpriseContactMethod, string> = {
  email: "Email",
  phone: "Phone",
};

const STATUS_LABELS: Record<TEnterpriseRequestStatus, string> = {
  new: "Submitted",
  reviewing: "Under review",
  awaiting_customer: "Awaiting your input",
  negotiation: "In negotiation",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  closed: "Closed",
};

export function capabilityLabel(capability: TEnterpriseCapability): string {
  return CAPABILITY_LABELS[capability];
}

export function contactMethodLabel(method: TEnterpriseContactMethod): string {
  return CONTACT_METHOD_LABELS[method];
}

export function requestStatusLabel(status: TEnterpriseRequestStatus): string {
  return STATUS_LABELS[status];
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}