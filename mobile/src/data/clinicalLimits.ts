export const CL_LIMITS = {
  // Weight
  weightGainAlert: 2.0,      // lbs gained in 1 day
  weightGain7dAlert: 5.0,    // lbs gained in 7 days
  weightLossAlert: -10.0,    // lbs lost in 30 days
  // Temperature (°F)
  feverWarning: 100.5,
  feverDanger: 101.5,
  // Blood pressure (mmHg)
  bpSysHigh: 160,
  bpSysLow: 100,
  bpDiaHigh: 100,
  bpDiaLow: 60,
  // Heart rate (bpm)
  hrHigh: 120,
  hrLow: 60,
  // Fluid
  fluidGoal: 2500,           // mL/day
  // Medication supply
  lowMedDays: 7,             // days before warning
  criticalMedDays: 14,       // days before warning for critical meds (tacrolimus)
  // Lab critical thresholds — action required immediately
  crCritical: 2.5,           // mg/dL — call team
  tacLow: 4.0,               // ng/mL — sub-therapeutic risk
  tacHigh: 20.0,             // ng/mL — toxicity risk
  kCritical: 6.0,            // mEq/L — dangerous hyperkalemia
  kLow: 3.0,                 // mEq/L — dangerous hypokalemia
  gluCritical: 300,          // mg/dL fasting — hyperglycemic crisis
  gfrCritical: 20,           // mL/min — critical kidney failure
};

// Lab reference ranges for transplant patients (general; personalized targets override)
export const LAB_R = {
  labCr:  { green: [0, 1.5],    yellow: [1.5, 2.5], danger: 2.5,  unit: 'mg/dL',  label: 'Creatinine' },
  labTac: { green: [5, 15],     yellow: [4, 5],     danger: 20,   unit: 'ng/mL',  label: 'Tacrolimus' },
  labGfr: { green: [60, 999],   yellow: [30, 60],   danger: 30,   unit: 'mL/min', label: 'GFR',         reverseAlert: true },
  labPhos:{ green: [2.5, 4.5],  yellow: [4.5, 5.5], danger: 5.5,  unit: 'mg/dL',  label: 'Phosphorus' },
  labK:   { green: [3.5, 5.0],  yellow: [5.0, 5.5], danger: 5.5,  unit: 'mEq/L',  label: 'Potassium' },
  labGlu: { green: [70, 140],   yellow: [140, 200],  danger: 200,  unit: 'mg/dL',  label: 'Glucose' },
  labAlt: { green: [0, 56],     yellow: [56, 120],  danger: 120,  unit: 'U/L',    label: 'ALT' },
  labAst: { green: [0, 40],     yellow: [40, 100],  danger: 100,  unit: 'U/L',    label: 'AST' },
  labMg:  { green: [1.7, 2.5],  yellow: [1.2, 1.7], danger: 1.2,  unit: 'mg/dL',  label: 'Magnesium' },
  labHgb: { green: [12, 18],    yellow: [10, 12],   danger: 10,   unit: 'g/dL',   label: 'Hemoglobin',  reverseAlert: true },
  labWbc: { green: [4.0, 11.0], yellow: [2.0, 4.0], danger: 2.0,  unit: 'K/µL',   label: 'WBC',         reverseAlert: true },
  labBun: { green: [7, 25],     yellow: [25, 40],   danger: 40,   unit: 'mg/dL',  label: 'BUN' },
} as const;

export type LabKey = keyof typeof LAB_R;
