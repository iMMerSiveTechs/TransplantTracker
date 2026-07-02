import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { dailyLog } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const logsRouter = new Hono<AppEnv>();
logsRouter.use("*", authMiddleware);

const logBody = z.object({
  weight: z.string().optional().default(""),
  amTemp: z.string().optional().default(""),
  amSys: z.string().optional().default(""),
  amDia: z.string().optional().default(""),
  amHr: z.string().optional().default(""),
  pmTemp: z.string().optional().default(""),
  pmSys: z.string().optional().default(""),
  pmDia: z.string().optional().default(""),
  pmHr: z.string().optional().default(""),
  amMeds: z.boolean().optional().default(false),
  pmMeds: z.boolean().optional().default(false),
  fluidMl: z.number().optional().default(0),
  incision: z.boolean().optional().default(false),
  nausea: z.boolean().optional().default(false),
  urineDown: z.boolean().optional().default(false),
  burning: z.boolean().optional().default(false),
  pain: z.number().optional().default(0),
  acidReflux: z.boolean().optional().default(false),
  gas: z.boolean().optional().default(false),
  bloating: z.boolean().optional().default(false),
  diarrhea: z.boolean().optional().default(false),
  constipation: z.boolean().optional().default(false),
  appetite: z.enum(["poor", "reduced", "normal", "good"]).optional().default("normal"),
  tenderness: z.boolean().optional().default(false),
  swelling: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  labCr: z.string().optional().default(""),
  labTac: z.string().optional().default(""),
  labGfr: z.string().optional().default(""),
  labPhos: z.string().optional().default(""),
  labK: z.string().optional().default(""),
  labGlu: z.string().optional().default(""),
  lastTacTime: z.number().nullable().optional().default(null),
});

logsRouter.get("/", async (c) => {
  const user = c.get("user");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const conditions = [eq(dailyLog.userId, user.id)];
  if (from) conditions.push(gte(dailyLog.date, from));
  if (to) conditions.push(lte(dailyLog.date, to));

  const results = await db
    .select()
    .from(dailyLog)
    .where(and(...conditions))
    .orderBy(dailyLog.date);

  return c.json({ data: results });
});

logsRouter.get("/:date", async (c) => {
  const user = c.get("user");
  const date = c.req.param("date");

  const result = await db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.userId, user.id), eq(dailyLog.date, date)))
    .limit(1);

  return c.json({ data: result[0] ?? null });
});

logsRouter.put("/:date", async (c) => {
  const user = c.get("user");
  const date = c.req.param("date");
  const raw = await c.req.json();
  const parsed = logBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const existing = await db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.userId, user.id), eq(dailyLog.date, date)))
    .limit(1);

  if (existing.length) {
    await db
      .update(dailyLog)
      .set({ ...body, updatedAt: now })
      .where(and(eq(dailyLog.userId, user.id), eq(dailyLog.date, date)));
  } else {
    await db.insert(dailyLog).values({
      id: crypto.randomUUID(),
      userId: user.id,
      date,
      ...body,
      createdAt: now,
      updatedAt: now,
    });
  }

  const result = await db
    .select()
    .from(dailyLog)
    .where(and(eq(dailyLog.userId, user.id), eq(dailyLog.date, date)))
    .limit(1);

  return c.json({ data: result[0] });
});

export { logsRouter };
