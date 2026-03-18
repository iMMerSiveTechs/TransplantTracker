import { LAB_R, CL_LIMITS, type LabKey } from '@/data/clinicalLimits';

export interface LabInterpretation {
  status: 'normal' | 'watch' | 'alert' | 'critical';
  color: string;    // hex color for UI
  bgColor: string;  // background hex color
  label: string;    // "Good", "Watch", "Alert", "Critical"
  icon: string;     // emoji
  message: string;  // 1–2 sentence plain-language interpretation
  action?: string;  // what to do if not normal
}

// Color palette per status
const STATUS_COLORS: Record<LabInterpretation['status'], { color: string; bgColor: string; label: string; icon: string }> = {
  normal:   { color: '#047857', bgColor: '#ECFDF5', label: 'Good',     icon: '✅' },
  watch:    { color: '#B45309', bgColor: '#FFFBEB', label: 'Watch',    icon: '⚠️' },
  alert:    { color: '#C2410C', bgColor: '#FFF7ED', label: 'Alert',    icon: '🔶' },
  critical: { color: '#BE123C', bgColor: '#FFF1F2', label: 'Critical', icon: '🚨' },
};

type LabRange = {
  green: readonly [number, number];
  yellow: readonly [number, number];
  danger: number;
  unit: string;
  label: string;
  reverseAlert?: boolean;
};

function getRange(key: LabKey): LabRange {
  return LAB_R[key] as LabRange;
}

function classifyStatus(key: LabKey, value: number): LabInterpretation['status'] {
  const r = getRange(key);
  const reverseAlert = r.reverseAlert === true;

  if (reverseAlert) {
    if (value <= r.danger) return 'critical';
    if (value < r.yellow[0]) return 'alert';
    if (value < r.green[0]) return 'watch';
    // High side watch for WBC (elevated WBC can indicate infection)
    const greenRange = r.green[1] - r.green[0];
    if (value > r.green[1] + greenRange * 0.1) return 'watch';
    return 'normal';
  } else {
    if (value >= r.danger) return 'critical';
    if (value >= r.yellow[0]) return 'alert';
    // Low-side check
    if (value < r.green[0]) {
      if (value < r.yellow[0]) return 'alert';
      return 'watch';
    }
    // Near high boundary
    const greenRange = r.green[1] - r.green[0];
    if (value > r.green[1] - greenRange * 0.1) return 'watch';
    return 'normal';
  }
}

function buildMessage(key: LabKey, value: number, status: LabInterpretation['status']): { message: string; action?: string } {
  const r = getRange(key);
  const u = r.unit;
  const v = value.toFixed(key === 'labGlu' || key === 'labGfr' ? 0 : 1);

  switch (key) {
    case 'labCr':
      if (status === 'normal') return { message: `Creatinine is ${v} ${u} — within the normal transplant range. Kidney function looks stable.` };
      if (status === 'watch')  return { message: `Creatinine is ${v} ${u} — slightly elevated but manageable. Keep monitoring.`, action: 'Log your next lab when available and stay hydrated.' };
      if (status === 'alert')  return { message: `Creatinine is ${v} ${u} — above the safe threshold. This can indicate reduced kidney function.`, action: 'Contact your transplant coordinator soon.' };
      return { message: `Creatinine is critically high at ${v} ${u}. This is a serious sign of kidney stress.`, action: 'Call your transplant team or seek urgent care immediately.' };

    case 'labTac':
      if (value < r.green[0]) {
        if (status === 'critical') return { message: `Tacrolimus level is dangerously low at ${v} ${u}. Risk of rejection is elevated.`, action: 'Contact your transplant team immediately — do not skip doses.' };
        if (status === 'alert')    return { message: `Tacrolimus is sub-therapeutic at ${v} ${u}. Protection against rejection may be insufficient.`, action: 'Notify your transplant team; a dose adjustment may be needed.' };
        return { message: `Tacrolimus is slightly below the target range at ${v} ${u}. Mention this at your next visit.`, action: 'Discuss with your team if this persists.' };
      }
      if (status === 'normal') return { message: `Tacrolimus is ${v} ${u} — well within the therapeutic window. Great adherence.` };
      if (status === 'watch')  return { message: `Tacrolimus is ${v} ${u} — near the upper boundary of the target range. Continue monitoring.` };
      if (status === 'alert')  return { message: `Tacrolimus is elevated at ${v} ${u}. High levels can cause kidney toxicity and side effects.`, action: 'Contact your transplant team to discuss your dose.' };
      return { message: `Tacrolimus is critically high at ${v} ${u}. Toxicity risk is significant.`, action: 'Call your transplant coordinator or go to the ER.' };

    case 'labGfr':
      if (status === 'normal')   return { message: `Kidney filtration rate (GFR) is ${v} ${u} — good kidney function.` };
      if (status === 'watch')    return { message: `GFR is ${v} ${u} — mildly reduced. Monitor trends over time.`, action: 'Stay well hydrated and avoid nephrotoxic medications (e.g. ibuprofen).' };
      if (status === 'alert')    return { message: `GFR is ${v} ${u} — moderately reduced, indicating significant loss of kidney function.`, action: 'Discuss this with your transplant team at your next visit.' };
      return { message: `GFR is critically low at ${v} ${u}. Kidney function is severely impaired.`, action: 'Contact your transplant team immediately.' };

    case 'labK':
      if (status === 'normal') return { message: `Potassium is ${v} ${u} — normal and safe for heart function.` };
      if (value > r.green[1]) {
        if (status === 'watch')    return { message: `Potassium is slightly elevated at ${v} ${u}. Limit high-potassium foods.`, action: 'Reduce bananas, oranges, potatoes, and tomatoes.' };
        if (status === 'alert')    return { message: `Potassium is high at ${v} ${u}. This can affect your heart rhythm.`, action: 'Contact your transplant coordinator and reduce potassium-rich foods immediately.' };
        return { message: `Potassium is dangerously elevated at ${v} ${u}. Risk of serious heart arrhythmia.`, action: 'Seek emergency care immediately.' };
      }
      return { message: `Potassium is low at ${v} ${u}. This can also affect heart and muscle function.`, action: 'Contact your team; they may adjust medications or recommend supplements.' };

    case 'labGlu':
      if (status === 'normal') return { message: `Blood glucose is ${v} ${u} — in the healthy range.` };
      if (status === 'watch')  return { message: `Glucose is ${v} ${u} — mildly elevated. Immunosuppressants can raise blood sugar.`, action: 'Limit sugary foods and discuss with your team if this is frequent.' };
      if (status === 'alert')  return { message: `Glucose is high at ${v} ${u}. Post-transplant diabetes is common; management is important.`, action: 'Contact your team to discuss blood sugar management.' };
      return { message: `Glucose is critically elevated at ${v} ${u}. Risk of hyperglycemic crisis.`, action: 'Seek medical attention promptly.' };

    case 'labPhos':
      if (status === 'normal') return { message: `Phosphorus is ${v} ${u} — within the normal range. Bone health looks well protected.` };
      if (status === 'watch')  return { message: `Phosphorus is ${v} ${u} — near the upper limit. Reduce high-phosphorus foods.`, action: 'Limit dairy, nuts, cola drinks, and processed foods.' };
      if (status === 'alert')  return { message: `Phosphorus is elevated at ${v} ${u}. High phosphorus weakens bones and can affect blood vessels.`, action: 'Discuss phosphate binders and dietary changes with your team.' };
      return { message: `Phosphorus is critically elevated at ${v} ${u}. Notify your transplant team.`, action: 'Contact your transplant team promptly.' };

    case 'labAlt':
    case 'labAst': {
      const lname = key === 'labAlt' ? 'ALT' : 'AST';
      if (status === 'normal') return { message: `${lname} is ${v} ${u} — liver enzyme is in the normal range.` };
      if (status === 'watch')  return { message: `${lname} is ${v} ${u} — mildly elevated. Can be related to medications or viral illness.`, action: 'Mention this at your next clinic visit.' };
      if (status === 'alert')  return { message: `${lname} is notably elevated at ${v} ${u}. This warrants investigation for liver stress or drug effects.`, action: 'Contact your transplant coordinator to review your medications.' };
      return { message: `${lname} is critically elevated at ${v} ${u}. Possible significant liver injury.`, action: 'Contact your transplant team or seek urgent care.' };
    }

    case 'labMg':
      if (status === 'normal') return { message: `Magnesium is ${v} ${u} — in the normal range.` };
      if (value < r.green[0]) {
        if (status === 'critical') return { message: `Magnesium is critically low at ${v} ${u}. Risk of muscle cramps, tremors, and heart arrhythmia.`, action: 'Contact your transplant team immediately.' };
        return { message: `Magnesium is low at ${v} ${u}. Tacrolimus commonly depletes magnesium.`, action: 'Your team may recommend magnesium supplements.' };
      }
      return { message: `Magnesium is ${v} ${u} — slightly above normal. Usually not urgent but worth noting.`, action: 'Mention at your next visit.' };

    case 'labHgb':
      if (status === 'normal') return { message: `Hemoglobin is ${v} ${u} — good oxygen-carrying capacity.` };
      if (status === 'watch')  return { message: `Hemoglobin is mildly low at ${v} ${u}. Mild anemia is common after transplant.`, action: 'Monitor for fatigue and mention at your next visit.' };
      if (status === 'alert')  return { message: `Hemoglobin is ${v} ${u} — moderate anemia. You may feel significantly fatigued.`, action: 'Discuss iron levels and anemia management with your team.' };
      return { message: `Hemoglobin is critically low at ${v} ${u}. Severe anemia requires prompt attention.`, action: 'Contact your transplant team today.' };

    case 'labWbc':
      if (status === 'normal') return { message: `White blood cell count is ${v} ${u} — immune function is in range.` };
      if (value < r.green[0]) {
        if (status === 'critical') return { message: `WBC is critically low at ${v} ${u}. Severe immunosuppression — high infection risk.`, action: 'Contact your transplant team immediately. Avoid crowds and sick contacts.' };
        return { message: `WBC is low at ${v} ${u}. This may be related to your immunosuppression medications.`, action: 'Discuss with your team; they may adjust your medication dose.' };
      }
      return { message: `WBC is elevated at ${v} ${u}. This can be a sign of infection or inflammation.`, action: 'Monitor for fever or signs of infection and contact your team if symptoms develop.' };

    case 'labBun':
      if (status === 'normal') return { message: `BUN is ${v} ${u} — kidney waste clearance is normal.` };
      if (status === 'watch')  return { message: `BUN is ${v} ${u} — mildly elevated. Could reflect dehydration or early kidney stress.`, action: 'Increase fluid intake and recheck at your next lab draw.' };
      if (status === 'alert')  return { message: `BUN is elevated at ${v} ${u}. This may indicate kidney function decline or protein intake issues.`, action: 'Discuss with your transplant team at your next appointment.' };
      return { message: `BUN is critically elevated at ${v} ${u}. Urgent kidney function evaluation needed.`, action: 'Contact your transplant team promptly.' };

    default:
      if (status === 'normal') return { message: `Value is within the normal range.` };
      return { message: `Value is outside the normal range.`, action: 'Discuss with your transplant team.' };
  }
}

// Interpret a single lab value for display
export function interpretLab(key: LabKey, value: number | null): LabInterpretation {
  if (value === null) {
    return {
      status: 'normal',
      ...STATUS_COLORS['normal'],
      message: 'No value recorded.',
    };
  }

  const status = classifyStatus(key, value);
  const { message, action } = buildMessage(key, value, status);

  return {
    status,
    ...STATUS_COLORS[status],
    message,
    ...(action ? { action } : {}),
  };
}

// Check if a lab value is in the critical range requiring immediate action
export function isLabCritical(key: LabKey, value: number): boolean {
  return classifyStatus(key, value) === 'critical';
}

// Get the reference range string for display, e.g. "5–15 ng/mL"
export function getRefRange(key: LabKey): string {
  const r = getRange(key);
  const [lo, hi] = r.green;
  // For labs where the green range extends to 999 (GFR), show as ">60"
  if (hi >= 999) return `>${lo} ${r.unit}`;
  return `${lo}–${hi} ${r.unit}`;
}

// Lab weights for health score computation
const LAB_WEIGHTS: Partial<Record<LabKey, number>> = {
  labCr:  0.25,
  labTac: 0.25,
  labGfr: 0.20,
  labK:   0.15,
  labGlu: 0.10,
  labPhos:0.05,
};

// Map status to a score component (0–100)
function statusScore(status: LabInterpretation['status']): number {
  switch (status) {
    case 'normal':   return 100;
    case 'watch':    return 75;
    case 'alert':    return 40;
    case 'critical': return 0;
  }
}

// Compute a simple 'health score' 0–100 from all current lab values
export function computeLabHealthScore(labs: Partial<Record<LabKey, number | null>>): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const [key, weight] of Object.entries(LAB_WEIGHTS) as Array<[LabKey, number]>) {
    const val = labs[key];
    if (val === null || val === undefined) continue;
    const status = classifyStatus(key, val);
    weightedScore += statusScore(status) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 100; // no data — assume fine
  return Math.round(weightedScore / totalWeight);
}
