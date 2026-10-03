import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  asJson,
  enterpriseMembers as membersTable,
  enterpriseOrganizations as organizationsTable,
  enterpriseRequests as requestsTable,
  supportTicketMessages as messagesTable,
  users,
} from "@vidhan/schema";
import type {
  EnterpriseMemberRow,
  EnterpriseOrganizationRow,
  EnterpriseRequestRow,
  TAdminEnterpriseOrganization,
  TAdminEnterpriseRequest,
  TAdminEnterpriseRequestDetail,
  TEnterpriseApprovalConfig,
  TEnterpriseMemberView,
  TEnterpriseMembership,
  TEnterpriseOrganization,
  TEnterpriseOrganizationDetail,
  TEnterpriseRequest,
  TEnterpriseRequestCreate,
  TEnterpriseRequestStatus,
  TSupportTicketMessage,
} from "@vidhan/schema";
import type { Db } from "../db";
import { findByEmail } from "../auth";
import { addMessage, createTicket } from "../support";

export type TCreateRequestInput = TEnterpriseRequestCreate;

const TERMINAL_STATUSES: readonly TEnterpriseRequestStatus[] = [
  "rejected",
  "closed",
];

const ACTIVE_MEMBER_STATUSES = ["active", "invited"] as const;

function toRequest(row: EnterpriseRequestRow): TEnterpriseRequest {
  return {
    id: row.id,
    status: row.status,
    supportTicketId: row.supportTicketId,
    organizationName: row.organizationName,
    organizationType: row.organizationType,
    industry: row.industry,
    website: row.website,
    country: row.country,
    city: row.city,
    employeeCount: row.employeeCount,
    contactName: row.contactName,
    contactTitle: row.contactTitle,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    preferredContactMethod: row.preferredContactMethod,
    expectedUsers: row.expectedUsers,
    expectedUsage: row.expectedUsage,
    teamsDepartments: row.teamsDepartments,
    intendedUse: row.intendedUse,
    expectedStartDate: row.expectedStartDate,
    requestedCapabilities: row.requestedCapabilities,
    additionalRequirements: row.additionalRequirements,
    approvedSeats: row.approvedSeats,
    approvedTokensPerMember: row.approvedTokensPerMember,
    approvedStartDate: row.approvedStartDate,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOrganization(row: EnterpriseOrganizationRow): TEnterpriseOrganization {
  return {
    id: row.id,
    requestId: row.requestId,
    name: row.name,
    status: row.status,
    approvedSeats: row.approvedSeats,
    tokensPerMember: row.tokensPerMember,
    startDate: row.startDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMemberView(row: EnterpriseMemberRow, userName: string | null): TEnterpriseMemberView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    email: row.email,
    role: row.role,
    status: row.status,
    tokensAllocated: row.tokensAllocated,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userName,
  };
}

async function latestOpenRequest(
  db: Db,
  userId: string,
): Promise<EnterpriseRequestRow | null> {
  const rows = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.userId, userId))
    .orderBy(desc(requestsTable.createdAt));
  return (
    rows.find((row) => !TERMINAL_STATUSES.includes(row.status)) ?? rows[0] ?? null
  );
}

// Every request gets its own support thread; the whole review + negotiation
// happens there, so the user and the Vidhan team share one conversation.
export async function createRequest(
  db: Db,
  userId: string,
  input: TCreateRequestInput,
): Promise<TEnterpriseRequest> {
  // One live request per user — a resubmission is a new thread only after
  // the previous one reached a terminal state.
  const existing = await latestOpenRequest(db, userId);
  if (existing) return toRequest(existing);

  const now = new Date().toISOString();
  const ticket = await createTicket(db, userId, {
    subject: `Enterprise request — ${input.organizationName}`,
    message: [
      `Enterprise access request for ${input.organizationName}`,
      "",
      `Requested by ${input.contactName} (${input.contactEmail})`,
      `Expected users: ${input.expectedUsers}`,
      `Intended use: ${input.intendedUse}`,
    ].join("\n"),
    category: "other",
    source: "enterprise_request",
  });

  const row: EnterpriseRequestRow = {
    id: crypto.randomUUID(),
    userId,
    supportTicketId: ticket.id,
    status: "new",
    organizationName: input.organizationName,
    organizationType: input.organizationType,
    industry: input.industry,
    website: input.website ?? null,
    country: input.country,
    city: input.city,
    employeeCount: input.employeeCount,
    contactName: input.contactName,
    contactTitle: input.contactTitle,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    preferredContactMethod: input.preferredContactMethod,
    expectedUsers: input.expectedUsers,
    expectedUsage: input.expectedUsage,
    teamsDepartments: input.teamsDepartments,
    intendedUse: input.intendedUse,
    expectedStartDate: input.expectedStartDate,
    requestedCapabilities: asJson(input.requestedCapabilities),
    additionalRequirements: input.additionalRequirements ?? null,
    approvedSeats: null,
    approvedTokensPerMember: null,
    approvedStartDate: null,
    adminNotes: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(requestsTable).values(row);
  return toRequest(row);
}

export async function listRequestsForUser(
  db: Db,
  userId: string,
): Promise<TEnterpriseRequest[]> {
  const rows = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.userId, userId))
    .orderBy(desc(requestsTable.createdAt));
  return rows.map(toRequest);
}

export async function findRequestForUser(
  db: Db,
  id: string,
  userId: string,
): Promise<TEnterpriseRequest | null> {
  const row = await db
    .select()
    .from(requestsTable)
    .where(and(eq(requestsTable.id, id), eq(requestsTable.userId, userId)))
    .get();
  return row ? toRequest(row) : null;
}

export async function listRequestsForAdmin(
  db: Db,
  status?: TEnterpriseRequestStatus,
): Promise<TAdminEnterpriseRequest[]> {
  const rows = await db
    .select({ request: requestsTable, user: users })
    .from(requestsTable)
    .innerJoin(users, eq(requestsTable.userId, users.id))
    .where(status ? eq(requestsTable.status, status) : undefined)
    .orderBy(desc(requestsTable.updatedAt));
  return rows.map(({ request, user }) => ({
    ...toRequest(request),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
  }));
}

export async function findRequestForAdmin(
  db: Db,
  id: string,
): Promise<TAdminEnterpriseRequestDetail | null> {
  const row = await db
    .select({ request: requestsTable, user: users })
    .from(requestsTable)
    .innerJoin(users, eq(requestsTable.userId, users.id))
    .where(eq(requestsTable.id, id))
    .get();
  if (!row) return null;
  return {
    ...toRequest(row.request),
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    messages: await listTicketMessages(db, row.request.supportTicketId),
  };
}

function listTicketMessages(
  db: Db,
  ticketId: string | null,
): Promise<TSupportTicketMessage[]> {
  if (!ticketId) return Promise.resolve([]);
  return db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.ticketId, ticketId))
    .orderBy(asc(messagesTable.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        authorRole: row.authorRole,
        body: row.body,
        createdAt: row.createdAt,
      })),
    );
}

export async function setRequestStatus(
  db: Db,
  id: string,
  status: TEnterpriseRequestStatus,
): Promise<TEnterpriseRequest | null> {
  const existing = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, id))
    .get();
  if (!existing) return null;
  const now = new Date().toISOString();
  await db
    .update(requestsTable)
    .set({ status, updatedAt: now })
    .where(eq(requestsTable.id, id));
  return toRequest({ ...existing, status, updatedAt: now });
}

export type TApproveOutcome =
  | {
      ok: true;
      request: TEnterpriseRequest;
      organization: TEnterpriseOrganization;
    }
  | { ok: false; reason: "not_found" | "already_approved" };

// Approving a request creates the organization with the negotiated limits,
// seats the requester as its admin, and notifies through the existing
// support thread — the conversation is preserved, not replaced.
export async function approveRequest(
  db: Db,
  requestId: string,
  config: TEnterpriseApprovalConfig,
): Promise<TApproveOutcome> {
  const existing = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, requestId))
    .get();
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.approvedSeats !== null || existing.approvedAt !== null) {
    return { ok: false, reason: "already_approved" };
  }

  const now = new Date().toISOString();
  const organization: EnterpriseOrganizationRow = {
    id: crypto.randomUUID(),
    requestId: existing.id,
    name: existing.organizationName,
    status: "active",
    approvedSeats: config.approvedSeats,
    tokensPerMember: config.approvedTokensPerMember,
    startDate: config.approvedStartDate,
    createdAt: now,
    updatedAt: now,
  };
  const admin: EnterpriseMemberRow = {
    id: crypto.randomUUID(),
    organizationId: organization.id,
    userId: existing.userId,
    email: existing.contactEmail,
    role: "admin",
    status: "active",
    tokensAllocated: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(organizationsTable).values(organization);
  await db.insert(membersTable).values(admin);

  await db
    .update(requestsTable)
    .set({
      status: "approved",
      approvedSeats: config.approvedSeats,
      approvedTokensPerMember: config.approvedTokensPerMember,
      approvedStartDate: config.approvedStartDate,
      adminNotes: config.notes ?? null,
      approvedAt: now,
      updatedAt: now,
    })
    .where(eq(requestsTable.id, requestId));

  if (existing.supportTicketId) {
    await addMessage(db, existing.supportTicketId, "admin", [
      `Your Enterprise request for ${existing.organizationName} has been approved.`,
      "",
      `Approved seats: ${config.approvedSeats}`,
      `Token allocation per member: ${config.approvedTokensPerMember.toLocaleString("en-US")}`,
      `Start date: ${config.approvedStartDate}`,
      ...(config.notes ? ["", config.notes] : []),
    ].join("\n"));
  }

  return {
    ok: true,
    request: toRequest({
      ...existing,
      status: "approved",
      approvedSeats: config.approvedSeats,
      approvedTokensPerMember: config.approvedTokensPerMember,
      approvedStartDate: config.approvedStartDate,
      adminNotes: config.notes ?? null,
      approvedAt: now,
      updatedAt: now,
    }),
    organization: toOrganization(organization),
  };
}

export async function listOrganizationsForAdmin(
  db: Db,
): Promise<TAdminEnterpriseOrganization[]> {
  const rows = await db
    .select()
    .from(organizationsTable)
    .orderBy(desc(organizationsTable.updatedAt));
  const seatCounts = await db
    .select({
      organizationId: membersTable.organizationId,
      count: sql<number>`count(*)`,
    })
    .from(membersTable)
    .where(inArray(membersTable.status, ACTIVE_MEMBER_STATUSES))
    .groupBy(membersTable.organizationId);
  const counts = new Map(seatCounts.map((row) => [row.organizationId, row.count]));
  return rows.map((row) => ({
    ...toOrganization(row),
    memberCount: counts.get(row.id) ?? 0,
  }));
}

export async function findOrganizationForAdmin(
  db: Db,
  id: string,
): Promise<TEnterpriseOrganizationDetail | null> {
  const organization = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, id))
    .get();
  if (!organization) return null;

  const members = await db
    .select({ member: membersTable, user: users })
    .from(membersTable)
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(eq(membersTable.organizationId, id))
    .orderBy(asc(membersTable.createdAt));
  return {
    ...toOrganization(organization),
    members: members.map(({ member, user }) =>
      toMemberView(member, user ? user.name : null),
    ),
  };
}

// ─────────────── Member-facing (web sidebar + Enterprise page) ───────────────

// The gating signal for the Enterprise sidebar tab: only an active member of
// an active organization counts.
export async function getMembership(
  db: Db,
  userId: string,
): Promise<TEnterpriseMembership | null> {
  const row = await db
    .select({ member: membersTable, organization: organizationsTable })
    .from(membersTable)
    .innerJoin(
      organizationsTable,
      eq(membersTable.organizationId, organizationsTable.id),
    )
    .where(
      and(
        eq(membersTable.userId, userId),
        eq(membersTable.status, "active"),
        eq(organizationsTable.status, "active"),
      ),
    )
    .get();
  if (!row) return null;
  return {
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    role: row.member.role,
  };
}

export async function findOrganizationForMember(
  db: Db,
  userId: string,
): Promise<TEnterpriseOrganizationDetail | null> {
  const member = await db
    .select()
    .from(membersTable)
    .where(
      and(eq(membersTable.userId, userId), eq(membersTable.status, "active")),
    )
    .get();
  if (!member) return null;
  const organization = await db
    .select()
    .from(organizationsTable)
    .where(
      and(
        eq(organizationsTable.id, member.organizationId),
        eq(organizationsTable.status, "active"),
      ),
    )
    .get();
  if (!organization) return null;

  const members = await db
    .select({ member: membersTable, user: users })
    .from(membersTable)
    .leftJoin(users, eq(membersTable.userId, users.id))
    .where(eq(membersTable.organizationId, organization.id))
    .orderBy(asc(membersTable.createdAt));
  return {
    ...toOrganization(organization),
    members: members.map(({ member, user }) =>
      toMemberView(member, user ? user.name : null),
    ),
  };
}

export type TAddMemberOutcome =
  | { ok: true; member: TEnterpriseMemberView; invited: boolean }
  | { ok: false; reason: "forbidden" | "not_found" | "seat_limit" | "member_exists" };

export async function addMember(
  db: Db,
  callerId: string,
  email: string,
): Promise<TAddMemberOutcome> {
  const admin = await findActiveAdmin(db, callerId);
  if (!admin) return { ok: false, reason: "forbidden" };

  const activeCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(membersTable)
    .where(
      and(
        eq(membersTable.organizationId, admin.organizationId),
        inArray(membersTable.status, ACTIVE_MEMBER_STATUSES),
      ),
    )
    .get();
  if ((activeCount?.count ?? 0) >= admin.approvedSeats) {
    return { ok: false, reason: "seat_limit" };
  }

  const existing = await db
    .select()
    .from(membersTable)
    .where(
      and(
        eq(membersTable.organizationId, admin.organizationId),
        eq(membersTable.email, email),
      ),
    )
    .get();
  if (existing && existing.status === "deactivated") {
    // Re-adding a removed member restores their seat.
    const user = await findByEmail(email, db);
    const now = new Date().toISOString();
    const updated: EnterpriseMemberRow = {
      ...existing,
      userId: user?.id ?? existing.userId,
      status: "active",
      updatedAt: now,
    };
    await db
      .update(membersTable)
      .set({ userId: user?.id ?? existing.userId, status: "active", updatedAt: now })
      .where(eq(membersTable.id, existing.id));
    return {
      ok: true,
      member: toMemberView(updated, user ? user.name : null),
      invited: !user,
    };
  }
  if (existing) return { ok: false, reason: "member_exists" };

  const platformUser = await findByEmail(email, db);
  const now = new Date().toISOString();
  const row: EnterpriseMemberRow = {
    id: crypto.randomUUID(),
    organizationId: admin.organizationId,
    userId: platformUser?.id ?? null,
    email,
    role: "member",
    status: platformUser ? "active" : "invited",
    tokensAllocated: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(membersTable).values(row);
  return {
    ok: true,
    member: toMemberView(row, platformUser ? platformUser.name : null),
    invited: !platformUser,
  };
}

export type TUpdateMemberOutcome =
  | { ok: true; member: TEnterpriseMemberView }
  | { ok: false; reason: "forbidden" | "not_found" | "seat_limit" };

// Only the organization admin can change a member's seat; members cannot
// touch their own row or anyone else's.
export async function updateMemberStatus(
  db: Db,
  callerId: string,
  memberId: string,
  status: "active" | "deactivated",
): Promise<TUpdateMemberOutcome> {
  const admin = await findActiveAdmin(db, callerId);
  if (!admin) return { ok: false, reason: "forbidden" };

  const target = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .get();
  if (!target) return { ok: false, reason: "not_found" };
  if (target.organizationId !== admin.organizationId) {
    return { ok: false, reason: "forbidden" };
  }
  if (target.role === "admin" && status === "deactivated") {
    // The requester seats the org admin; deactivating the last admin would
    // orphan the organization.
    return { ok: false, reason: "forbidden" };
  }
  if (status === "active") {
    const activeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(membersTable)
      .where(
        and(
          eq(membersTable.organizationId, admin.organizationId),
          inArray(membersTable.status, ACTIVE_MEMBER_STATUSES),
        ),
      )
      .get();
    if ((activeCount?.count ?? 0) >= admin.approvedSeats) {
      return { ok: false, reason: "seat_limit" };
    }
  }

  const platformUser = target.userId
    ? null
    : await findByEmail(target.email, db);
  const now = new Date().toISOString();
  const updated: EnterpriseMemberRow = {
    ...target,
    userId: target.userId ?? platformUser?.id ?? null,
    status,
    updatedAt: now,
  };
  await db
    .update(membersTable)
    .set({ status, updatedAt: now })
    .where(eq(membersTable.id, memberId));
  return {
    ok: true,
    member: toMemberView(
      updated,
      platformUser?.name ?? null,
    ),
  };
}

async function findActiveAdmin(
  db: Db,
  userId: string,
): Promise<
  | (EnterpriseMemberRow & {
      approvedSeats: number;
      organizationStatus: string;
    })
  | null
> {
  const row = await db
    .select({ member: membersTable, organization: organizationsTable })
    .from(membersTable)
    .innerJoin(
      organizationsTable,
      eq(membersTable.organizationId, organizationsTable.id),
    )
    .where(
      and(
        eq(membersTable.userId, userId),
        eq(membersTable.role, "admin"),
        eq(membersTable.status, "active"),
        eq(organizationsTable.status, "active"),
      ),
    )
    .get();
  if (!row) return null;
  return {
    ...row.member,
    approvedSeats: row.organization.approvedSeats,
    organizationStatus: row.organization.status,
  };
}

// Called on register/login: a pending invite becomes an active seat the
// moment the invitee signs in with that email.
export async function activateInvites(
  db: Db,
  userId: string,
  email: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(membersTable)
    .where(
      and(
        eq(membersTable.email, email),
        eq(membersTable.status, "invited"),
      ),
    )
    .all();
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  for (const row of rows) {
    await db
      .update(membersTable)
      .set({ userId, status: "active", updatedAt: now })
      .where(eq(membersTable.id, row.id));
  }
}