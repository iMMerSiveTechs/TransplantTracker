export interface DailyLog {
  // Vitals (strings for flexible input, parsed to numbers for calculations)
  weight: string;
  amTemp: string;
  amSys: string;
  amDia: string;
  amHr: string;
  pmTemp: string;
  pmSys: string;
  pmDia: string;
  pmHr: string;
  fluidMl: number;
  // Symptoms
  incision: boolean;
  nausea: boolean;
  urineDown: boolean;
  burning: boolean;
  pain: number;         // 0–10
  acidReflux: boolean;
  gas: boolean;
  bloating: boolean;
  diarrhea: boolean;
  constipation: boolean;
  tenderness: boolean;
  swelling: boolean;
  edema: boolean;       // ankles/legs/face — fluid retention sign
  edemaLocation: string;
  fatigue: boolean;
  shortnessOfBreath: boolean;
  // Labs (string input so partial entry doesn't force 0; parsed for display/alerts)
  labCr: string;
  labTac: string;
  labGfr: string;
  labPhos: string;
  labK: string;
  labGlu: string;
  // Extended labs
  labAlt: string;       // liver enzyme
  labAst: string;       // liver enzyme
  labMg: string;        // magnesium
  labHgb: string;       // hemoglobin
  labWbc: string;       // white blood cell count
  labBun: string;       // blood urea nitrogen
  lastTacTime: number | null;
  // Wellbeing
  mood: number;           // 0=unset, 1–5
  sleepQuality: number;   // 0=unset, 1–5
  stressLevel: number;    // 0=unset, 1–5
  energyLevel: number;    // 0=unset, 1–5
  wellbeingNotes: string;
  // Diet flags (from food guide logging)
  dietHighK: boolean;
  dietHighPhos: boolean;
  dietHighNa: boolean;
  dietNotes: string;
}

export const EMPTY_LOG: DailyLog = {
  weight: "", amTemp: "", amSys: "", amDia: "", amHr: "",
  pmTemp: "", pmSys: "", pmDia: "", pmHr: "",
  fluidMl: 0,
  incision: false, nausea: false, urineDown: false, burning: false, pain: 0,
  acidReflux: false, gas: false, bloating: false, diarrhea: false, constipation: false,
  tenderness: false, swelling: false, edema: false, edemaLocation: "",
  fatigue: false, shortnessOfBreath: false,
  labCr: "", labTac: "", labGfr: "", labPhos: "", labK: "", labGlu: "",
  labAlt: "", labAst: "", labMg: "", labHgb: "", labWbc: "", labBun: "",
  lastTacTime: null,
  mood: 0, sleepQuality: 0, stressLevel: 0, energyLevel: 0, wellbeingNotes: "",
  dietHighK: false, dietHighPhos: false, dietHighNa: false, dietNotes: "",
};

// Medication adherence — stored at key `doses_YYYY-MM-DD`
export interface MedDose {
  medId: string;
  timestamp: number;
  missed?: boolean;    // explicitly logged as missed
  missedReason?: string;
}

// Lab file import scaffold — stored at key `lab_imports`
export interface LabImport {
  id: string;
  date: string;
  filename: string;
  uri: string;
  parsed: boolean;
  values?: Partial<Pick<DailyLog, 'labCr' | 'labTac' | 'labGfr' | 'labPhos' | 'labK' | 'labGlu' | 'labAlt' | 'labAst' | 'labMg' | 'labHgb' | 'labWbc' | 'labBun'>>;
}

export interface Contact {
  icon: string;
  label: string;
  sub: string;
  phone: string;
  urgent?: boolean;
}

// Personalized clinical targets (set from physician guidance)
export interface PersonalTargets {
  crTarget?: string;       // e.g. "<1.5"
  tacMin?: number;         // ng/mL
  tacMax?: number;         // ng/mL
  bpSysTarget?: number;   // mmHg systolic target
  bpDiaTarget?: number;   // mmHg diastolic target
  weightBaseline?: number; // lbs — "dry weight"
  fluidGoalMl?: number;   // personalized fluid goal
  glucoseMax?: number;     // mg/dL fasting glucose limit
  kMax?: number;           // mEq/L potassium limit
  phosMax?: number;        // mg/dL phosphorus limit
}

export interface Profile {
  name: string;
  type: string;
  surgDate: string; // ISO 8601 date string "YYYY-MM-DD"
  contacts: Contact[];
  emergPhone: string;
  // Extended profile
  physicianName?: string;
  centerName?: string;
  centerPhone?: string;
  donorType?: 'deceased' | 'living';
  bloodType?: string;
  transplantPhase?: 'early' | 'stable' | 'late'; // auto-computed but overridable
  personalTargets?: PersonalTargets;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doc: string;
  desc: string;
  type?: 'clinic' | 'lab' | 'biopsy' | 'imaging' | 'other';
  labBy?: string;
  location?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  prepInstructions?: string;
  isRecurring?: boolean;
  recurrenceWeeks?: number;
  clinicalNoteId?: string; // linked clinical note
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instr: string;
  inv: number;
  ppd: number;
  critical: boolean;
  color: string;
  isTac?: boolean;
  notifyEnabled?: boolean;
  reminderTime?: string;       // "HH:MM" 24-hour format
  criticalEscalation?: boolean; // send escalation alerts if dose not logged in time
  // Extended fields (all optional — non-destructive to existing data)
  genericName?: string;
  indication?: string;
  rxNumber?: string;
  refillsRemaining?: number;
  lastFilledDate?: string;     // "YYYY-MM-DD"
  refillByDate?: string;       // "YYYY-MM-DD"
  pharmacyName?: string;
  pharmacyPhone?: string;
  formularyTier?: number;      // 1–5
  copayAmount?: number;
  priorAuthStatus?: 'not_needed' | 'pending' | 'approved' | 'denied';
}

// Pharmacy — stored at key `pharmacies`
export interface Pharmacy {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  isPrimary?: boolean;
}

// Insurance plan — stored at key `insurance_plans`
export interface InsurancePlan {
  id: string;
  planName: string;
  payerName: string;
  memberId: string;
  groupNumber?: string;
  bin?: string;
  pcn?: string;
  rxGroup?: string;
  effectiveDate?: string;
  pbmName?: string;
  pbmPhone?: string;
  deductible?: string;
  oopMax?: string;
  isPrimary?: boolean;
  notes?: string;
}

// Rejection & complication tracking — stored at key `rejection_episodes`
export type RejectionType = 'acute' | 'chronic' | 'suspected' | 'borderline' | 'antibody_mediated';
export interface RejectionEpisode {
  id: string;
  date: string;          // "YYYY-MM-DD"
  type: RejectionType;
  biopsyGrade?: string;  // e.g. "Banff 1A"
  biopsyDate?: string;
  treatment?: string;    // e.g. "Pulse steroids 500mg × 3 days"
  resolved: boolean;
  resolvedDate?: string;
  notes: string;
  hospitalStay?: boolean;
  hospitalizationDays?: number;
}

// Complication events — stored at key `complication_events`
export type ComplicationType = 'infection' | 'rejection' | 'toxicity' | 'hospitalization' | 'procedure' | 'cancer_screening' | 'bone_health' | 'cardiovascular' | 'metabolic' | 'other';
export interface ComplicationEvent {
  id: string;
  date: string;
  type: ComplicationType;
  title: string;
  severity: 'mild' | 'moderate' | 'severe';
  outcome: string;
  resolved: boolean;
  notes: string;
}

// Vaccination record — stored at key `vaccination_records`
export type VaccineStatus = 'up_to_date' | 'due_soon' | 'overdue' | 'contraindicated' | 'not_applicable' | 'deferred';
export interface VaccinationRecord {
  id: string;
  vaccine: string;
  date?: string;           // "YYYY-MM-DD" — when received
  nextDue?: string;        // "YYYY-MM-DD" — when next dose due
  isLive: boolean;         // live vaccines are contraindicated
  status: VaccineStatus;
  administeredBy?: string;
  lotNumber?: string;
  notes?: string;
}

// Clinical notes — stored at key `clinical_notes`
export type ClinicalNoteType = 'appointment' | 'phone_call' | 'message' | 'instruction' | 'lab_result' | 'general';
export interface ClinicalNote {
  id: string;
  date: string;           // "YYYY-MM-DD"
  type: ClinicalNoteType;
  contact?: string;       // doctor/coordinator name
  title: string;
  note: string;
  actionRequired: boolean;
  followUpDate?: string;  // "YYYY-MM-DD"
  appointmentId?: string; // linked appointment
}

// Lab trend data point (computed, not stored)
export interface LabDataPoint {
  date: string;
  value: number;
}

export interface LabTrend {
  labKey: string;
  points: LabDataPoint[];
  latestValue: number | null;
  previousValue: number | null;
  direction: 'up' | 'down' | 'stable' | 'unknown';
  velocityPerWeek: number; // change per 7 days
  status: 'normal' | 'watch' | 'alert' | 'critical';
  interpretation: string;
  action?: string;
}
