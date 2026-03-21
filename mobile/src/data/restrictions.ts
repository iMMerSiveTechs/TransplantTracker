export const RESTS = [
  { id: "r1", t: "Keep bladder empty", d: "Day and night", w: 2, i: "\u{1F6BB}" },
  { id: "r2", t: "No driving", d: "Avoid completely", w: 3, i: "\u{1F697}" },
  { id: "r3", t: "No BLTs", d: "No bending, lifting >10lbs, twisting", w: 8, i: "\u{1F3CB}\uFE0F" },
  { id: "r4", t: "No strenuous activity", d: "Wait until healed", w: 8, i: "\u{1F3C3}" },
  { id: "r5", t: "No restaurants / takeout", d: "No fast food, food trucks", w: 13, i: "\u{1F354}" },
  { id: "r6", t: "Avoid crowds", d: "No public transit, gatherings", w: 13, i: "\u{1F465}" },
  { id: "r7", t: "No vaccines", d: "Including COVID boosters", w: 13, i: "\u{1F489}" },
  { id: "r8", t: "No alcohol", d: "Then occasional, moderate", w: 26, i: "\u{1F377}" },
  { id: "r9", t: "No gardening", d: "Mask + gloves after 6mo", w: 26, i: "\u{1F331}" },
  { id: "r10", t: "Wait for dental work", d: "Antibiotics required", w: 26, i: "\u{1F9B7}" },
];

export const TRANSPLANT_TYPES = ["Kidney", "Pancreas", "Kidney & Pancreas", "Liver", "Heart", "Lung", "Other"];

export const INIT_MEDS = [
  { id: "m1", name: "Tacrolimus (Prograf)", dosage: "Per doctor", instr: "Take 12 hours apart exactly", inv: 60, ppd: 2, critical: true, color: "#6366F1", isTac: true },
  { id: "m2", name: "Mycophenolate (CellCept)", dosage: "Per doctor", instr: "Take with food", inv: 60, ppd: 2, critical: true, color: "#059669" },
  { id: "m3", name: "Prednisone", dosage: "Per doctor", instr: "Morning with food", inv: 30, ppd: 1, critical: true, color: "#D97706" },
];

export const INIT_APPTS = [
  { id: "a1", date: "2026-02-19", time: "1:30 PM", doc: "Dr. Katznelson", desc: "1 Wk Post-Discharge" },
  { id: "a2", date: "2026-02-26", time: "9:30 AM", doc: "Dr. Sandhu", desc: "2 Wks Post-Discharge", labBy: "2026-02-25" },
  { id: "a3", date: "2026-03-19", time: "9:30 AM", doc: "Dr. Peddi", desc: "4 Wks Post-Discharge", labBy: "2026-03-18" },
  { id: "a4", date: "2026-04-20", time: "9:15 AM", doc: "Dr. Kung", desc: "8 Wks Post-Discharge", labBy: "2026-04-19" },
];
