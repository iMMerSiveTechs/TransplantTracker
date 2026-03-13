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
  amMeds: boolean;
  pmMeds: boolean;
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
  appetite: "poor" | "reduced" | "normal" | "good";
  tenderness: boolean;
  swelling: boolean;
  notes: string;
  labCr: string;
  labTac: string;
  labGfr: string;
  labPhos: string;
  labK: string;
  labGlu: string;
  lastTacTime: number | null;
}

export const EMPTY_LOG: DailyLog = {
  weight: "", amTemp: "", amSys: "", amDia: "", amHr: "",
  pmTemp: "", pmSys: "", pmDia: "", pmHr: "",
  amMeds: false, pmMeds: false, fluidMl: 0,
  incision: false, nausea: false, urineDown: false, burning: false, pain: 0,
  acidReflux: false, gas: false, bloating: false, diarrhea: false, constipation: false, appetite: "normal",
  tenderness: false, swelling: false,
  notes: "", labCr: "", labTac: "", labGfr: "", labPhos: "", labK: "", labGlu: "", lastTacTime: null,
};

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
  surgDate: Date;
  contacts: Contact[];
  emergPhone: string;
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
