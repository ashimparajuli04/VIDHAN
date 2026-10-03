import { Hono } from "hono";
import { ZLawyerRequestCreate } from "@vidhan/schema";
import { createDb } from "../../db";
import { parseJson, validationError } from "../../lib/validate";
import { requireAuth, type TAuthContext } from "../../auth";
import {
  createLawyerRequest,
  listOwnRequests,
} from "../../lawyer-requests";

export const lawyerRequests = new Hono<TAuthContext>();

lawyerRequests.use("*", requireAuth());

lawyerRequests.post("/", async (c) => {
  const parsed = await parseJson(c, ZLawyerRequestCreate);
  if (!parsed.ok) return validationError(c, parsed.error);

  const db = createDb(c.env.DB);
  const request = await createLawyerRequest(db, c.get("user").id, parsed.data);
  if (!request) return c.json({ error: "not_found" }, 404);
  return c.json({ request }, 201);
});

lawyerRequests.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const requests = await listOwnRequests(db, c.get("user").id);
  return c.json({ requests });
});
