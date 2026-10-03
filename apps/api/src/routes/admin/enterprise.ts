import { Hono } from "hono";
import {
  ENTERPRISE_REQUEST_STATUSES,
  ZEnterpriseApprovalConfig,
  ZEnterpriseRequestStatusUpdate,
} from "@vidhan/schema";
import type { TEnterpriseRequestStatus } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import {
  approveRequest,
  findOrganizationForAdmin,
  findRequestForAdmin,
  listOrganizationsForAdmin,
  listRequestsForAdmin,
  setRequestStatus,
} from "../../enterprise";

export const enterprise = new Hono<{ Bindings: Env }>();

const isStatus = (value: string): value is TEnterpriseRequestStatus =>
  (ENTERPRISE_REQUEST_STATUSES as readonly string[]).includes(value);

enterprise.get("/requests", async (c) => {
  const rawStatus = c.req.query("status");
  if (rawStatus !== undefined && !isStatus(rawStatus)) {
    return c.json(
      { error: "validation_error", details: { status: "unknown status" } },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const requests = await listRequestsForAdmin(db, rawStatus);
  return c.json({ requests });
});

enterprise.get("/requests/:id", async (c) => {
  const db = createDb(c.env.DB);
  const request = await findRequestForAdmin(db, c.req.param("id"));
  if (!request) return c.json({ error: "not_found" }, 404);
  return c.json({ request });
});

enterprise.patch("/requests/:id", async (c) => {
  const parsed = await parseJson(c, ZEnterpriseRequestStatusUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const request = await setRequestStatus(db, c.req.param("id"), parsed.data.status);
  if (!request) return c.json({ error: "not_found" }, 404);
  return c.json({ request });
});

enterprise.post("/requests/:id/approve", async (c) => {
  const parsed = await parseJson(c, ZEnterpriseApprovalConfig);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const outcome = await approveRequest(db, c.req.param("id"), parsed.data);
  if (!outcome.ok) {
    return outcome.reason === "already_approved"
      ? c.json({ error: "already_approved" }, 409)
      : c.json({ error: "not_found" }, 404);
  }
  return c.json(
    { request: outcome.request, organization: outcome.organization },
    201,
  );
});

enterprise.get("/organizations", async (c) => {
  const db = createDb(c.env.DB);
  const organizations = await listOrganizationsForAdmin(db);
  return c.json({ organizations });
});

enterprise.get("/organizations/:id", async (c) => {
  const db = createDb(c.env.DB);
  const organization = await findOrganizationForAdmin(db, c.req.param("id"));
  if (!organization) return c.json({ error: "not_found" }, 404);
  return c.json({ organization });
});