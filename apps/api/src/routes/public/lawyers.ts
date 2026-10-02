import { Hono } from "hono";
import { DISTRICTS, LANGUAGES, PRACTICE_AREAS } from "@vidhan/schema";
import type { TDistrict, TLanguage, TPracticeArea } from "@vidhan/schema";
import type { Env } from "../../index";
import { createDb } from "../../db";
import { findPublicLawyer, searchLawyers } from "../../lawyers";
import { parseCsv, parseIntParam } from "../../lib/validate";

export const lawyers = new Hono<{ Bindings: Env }>();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const isPracticeArea = (v: string): v is TPracticeArea =>
  (PRACTICE_AREAS as readonly string[]).includes(v);
const isDistrict = (v: string): v is TDistrict =>
  (DISTRICTS as readonly string[]).includes(v);
const isLanguage = (v: string): v is TLanguage =>
  (LANGUAGES as readonly string[]).includes(v);

lawyers.get("/", async (c) => {
  const rawPractice = parseCsv(c.req.query("practiceArea"));
  const rawDistrict = parseCsv(c.req.query("district"));
  const rawLanguage = parseCsv(c.req.query("language"));

  const invalid = {
    practiceArea: rawPractice.filter((v) => !isPracticeArea(v)),
    district: rawDistrict.filter((v) => !isDistrict(v)),
    language: rawLanguage.filter((v) => !isLanguage(v)),
  };
  if (invalid.practiceArea.length || invalid.district.length || invalid.language.length) {
    return c.json({ error: "validation_error", details: invalid }, 400);
  }

  const limit = parseIntParam(c.req.query("limit"), DEFAULT_LIMIT);
  const offset = parseIntParam(c.req.query("offset"), 0);
  if (limit === null || limit < 1 || offset === null) {
    return c.json(
      {
        error: "validation_error",
        details: { limit: "must be a positive integer", offset: "must be a non-negative integer" },
      },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const result = await searchLawyers(
    db,
    {
      practiceAreas: rawPractice.filter(isPracticeArea),
      districts: rawDistrict.filter(isDistrict),
      languages: rawLanguage.filter(isLanguage),
      limit: Math.min(limit, MAX_LIMIT),
      offset,
    },
    c.env,
    new URL(c.req.url).origin,
  );
  return c.json(result);
});

lawyers.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const lawyer = await findPublicLawyer(
    db,
    c.req.param("id"),
    c.env,
    new URL(c.req.url).origin,
  );
  if (!lawyer) return c.json({ error: "not_found" }, 404);
  return c.json({ lawyer });
});
