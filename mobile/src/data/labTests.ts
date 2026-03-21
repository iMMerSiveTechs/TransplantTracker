export const PINK_DATES = new Set([
  "2026-02-16","2026-03-16","2026-04-13","2026-05-11","2026-06-15",
  "2026-07-13","2026-08-10","2026-09-14","2026-10-12","2026-11-16","2026-12-14"
]);

export const GREEN_DATES = new Set(["2026-03-16"]);

export const LAB_TESTS: Record<string, string[]> = {
  yellow: ["CBC, Diff, Plt count", "Basic Metabolic Panel (BMP)", "Phosphorus", "Tacrolimus FK506"],
  pink: ["CBC, Diff, Plt count", "Comprehensive Metabolic Panel (CMP)", "Urinalysis C+S, if indicated", "Tacrolimus FK506", "BK Virus DNA, Blood (PCR quant)", "BK Virus DNA, Urine (PCR quant)"],
  green: ["HIV RNA Quant PCR", "Hepatitis B Virus DNA, Real-Time PCR", "HCV RNA PCR Quant"],
};

export const LAB_CODES: Record<string, Record<string, string>> = {
  yellow: { "CBC, Diff, Plt count": "005009", "Basic Metabolic Panel (BMP)": "322758", "Phosphorus": "001024", "Tacrolimus FK506": "700248" },
  pink: { "CBC, Diff, Plt count": "5009", "Comprehensive Metabolic Panel (CMP)": "322000", "Urinalysis C+S, if indicated": "8847", "Tacrolimus FK506": "700248", "BK Virus DNA, Blood (PCR quant)": "138962", "BK Virus DNA, Urine (PCR quant)": "138880" },
  green: { "HIV RNA Quant PCR": "550920", "Hepatitis B Virus DNA, Real-Time PCR": "551620", "HCV RNA PCR Quant": "550100" },
};

export const LAB_R: Record<string, { label: string; unit: string; green: [number, number]; yellow: [number, number]; note: string }> = {
  cr: { label: "Creatinine", unit: "mg/dL", green: [0.7, 1.3], yellow: [1.3, 2.0], note: "Target: 0.7-1.3" },
  tac: { label: "Tacrolimus", unit: "ng/mL", green: [5, 15], yellow: [3, 5], note: "Target: 5-15" },
  gfr: { label: "GFR", unit: "mL/min", green: [60, 999], yellow: [30, 60], note: "Target: >60" },
  phos: { label: "Phosphorus", unit: "mg/dL", green: [2.5, 4.5], yellow: [4.5, 5.5], note: "Target: 2.5-4.5" },
  k: { label: "Potassium", unit: "mEq/L", green: [3.5, 5.0], yellow: [5.0, 5.5], note: "Target: 3.5-5.0" },
  glu: { label: "Glucose", unit: "mg/dL", green: [70, 140], yellow: [140, 200], note: "Target: 70-140" },
};

export function labClr(key: string, val: string): string {
  if (!val || isNaN(parseFloat(val))) return "muted";
  const v = parseFloat(val);
  const r = LAB_R[key];
  if (!r) return "muted";
  if (v >= r.green[0] && v <= r.green[1]) return "success";
  if (key === "gfr") return v >= r.yellow[0] ? "warning" : "danger";
  return v >= r.yellow[0] && v <= r.yellow[1] ? "warning" : "danger";
}
