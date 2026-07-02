import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ── Better Auth tables ──────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ── App Data ────────────────────────────────────────────

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  surgDate: text("surgDate").notNull(),
  emergPhone: text("emergPhone").notNull().default(""),
  contacts: text("contacts").notNull().default("[]"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const dailyLog = sqliteTable("daily_log", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weight: text("weight").notNull().default(""),
  amTemp: text("amTemp").notNull().default(""),
  amSys: text("amSys").notNull().default(""),
  amDia: text("amDia").notNull().default(""),
  amHr: text("amHr").notNull().default(""),
  pmTemp: text("pmTemp").notNull().default(""),
  pmSys: text("pmSys").notNull().default(""),
  pmDia: text("pmDia").notNull().default(""),
  pmHr: text("pmHr").notNull().default(""),
  amMeds: integer("amMeds", { mode: "boolean" }).notNull().default(false),
  pmMeds: integer("pmMeds", { mode: "boolean" }).notNull().default(false),
  fluidMl: integer("fluidMl").notNull().default(0),
  incision: integer("incision", { mode: "boolean" }).notNull().default(false),
  nausea: integer("nausea", { mode: "boolean" }).notNull().default(false),
  urineDown: integer("urineDown", { mode: "boolean" }).notNull().default(false),
  burning: integer("burning", { mode: "boolean" }).notNull().default(false),
  pain: integer("pain").notNull().default(0),
  acidReflux: integer("acidReflux", { mode: "boolean" }).notNull().default(false),
  gas: integer("gas", { mode: "boolean" }).notNull().default(false),
  bloating: integer("bloating", { mode: "boolean" }).notNull().default(false),
  diarrhea: integer("diarrhea", { mode: "boolean" }).notNull().default(false),
  constipation: integer("constipation", { mode: "boolean" }).notNull().default(false),
  appetite: text("appetite").notNull().default("normal"),
  tenderness: integer("tenderness", { mode: "boolean" }).notNull().default(false),
  swelling: integer("swelling", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").notNull().default(""),
  labCr: text("labCr").notNull().default(""),
  labTac: text("labTac").notNull().default(""),
  labGfr: text("labGfr").notNull().default(""),
  labPhos: text("labPhos").notNull().default(""),
  labK: text("labK").notNull().default(""),
  labGlu: text("labGlu").notNull().default(""),
  lastTacTime: integer("lastTacTime"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const medication = sqliteTable("medication", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  instr: text("instr").notNull().default(""),
  inv: integer("inv").notNull().default(0),
  ppd: integer("ppd").notNull().default(1),
  critical: integer("critical", { mode: "boolean" }).notNull().default(false),
  color: text("color").notNull().default("#6366f1"),
  isTac: integer("isTac", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const appointment = sqliteTable("appointment", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  time: text("time").notNull(),
  doc: text("doc").notNull(),
  desc: text("desc").notNull(),
  type: text("type").notNull().default(""),
  labBy: text("labBy").notNull().default(""),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});
