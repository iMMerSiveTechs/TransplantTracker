import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { appointment } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const apptsRouter = new Hono<AppEnv>();
apptsRouter.use("*", authMiddleware);

const apptBody = z.object({
  date: z.string(),
  time: z.string(),
  doc: z.string(),
  desc: z.string(),
  type: z.string().optional().default(""),
  labBy: z.string().optional().default(""),
});

apptsRouter.get("/", async (c) => {
  const user = c.get("user");
  const results = await db
    .select()
    .from(appointment)
    .where(eq(appointment.userId, user.id))
    .orderBy(appointment.date);
  return c.json({ data: results });
});

apptsRouter.post("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = apptBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const id = crypto.randomUUID();
  await db.insert(appointment).values({
    id,
    userId: user.id,
    date: body.date,
    time: body.time,
    doc: body.doc,
    desc: body.desc,
    type: body.type,
    labBy: body.labBy,
    createdAt: now,
    updatedAt: now,
  });

  const result = await db
    .select()
    .from(appointment)
    .where(eq(appointment.id, id))
    .limit(1);
  return c.json({ data: result[0] }, 201);
});

apptsRouter.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const raw = await c.req.json();
  const parsed = apptBody.partial().safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (body.date !== undefined) updateData.date = body.date;
  if (body.time !== undefined) updateData.time = body.time;
  if (body.doc !== undefined) updateData.doc = body.doc;
  if (body.desc !== undefined) updateData.desc = body.desc;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.labBy !== undefined) updateData.labBy = body.labBy;

  await db
    .update(appointment)
    .set(updateData)
    .where(and(eq(appointment.id, id), eq(appointment.userId, user.id)));

  const result = await db
    .select()
    .from(appointment)
    .where(and(eq(appointment.id, id), eq(appointment.userId, user.id)))
    .limit(1);

  if (!result.length) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: result[0] });
});

apptsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  await db
    .delete(appointment)
    .where(and(eq(appointment.id, id), eq(appointment.userId, user.id)));

  return c.body(null, 204);
});

apptsRouter.post("/bulk", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = z.array(apptBody).safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const appts = parsed.data;
  const now = new Date();

  for (const appt of appts) {
    await db.insert(appointment).values({
      id: crypto.randomUUID(),
      userId: user.id,
      date: appt.date,
      time: appt.time,
      doc: appt.doc,
      desc: appt.desc,
      type: appt.type,
      labBy: appt.labBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  const results = await db
    .select()
    .from(appointment)
    .where(eq(appointment.userId, user.id))
    .orderBy(appointment.date);
  return c.json({ data: results }, 201);
});

export { apptsRouter };
