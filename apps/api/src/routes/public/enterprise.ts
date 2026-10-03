import { Hono } from "hono";
import {
  ZEnterpriseMemberCreate,
  ZEnterpriseMemberStatusUpdate,
  ZEnterpriseRequestCreate,
} from "@vidhan/schema";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import { requireAuth, type TAuthContext } from "../../auth";
import {
  addMember,
  createRequest,
  findOrganizationForMember,
  getMembership,
  listRequestsForUser,
  updateMemberStatus,
} from "../../enterprise";

export const enterprise = new Hono<TAuthContext>();

enterprise.use("*", requireAuth());

enterprise.post("/requests", async (c) => {
  const parsed = await parseJson(c, ZEnterpriseRequestCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const request = await createRequest(db, c.get("user").id, parsed.data);
  return c.json({ request }, 201);
});

enterprise.get("/requests/mine", async (c) => {
  const db = createDb(c.env.DB);
  const requests = await listRequestsForUser(db, c.get("user").id);
  return c.json({ requests });
});

// Gating signal for the Enterprise sidebar tab: active membership of an
// active organization, or null.
enterprise.get("/membership", async (c) => {
  const db = createDb(c.env.DB);
  const membership = await getMembership(db, c.get("user").id);
  return c.json({ membership });
});

enterprise.get("/organization", async (c) => {
  const db = createDb(c.env.DB);
  const organization = await findOrganizationForMember(
    db,
    c.get("user").id,
  );
  if (!organization) return c.json({ error: "not_found" }, 404);
  return c.json({ organization });
});

enterprise.post("/members", async (c) => {
  const parsed = await parseJson(c, ZEnterpriseMemberCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const outcome = await addMember(db, c.get("user").id, parsed.data.email);
  if (!outcome.ok) {
    switch (outcome.reason) {
      case "forbidden":
        return c.json({ error: "forbidden" }, 403);
      case "seat_limit":
        return c.json({ error: "seat_limit_exceeded" }, 409);
      case "member_exists":
        return c.json({ error: "member_exists" }, 409);
      default:
        return c.json({ error: "not_found" }, 404);
    }
  }
  return c.json(
    { member: outcome.member, invited: outcome.invited },
    201,
  );
});

enterprise.patch("/members/:id", async (c) => {
  const parsed = await parseJson(c, ZEnterpriseMemberStatusUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const outcome = await updateMemberStatus(
    db,
    c.get("user").id,
    c.req.param("id"),
    parsed.data.status,
  );
  if (!outcome.ok) {
    switch (outcome.reason) {
      case "forbidden":
        return c.json({ error: "forbidden" }, 403);
      case "seat_limit":
        return c.json({ error: "seat_limit_exceeded" }, 409);
      default:
        return c.json({ error: "not_found" }, 404);
    }
  }
  return c.json({ member: outcome.member });
});