import { existsSync } from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import { loadUser } from "./auth";
import { logger } from "./lib/logger";
import router from "./routes";

const app: Express = express();

app.use(pinoHttp({ logger, serializers: { req: (req) => ({ id: req.id, method: req.method, url: req.url?.split("?")[0] }), res: (res) => ({ statusCode: res.statusCode }) } }));
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));
app.use(loadUser);
// State-changing calls must come from this site (cookies are SameSite=Lax; this also rejects cross-site form posts).
app.use("/api", (req, res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return void res.status(403).json({ error: "Cross-site request blocked" });
  next();
});
app.use("/api", router);

// Single-process deployment: serve the built web app when it exists (dev uses the Vite server and its /api proxy).
const webDist = path.resolve(process.cwd(), process.env["WEB_DIST"] ?? "../orca-web/dist/public");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "unhandled error");
  res.status(500).json({ error: "Internal error" });
});

export default app;
