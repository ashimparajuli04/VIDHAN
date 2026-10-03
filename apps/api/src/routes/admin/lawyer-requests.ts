import { Hono } from "hono";
import { ZLawyerRequestStatusUpdate } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import {
  listAllRequests,
  updateRequestStatus,
} from "../../lawyer-requests";

export const lawyerRequests = new Hono<{ Bindings: Env }>();

lawyerRequests.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const requests = await listAllRequests(db);
  return c.json({ requests });
});

lawyerRequests.patch("/:id", async (c) => {
  const parsed = await parseJson(c, ZLawyerRequestStatusUpdate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const request = await updateRequestStatus(
    db,
    c.req.param("id"),
    parsed.data.status,
  );
  if (!request) return c.json({ error: "not_found" }, 404);
  return c.json({ request });
});
