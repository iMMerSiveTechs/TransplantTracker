export interface DailyLog {
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
  incision: boolean;
  nausea: boolean;
  urineDown: boolean;
  burning: boolean;
  pain: number;
  acidReflux: boolean;
  gas: boolean;
  bloating: boolean;
  diarrhea: boolean;
  constipation: boolean;
  tenderness: boolean;
  swelling: boolean;
  labCr: string;
  labTac: string;
  labGfr: string;
  labPhos: string;
  labK: string;
  labGlu: string;
  lastTacTime: number | null;
  // Wellbeing
  mood: number;           // 0=unset, 1-5 scale
  sleepQuality: number;   // 0=unset, 1-5 scale
  stressLevel: number;    // 0=unset, 1-5 scale
  wellbeingNotes: string;
}

export const EMPTY_LOG: DailyLog = {
  weight: "", amTemp: "", amSys: "", amDia: "", amHr: "",
  pmTemp: "", pmSys: "", pmDia: "", pmHr: "",
  fluidMl: 0,
  incision: false, nausea: false, urineDown: false, burning: false, pain: 0,
  acidReflux: false, gas: false, bloating: false, diarrhea: false, constipation: false,
  tenderness: false, swelling: false,
  labCr: "", labTac: "", labGfr: "", labPhos: "", labK: "", labGlu: "", lastTacTime: null,
  mood: 0, sleepQuality: 0, stressLevel: 0, wellbeingNotes: "",
};

// Medication adherence — stored at key `doses_YYYY-MM-DD`
export interface MedDose {
  medId: string;
  timestamp: number;
}

// Lab file import scaffold — stored at key `lab_imports`
export interface LabImport {
  id: string;
  date: string;
  filename: string;
  uri: string;
  parsed: boolean;
  values?: Partial<Pick<DailyLog, 'labCr' | 'labTac' | 'labGfr' | 'labPhos' | 'labK' | 'labGlu'>>;
}

export interface Contact {
  icon: string;
  label: string;
  sub: string;
  phone: string;
  urgent?: boolean;
}

export interface Profile {
  name: string;
  type: string;
  surgDate: string; // ISO 8601 date string "YYYY-MM-DD"
  contacts: Contact[];
  emergPhone: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doc: string;
  desc: string;
  type?: string;
  labBy?: string;
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
  reminderTime?: string; // "HH:MM" 24-hour format
  // Extended fields (all optional — non-destructive to existing data)
  genericName?: string;
  indication?: string;      // "Prevents organ rejection"
  rxNumber?: string;
  refillsRemaining?: number;
  lastFilledDate?: string;  // "YYYY-MM-DD"
  refillByDate?: string;    // "YYYY-MM-DD"
  pharmacyName?: string;
  pharmacyPhone?: string;
  formularyTier?: number;   // 1–5
  copayAmount?: number;     // dollars per fill
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
