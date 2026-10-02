import { Hono } from "hono";
import { auth } from "./auth";
import { chat } from "./chat";
import { lawyers } from "./lawyers";
import { docs } from "./docs";
import { uploads } from "./uploads";

export const publicRoutes = new Hono();

publicRoutes.route("/auth", auth);
publicRoutes.route("/chat", chat);
publicRoutes.route("/lawyers", lawyers);
publicRoutes.route("/docs", docs);
publicRoutes.route("/uploads", uploads);
