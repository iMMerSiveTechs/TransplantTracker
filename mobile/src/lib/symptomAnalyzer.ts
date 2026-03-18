import type { DailyLog } from '@/data/types';
import { CL_LIMITS } from '@/data/clinicalLimits';

// Boolean symptom keys in DailyLog
export type SymptomKey =
  | 'incision'
  | 'nausea'
  | 'urineDown'
  | 'burning'
  | 'acidReflux'
  | 'gas'
  | 'bloating'
  | 'diarrhea'
  | 'constipation'
  | 'tenderness'
  | 'swelling'
  | 'edema'
  | 'fatigue'
  | 'shortnessOfBreath';

export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  incision:          'Incision Site Issue',
  nausea:            'Nausea',
  urineDown:         'Decreased Urine Output',
  burning:           'Burning with Urination',
  acidReflux:        'Acid Reflux',
  gas:               'Gas',
  bloating:          'Bloating',
  diarrhea:          'Diarrhea',
  constipation:      'Constipation',
  tenderness:        'Kidney Site Tenderness',
  swelling:          'Swelling',
  edema:             'Edema (Fluid Retention)',
  fatigue:           'Fatigue',
  shortnessOfBreath: 'Shortness of Breath',
};

const SYMPTOM_KEYS: SymptomKey[] = Object.keys(SYMPTOM_LABELS) as SymptomKey[];

export interface SymptomFrequency {
  key: SymptomKey;
  label: string;
  count: number;       // days present in period
  totalDays: number;   // days with any logged data
  pct: number;         // 0–100
  trend: 'improving' | 'worsening' | 'stable';
}

export interface WeeklySummary {
  weekStart: string;        // "YYYY-MM-DD"
  avgWeight: number | null;
  avgMood: number | null;
  avgSleep: number | null;
  avgStress: number | null;
  avgEnergy: number | null;
  avgFluid: number | null;
  topSymptoms: SymptomKey[]; // up to 3 most frequent
  doseAdherencePct: number;  // 0–100 (passed in)
  alerts: string[];           // notable events
}

// Determine if a log entry has any meaningful data (not just an empty entry)
function hasData(log: DailyLog): boolean {
  return (
    log.weight !== '' ||
    log.amTemp !== '' ||
    log.pmTemp !== '' ||
    log.labCr !== '' ||
    SYMPTOM_KEYS.some((k) => log[k] === true) ||
    log.mood > 0 ||
    log.fluidMl > 0
  );
}

// Parse float safely
function parseNum(val: string | number): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

// Average of an array of numbers, excluding nulls
function avg(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

// Analyze symptom frequency over a set of logs
export function analyzeSymptoms(
  logs: Array<{ date: string; log: DailyLog }>
): SymptomFrequency[] {
  if (logs.length === 0) {
    return SYMPTOM_KEYS.map((key) => ({
      key,
      label: SYMPTOM_LABELS[key],
      count: 0,
      totalDays: 0,
      pct: 0,
      trend: 'stable' as const,
    }));
  }

  // Sort oldest first for half-period comparison
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const totalDays = sorted.filter(({ log }) => hasData(log)).length;

  // Split into first half and second half for trend calculation
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  return SYMPTOM_KEYS.map((key) => {
    const count = sorted.filter(({ log }) => log[key] === true).length;
    const pct = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0;

    // Trend: compare symptom rate in first half vs second half
    const firstCount = firstHalf.filter(({ log }) => log[key] === true).length;
    const secondCount = secondHalf.filter(({ log }) => log[key] === true).length;
    const firstRate = firstHalf.length > 0 ? firstCount / firstHalf.length : 0;
    const secondRate = secondHalf.length > 0 ? secondCount / secondHalf.length : 0;

    let trend: SymptomFrequency['trend'];
    const delta = secondRate - firstRate;
    if (delta > 0.1) {
      trend = 'worsening';
    } else if (delta < -0.1) {
      trend = 'improving';
    } else {
      trend = 'stable';
    }

    return {
      key,
      label: SYMPTOM_LABELS[key],
      count,
      totalDays,
      pct,
      trend,
    };
  });
}

// Compute weekly summary from logs + dose records
export function computeWeeklySummary(
  logs: Array<{ date: string; log: DailyLog }>,
  doseAdherencePct: number
): WeeklySummary {
  // Determine earliest date as weekStart
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const weekStart = sorted.length > 0 ? sorted[0].date : new Date().toISOString().slice(0, 10);

  const weights: Array<number | null> = sorted.map(({ log }) => parseNum(log.weight));
  const moods:   Array<number | null> = sorted.map(({ log }) => log.mood > 0 ? log.mood : null);
  const sleeps:  Array<number | null> = sorted.map(({ log }) => log.sleepQuality > 0 ? log.sleepQuality : null);
  const stresses:Array<number | null> = sorted.map(({ log }) => log.stressLevel > 0 ? log.stressLevel : null);
  const energies:Array<number | null> = sorted.map(({ log }) => log.energyLevel > 0 ? log.energyLevel : null);
  const fluids:  Array<number | null> = sorted.map(({ log }) => log.fluidMl > 0 ? log.fluidMl : null);

  // Top symptoms by frequency
  const freqs = analyzeSymptoms(logs);
  const topSymptoms: SymptomKey[] = freqs
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((f) => f.key);

  // Build alerts
  const alerts: string[] = [];

  // Fever days
  const feverDays = sorted.filter(({ log }) => {
    const am = parseNum(log.amTemp);
    const pm = parseNum(log.pmTemp);
    return (am !== null && am >= CL_LIMITS.feverWarning) ||
           (pm !== null && pm >= CL_LIMITS.feverWarning);
  });
  if (feverDays.length > 0) {
    alerts.push(`Fever recorded on ${feverDays.length} day${feverDays.length > 1 ? 's' : ''} — contact your team if it recurs.`);
  }

  // Significant weight gain
  const validWeights = sorted
    .map(({ date, log }) => ({ date, w: parseNum(log.weight) }))
    .filter((e): e is { date: string; w: number } => e.w !== null);

  if (validWeights.length >= 2) {
    const firstW = validWeights[0].w;
    const lastW = validWeights[validWeights.length - 1].w;
    const gain = lastW - firstW;
    if (gain >= CL_LIMITS.weightGain7dAlert) {
      alerts.push(`Weight increased by ${gain.toFixed(1)} lbs this period — monitor for fluid retention.`);
    }
    // Check single-day gains
    for (let i = 1; i < validWeights.length; i++) {
      const dayGain = validWeights[i].w - validWeights[i - 1].w;
      if (dayGain >= CL_LIMITS.weightGainAlert) {
        alerts.push(`Weight jumped ${dayGain.toFixed(1)} lbs on ${validWeights[i].date} — possible fluid retention.`);
        break; // report once
      }
    }
  }

  // Edema alert
  const edemaDays = sorted.filter(({ log }) => log.edema === true).length;
  if (edemaDays >= 3) {
    alerts.push(`Edema reported on ${edemaDays} days — notify your transplant team.`);
  }

  // Shortness of breath
  const sobDays = sorted.filter(({ log }) => log.shortnessOfBreath === true).length;
  if (sobDays >= 2) {
    alerts.push(`Shortness of breath on ${sobDays} days — seek evaluation if worsening.`);
  }

  // Low fluid intake days
  const lowFluidDays = sorted.filter(({ log }) => log.fluidMl > 0 && log.fluidMl < CL_LIMITS.fluidGoal * 0.7).length;
  if (lowFluidDays >= 3) {
    alerts.push(`Fluid intake below goal on ${lowFluidDays} days — aim for ${CL_LIMITS.fluidGoal} mL/day.`);
  }

  return {
    weekStart,
    avgWeight: avg(weights),
    avgMood:   avg(moods),
    avgSleep:  avg(sleeps),
    avgStress: avg(stresses),
    avgEnergy: avg(energies),
    avgFluid:  avg(fluids),
    topSymptoms,
    doseAdherencePct,
    alerts,
  };
}

// Check if a combination of symptoms matches rejection warning pattern
export function checkRejectionRisk(
  log: DailyLog
): { level: 'none' | 'possible' | 'urgent'; message: string } {
  const amTemp = parseNum(log.amTemp);
  const pmTemp = parseNum(log.pmTemp);
  const hasFever =
    (amTemp !== null && amTemp > CL_LIMITS.feverWarning) ||
    (pmTemp !== null && pmTemp > CL_LIMITS.feverWarning);

  // Urgent: fever + (tenderness OR decreased urine)
  if (hasFever && (log.tenderness || log.urineDown)) {
    return {
      level: 'urgent',
      message: 'Fever combined with kidney tenderness or decreased urine output may indicate acute rejection. Contact your transplant team immediately or go to the ER.',
    };
  }

  // Possible: 2 or more of the soft rejection signs
  const softSigns: boolean[] = [
    log.nausea,
    log.swelling,
    log.edema,
    log.fatigue,
    log.tenderness,
  ];
  const softCount = softSigns.filter(Boolean).length;

  if (softCount >= 2) {
    return {
      level: 'possible',
      message: `Multiple symptoms that can be associated with rejection are present today (${softCount} signs). Monitor closely and contact your transplant team if symptoms worsen or persist.`,
    };
  }

  return {
    level: 'none',
    message: 'No rejection warning pattern detected today.',
  };
}
