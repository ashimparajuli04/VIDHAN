import { Hono } from "hono";
import { chat } from "./chat";
import { lawyers } from "./lawyers";
import { docs } from "./docs";

export const publicRoutes = new Hono();

publicRoutes.route("/chat", chat);
publicRoutes.route("/lawyers", lawyers);
publicRoutes.route("/docs", docs);
