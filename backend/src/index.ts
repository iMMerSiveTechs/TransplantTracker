import "@vibecodeapp/proxy";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "./env";
import { initDb } from "./db";
import { auth } from "./auth";
import { profileRouter } from "./routes/profile";
import { logsRouter } from "./routes/logs";
import { medsRouter } from "./routes/medications";
import { apptsRouter } from "./routes/appointments";
import { syncRouter } from "./routes/sync";

initDb();

const app = new Hono();

const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && allowed.some((re) => re.test(origin)) ? origin : null,
    credentials: true,
  })
);

app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api/profile", profileRouter);
app.route("/api/logs", logsRouter);
app.route("/api/medications", medsRouter);
app.route("/api/appointments", apptsRouter);
app.route("/api/sync", syncRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
