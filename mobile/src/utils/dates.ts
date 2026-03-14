import { PINK_DATES, GREEN_DATES } from '../data/labTests';

export const parseLocalDay = (s: any): Date =>
  new Date(typeof s === "string" && !s.includes("T") ? `${s}T12:00:00` : s);

export const toId = (d: Date): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const dBt = (a: Date, b: Date): number =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

export const wBt = (a: Date, b: Date): number =>
  Math.floor(dBt(a, b) / 7);

export const addD = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const cl = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(v, lo), hi);

export const fmt = (d: Date, o: Intl.DateTimeFormatOptions): string =>
  new Date(d).toLocaleDateString("en-US", o);

export const fmtDate = (d: Date): string =>
  fmt(d, { weekday: "long", month: "long", day: "numeric" });

export const fmtShort = (d: Date): string =>
  fmt(d, { month: "short", day: "numeric" });

export const fmtWd = (d: Date): string =>
  fmt(d, { weekday: "short" });

export function greet(n: string): string {
  const h = new Date().getHours();
  return h < 12 ? `Good morning, ${n}` : h < 17 ? `Good afternoon, ${n}` : h < 21 ? `Good evening, ${n}` : `Rest well, ${n}`;
}

export function getLabType(d: Date): string | null {
  const id = toId(d);
  const pink = PINK_DATES.has(id);
  const green = GREEN_DATES.has(id);
  if (pink && green) return "pink-green";
  if (pink) return "pink";
  if (green) return "green";
  const day = new Date(d).getDay();
  if (day === 1 || day === 4) return "yellow";
  return null;
}

export function nxLab(): Date {
  let d = addD(new Date(), 1);
  while (!getLabType(d)) d = addD(d, 1);
  return d;
}

export function fastTn(): boolean {
  return !!getLabType(addD(new Date(), 1));
}

// Fallback for users who haven't set their surgery date yet.
// Returned as a function so each call gets the current date rather than
// the date the module was first loaded (which could be days ago if the app
// was left running across midnight).
export const getSurgDefault = (): Date => new Date();
