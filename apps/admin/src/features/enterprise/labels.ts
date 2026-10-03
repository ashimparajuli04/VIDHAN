import type {
  TEnterpriseCapability,
  TEnterpriseContactMethod,
  TEnterpriseMemberRole,
  TEnterpriseMemberStatus,
  TEnterpriseOrganizationStatus,
  TEnterpriseRequestStatus,
} from "@vidhan/schema";

export const REQUEST_STATUS_LABELS: Record<TEnterpriseRequestStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  awaiting_customer: "Awaiting customer",
  negotiation: "Quote / negotiation",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  closed: "Closed",
};

export const REQUEST_STATUS_PILLS: Record<TEnterpriseRequestStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  reviewing: "bg-blue-100 text-blue-800",
  awaiting_customer: "bg-amber-100 text-amber-800",
  negotiation: "bg-purple-100 text-purple-800",
  approved: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  closed: "bg-slate-100 text-slate-600",
};

export const CAPABILITY_LABELS: Record<TEnterpriseCapability, string> = {
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

export const CONTACT_METHOD_LABELS: Record<TEnterpriseContactMethod, string> = {
  email: "Email",
  phone: "Phone",
};

export const ORG_STATUS_LABELS: Record<TEnterpriseOrganizationStatus, string> =
  {
    active: "Active",
    suspended: "Suspended",
    closed: "Closed",
  };

export const MEMBER_STATUS_LABELS: Record<TEnterpriseMemberStatus, string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

export const MEMBER_ROLE_LABELS: Record<TEnterpriseMemberRole, string> = {
  admin: "Admin",
  member: "Member",
};

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}