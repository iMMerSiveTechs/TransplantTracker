import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { profile, dailyLog, medication, appointment } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const syncRouter = new Hono<AppEnv>();
syncRouter.use("*", authMiddleware);

syncRouter.get("/", async (c) => {
  const user = c.get("user");

  const [prof, logs, meds, appts] = await Promise.all([
    db.select().from(profile).where(eq(profile.userId, user.id)).limit(1),
    db.select().from(dailyLog).where(eq(dailyLog.userId, user.id)),
    db.select().from(medication).where(eq(medication.userId, user.id)),
    db.select().from(appointment).where(eq(appointment.userId, user.id)),
  ]);

  const p = prof[0];
  return c.json({
    data: {
      profile: p ? { ...p, contacts: JSON.parse(p.contacts) } : null,
      logs,
      medications: meds,
      appointments: appts,
    },
  });
});

const syncBody = z.object({
  profile: z
    .object({
      name: z.string(),
      type: z.string(),
      surgDate: z.string(),
      emergPhone: z.string().optional().default(""),
      contacts: z.array(z.any()).optional().default([]),
    })
    .optional(),
  logs: z
    .array(
      z.object({
        date: z.string(),
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
        appetite: z.string().optional().default("normal"),
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
      })
    )
    .optional()
    .default([]),
  medications: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        dosage: z.string(),
        instr: z.string().optional().default(""),
        inv: z.number().optional().default(0),
        ppd: z.number().optional().default(1),
        critical: z.boolean().optional().default(false),
        color: z.string().optional().default("#6366f1"),
        isTac: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  appointments: z
    .array(
      z.object({
        id: z.string().optional(),
        date: z.string(),
        time: z.string(),
        doc: z.string(),
        desc: z.string(),
        type: z.string().optional().default(""),
        labBy: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

syncRouter.post("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = syncBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  if (body.profile) {
    const existing = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, user.id))
      .limit(1);

    const profData = body.profile;
    if (existing.length) {
      await db
        .update(profile)
        .set({
          name: profData.name,
          type: profData.type,
          surgDate: profData.surgDate,
          emergPhone: profData.emergPhone,
          contacts: JSON.stringify(profData.contacts),
          updatedAt: now,
        })
        .where(eq(profile.userId, user.id));
    } else {
      await db.insert(profile).values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: profData.name,
        type: profData.type,
        surgDate: profData.surgDate,
        emergPhone: profData.emergPhone,
        contacts: JSON.stringify(profData.contacts),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const log of body.logs) {
    const existing = await db
      .select()
      .from(dailyLog)
      .where(and(eq(dailyLog.userId, user.id), eq(dailyLog.date, log.date)))
      .limit(1);

    const { date: _date, ...logFields } = log;
    if (existing.length) {
      await db
        .update(dailyLog)
        .set({ ...logFields, updatedAt: now })
        .where(eq(dailyLog.id, existing[0]!.id));
    } else {
      await db.insert(dailyLog).values({
        id: crypto.randomUUID(),
        userId: user.id,
        date: log.date,
        ...logFields,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (body.medications.length) {
    await db.delete(medication).where(eq(medication.userId, user.id));
    for (const med of body.medications) {
      await db.insert(medication).values({
        id: med.id || crypto.randomUUID(),
        userId: user.id,
        name: med.name,
        dosage: med.dosage,
        instr: med.instr,
        inv: med.inv,
        ppd: med.ppd,
        critical: med.critical,
        color: med.color,
        isTac: med.isTac,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (body.appointments.length) {
    await db.delete(appointment).where(eq(appointment.userId, user.id));
    for (const appt of body.appointments) {
      await db.insert(appointment).values({
        id: appt.id || crypto.randomUUID(),
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
  }

  return c.json({ data: { synced: true } });
});

export { syncRouter };
