import { Hono } from "hono";
import { auth } from "./auth";
import { chat } from "./chat";
import { lawyers } from "./lawyers";
import { lawyerRequests } from "./lawyer-requests";
import { docs } from "./docs";
import { support } from "./support";
import { uploads } from "./uploads";
import { usage } from "./usage";

export const publicRoutes = new Hono();

publicRoutes.route("/auth", auth);
publicRoutes.route("/chat", chat);
publicRoutes.route("/lawyers", lawyers);
publicRoutes.route("/lawyer-requests", lawyerRequests);
publicRoutes.route("/docs", docs);
publicRoutes.route("/support", support);
publicRoutes.route("/uploads", uploads);
publicRoutes.route("/usage", usage);
