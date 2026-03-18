import { LAB_R, type LabKey } from '@/data/clinicalLimits';
import type { DailyLog, LabDataPoint, LabTrend } from '@/data/types';

// Extract numeric value from a string lab field, returns null if empty/invalid
export function parseLabValue(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const n = parseFloat(raw.trim());
  return isNaN(n) ? null : n;
}

// Get color status based on LAB_R ranges for a given lab key and value
export function getLabStatus(key: LabKey, value: number): 'normal' | 'watch' | 'alert' | 'critical' {
  const r = LAB_R[key];
  const { green, yellow, danger, unit: _unit } = r as {
    green: readonly [number, number];
    yellow: readonly [number, number];
    danger: number;
    unit: string;
    label: string;
    reverseAlert?: boolean;
  };
  const reverseAlert = 'reverseAlert' in r ? (r as { reverseAlert?: boolean }).reverseAlert === true : false;

  if (reverseAlert) {
    // Lower is worse (GFR, Hemoglobin, WBC)
    if (value <= danger) return 'critical';
    if (value < yellow[0]) return 'alert';
    if (value < green[0]) return 'watch';
    // Check upper end — too high can also be watch (e.g. WBC elevated)
    const greenRange = green[1] - green[0];
    const watchThreshold = green[1] + greenRange * 0.1;
    if (value > watchThreshold) return 'watch';
    return 'normal';
  } else {
    // Higher is worse (Creatinine, Phosphorus, K, Glucose, ALT, AST, BUN)
    // Also handle two-sided ranges (Tac, Mg, K has low critical too)
    if (value >= danger) return 'critical';
    if (value >= yellow[0]) return 'alert';

    // Watch: within 10% of green boundary on the high end
    const greenRange = green[1] - green[0];
    const watchThreshold = green[1] - greenRange * 0.1;
    if (value > watchThreshold) return 'watch';

    // Low-side check: for labs with a defined low yellow range (e.g. Tac, Mg, K)
    // yellow range [low, high] — if value is below yellow[0] but not in green
    if (value < green[0]) {
      // Check if value is critically low using danger as low threshold for two-sided labs
      // Tac: green [5,15], yellow [4,5] — so below 4 is effectively danger low
      if (value < yellow[0]) return 'alert';
      return 'watch';
    }

    return 'normal';
  }
}

// Build an array of LabDataPoint from logs (newest first)
export function buildLabPoints(
  logs: Array<{ date: string; log: DailyLog }>,
  labKey: LabKey
): LabDataPoint[] {
  const points: LabDataPoint[] = [];
  for (const { date, log } of logs) {
    const raw = log[labKey as keyof DailyLog] as string;
    const value = parseLabValue(raw);
    if (value !== null) {
      points.push({ date, value });
    }
  }
  // Ensure newest first (caller should pass newest first, but sort just in case)
  points.sort((a, b) => b.date.localeCompare(a.date));
  return points;
}

// Linear regression: returns slope per day given {x: dayIndex, y: value} pairs
function linearRegressionSlope(pairs: Array<{ x: number; y: number }>): number {
  const n = pairs.length;
  if (n < 2) return 0;
  const sumX = pairs.reduce((s, p) => s + p.x, 0);
  const sumY = pairs.reduce((s, p) => s + p.y, 0);
  const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// Parse date string to a timestamp in days (relative to first point)
function dateToDays(dateStr: string): number {
  return new Date(dateStr).getTime() / (1000 * 60 * 60 * 24);
}

// Compute full LabTrend for a given lab key from data points
export function computeTrend(key: LabKey, points: LabDataPoint[]): LabTrend {
  const r = LAB_R[key] as {
    green: readonly [number, number];
    yellow: readonly [number, number];
    danger: number;
    unit: string;
    label: string;
    reverseAlert?: boolean;
  };
  const reverseAlert = r.reverseAlert === true;

  if (points.length === 0) {
    return {
      labKey: key,
      points: [],
      latestValue: null,
      previousValue: null,
      direction: 'unknown',
      velocityPerWeek: 0,
      status: 'normal',
      interpretation: 'No data recorded yet.',
    };
  }

  const latestValue = points[0].value;
  const previousValue = points.length > 1 ? points[1].value : null;

  // Compute velocity via linear regression on 4–8 most recent points (oldest to newest for regression)
  const usePoints = points.slice(0, Math.min(8, points.length)).reverse(); // oldest first
  let velocityPerDay = 0;

  if (usePoints.length >= 4) {
    const baseDays = dateToDays(usePoints[0].date);
    const pairs = usePoints.map((p) => ({
      x: dateToDays(p.date) - baseDays,
      y: p.value,
    }));
    velocityPerDay = linearRegressionSlope(pairs);
  } else if (usePoints.length >= 2) {
    const first = usePoints[0];
    const last = usePoints[usePoints.length - 1];
    const dayDiff = dateToDays(last.date) - dateToDays(first.date);
    velocityPerDay = dayDiff > 0 ? (last.value - first.value) / dayDiff : 0;
  }

  const velocityPerWeek = velocityPerDay * 7;

  // Direction threshold: 5% of the green range width
  const greenRange = r.green[1] - r.green[0];
  const dirThreshold = greenRange * 0.05;

  let direction: LabTrend['direction'];
  if (velocityPerWeek > dirThreshold) {
    direction = 'up';
  } else if (velocityPerWeek < -dirThreshold) {
    direction = 'down';
  } else {
    direction = 'stable';
  }

  const status = getLabStatus(key, latestValue);

  // Build interpretation text
  const interpretation = buildInterpretation(key, latestValue, direction, status, velocityPerWeek, r, reverseAlert);

  const trend: LabTrend = {
    labKey: key,
    points,
    latestValue,
    previousValue,
    direction,
    velocityPerWeek,
    status,
    interpretation,
  };

  if (status !== 'normal') {
    trend.action = buildAction(key, latestValue, status, reverseAlert, r);
  }

  return trend;
}

function buildInterpretation(
  key: LabKey,
  value: number,
  direction: LabTrend['direction'],
  status: LabTrend['status'],
  velocityPerWeek: number,
  r: { green: readonly [number, number]; yellow: readonly [number, number]; danger: number; unit: string; label: string },
  reverseAlert: boolean
): string {
  const label = r.label;
  const unit = r.unit;
  const dirWord = direction === 'up' ? 'Rising' : direction === 'down' ? 'Falling' : 'Stable';

  if (status === 'critical') {
    if (reverseAlert) {
      return `${label} is critically low at ${value} ${unit} — contact your transplant team immediately.`;
    }
    return `${label} is critically elevated at ${value} ${unit} — contact your transplant team immediately.`;
  }

  if (status === 'alert') {
    if (key === 'labCr') {
      return `${dirWord} — creatinine is at ${value} ${unit}, approaching concerning levels. Contact team if it exceeds ${r.danger} ${unit}.`;
    }
    if (key === 'labTac') {
      if (value < r.green[0]) {
        return `${dirWord} — tacrolimus level is sub-therapeutic at ${value} ${unit}. Dose may need adjustment.`;
      }
      return `${dirWord} — tacrolimus level is elevated at ${value} ${unit}. Toxicity risk; contact your team.`;
    }
    if (reverseAlert) {
      return `${label} is low at ${value} ${unit}. Trend is ${dirWord.toLowerCase()}; notify your care team.`;
    }
    return `${label} is elevated at ${value} ${unit}. ${dirWord} trend — discuss with your transplant team.`;
  }

  if (status === 'watch') {
    if (direction === 'up' && !reverseAlert) {
      return `${label} is approaching the upper limit (${value} ${unit}). Monitor closely.`;
    }
    if (direction === 'down' && reverseAlert) {
      return `${label} is drifting lower (${value} ${unit}). Keep an eye on it.`;
    }
    return `${label} is near the boundary at ${value} ${unit} — stable for now but worth watching.`;
  }

  // Normal
  if (direction === 'stable') {
    return `${label} is stable and in range at ${value} ${unit}.`;
  }
  if (direction === 'up' && reverseAlert) {
    // Rising GFR/Hgb/WBC is good if in range
    return `${label} is in range and trending up (${value} ${unit}) — a positive sign.`;
  }
  if (direction === 'down' && !reverseAlert) {
    // Falling Cr in normal range is good
    return `${label} is in range and trending down (${value} ${unit}) — looks good.`;
  }
  return `${label} is in range at ${value} ${unit}.`;
}

function buildAction(
  key: LabKey,
  value: number,
  status: LabTrend['status'],
  reverseAlert: boolean,
  r: { green: readonly [number, number]; yellow: readonly [number, number]; danger: number; unit: string; label: string }
): string {
  if (status === 'critical') {
    return 'Call your transplant coordinator or go to the ER immediately.';
  }
  if (key === 'labTac' && value < r.green[0]) {
    return 'Below therapeutic range — dose may need adjustment. Contact your transplant team.';
  }
  if (key === 'labTac' && value > r.green[1]) {
    return 'Above therapeutic range — toxicity risk. Contact your transplant team.';
  }
  if (key === 'labCr') {
    return `Contact your transplant team if creatinine exceeds ${r.danger} mg/dL.`;
  }
  if (reverseAlert) {
    return 'Notify your care team at your next visit or sooner if symptoms worsen.';
  }
  return 'Discuss with your care team at the next appointment.';
}

// Compute trends for ALL lab keys at once
export function computeAllTrends(
  logs: Array<{ date: string; log: DailyLog }>
): Record<LabKey, LabTrend> {
  const keys = Object.keys(LAB_R) as LabKey[];
  const result = {} as Record<LabKey, LabTrend>;
  for (const key of keys) {
    const points = buildLabPoints(logs, key);
    result[key] = computeTrend(key, points);
  }
  return result;
}

// Returns true if a trend warrants showing an alert banner
export function isTrendAlerting(trend: LabTrend): boolean {
  return trend.status === 'alert' || trend.status === 'critical';
}

// Returns a human-readable velocity string like "+0.2 mg/dL/week" or "-3 mL/min/week"
export function fmtVelocity(trend: LabTrend): string {
  const r = LAB_R[trend.labKey as LabKey] as { unit: string };
  const v = trend.velocityPerWeek;
  if (Math.abs(v) < 0.005) return `~0 ${r.unit}/week`;
  const sign = v > 0 ? '+' : '';
  const decimals = Math.abs(v) < 1 ? 2 : 1;
  return `${sign}${v.toFixed(decimals)} ${r.unit}/week`;
}
