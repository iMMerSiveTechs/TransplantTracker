import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

const sqlite = new Database("data.db");
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expiresAt INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt INTEGER,
      refreshTokenExpiresAt INTEGER,
      scope TEXT,
      password TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER,
      updatedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE REFERENCES user(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      surgDate TEXT NOT NULL,
      emergPhone TEXT NOT NULL DEFAULT '',
      contacts TEXT NOT NULL DEFAULT '[]',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_log (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      weight TEXT NOT NULL DEFAULT '',
      amTemp TEXT NOT NULL DEFAULT '',
      amSys TEXT NOT NULL DEFAULT '',
      amDia TEXT NOT NULL DEFAULT '',
      amHr TEXT NOT NULL DEFAULT '',
      pmTemp TEXT NOT NULL DEFAULT '',
      pmSys TEXT NOT NULL DEFAULT '',
      pmDia TEXT NOT NULL DEFAULT '',
      pmHr TEXT NOT NULL DEFAULT '',
      amMeds INTEGER NOT NULL DEFAULT 0,
      pmMeds INTEGER NOT NULL DEFAULT 0,
      fluidMl INTEGER NOT NULL DEFAULT 0,
      incision INTEGER NOT NULL DEFAULT 0,
      nausea INTEGER NOT NULL DEFAULT 0,
      urineDown INTEGER NOT NULL DEFAULT 0,
      burning INTEGER NOT NULL DEFAULT 0,
      pain INTEGER NOT NULL DEFAULT 0,
      acidReflux INTEGER NOT NULL DEFAULT 0,
      gas INTEGER NOT NULL DEFAULT 0,
      bloating INTEGER NOT NULL DEFAULT 0,
      diarrhea INTEGER NOT NULL DEFAULT 0,
      constipation INTEGER NOT NULL DEFAULT 0,
      appetite TEXT NOT NULL DEFAULT 'normal',
      tenderness INTEGER NOT NULL DEFAULT 0,
      swelling INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      labCr TEXT NOT NULL DEFAULT '',
      labTac TEXT NOT NULL DEFAULT '',
      labGfr TEXT NOT NULL DEFAULT '',
      labPhos TEXT NOT NULL DEFAULT '',
      labK TEXT NOT NULL DEFAULT '',
      labGlu TEXT NOT NULL DEFAULT '',
      lastTacTime INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(userId, date)
    );
    CREATE TABLE IF NOT EXISTS medication (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      instr TEXT NOT NULL DEFAULT '',
      inv INTEGER NOT NULL DEFAULT 0,
      ppd INTEGER NOT NULL DEFAULT 1,
      critical INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#6366f1',
      isTac INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointment (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      doc TEXT NOT NULL,
      desc TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      labBy TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  console.log("✅ Database initialized");
}
