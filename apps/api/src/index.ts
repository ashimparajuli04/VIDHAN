import { Hono } from "hono";
import { cors } from "hono/cors";
import { publicRoutes } from "./routes/public";
import { adminRoutes } from "./routes/admin";

export type Env = {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  OPENROUTER_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => c.json({ ok: true, service: "vidhan-api" }));

app.route("/", publicRoutes);
app.route("/admin", adminRoutes);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

export default app;
