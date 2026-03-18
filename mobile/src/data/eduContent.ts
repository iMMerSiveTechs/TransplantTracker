// Educational content for in-app help tooltips.
// Keyed by metric/feature name. Plain language, written for patients.

export interface EduItem {
  title: string;
  body: string;
  whenToCall?: string;
  learnMore?: string;
}

export const EDU: Record<string, EduItem> = {
  // Lab values
  labCr: {
    title: 'Creatinine',
    body: 'Creatinine measures how well your transplanted kidney filters waste from the blood. A rising number can be an early sign of rejection or dehydration.',
    whenToCall: 'Call your team if creatinine rises 0.3 mg/dL or more in a week, or is above 2.0 mg/dL.',
    learnMore: 'Normal range after transplant is typically 0.8–1.5 mg/dL depending on your size and baseline.',
  },
  labTac: {
    title: 'Tacrolimus Level',
    body: 'This blood test shows whether your anti-rejection drug (tacrolimus/Prograf) is at the right level in your blood. Too low risks rejection. Too high can damage the kidney and cause side effects.',
    whenToCall: 'Call if level is below 4 or above 20 ng/mL.',
    learnMore: 'Levels are usually checked as a "trough" — drawn right before your morning dose.',
  },
  labGfr: {
    title: 'GFR (Kidney Filtration Rate)',
    body: 'GFR (glomerular filtration rate) measures how efficiently your transplanted kidney is filtering blood. Higher is better. A declining GFR over months may indicate chronic rejection.',
    whenToCall: 'Contact your team if GFR drops below 30, or falls 10+ points in one month.',
    learnMore: 'A GFR above 60 is generally considered good function. Below 30 is concerning.',
  },
  labK: {
    title: 'Potassium',
    body: 'Potassium is an important electrolyte. Tacrolimus can raise potassium levels. Too much (hyperkalemia) can affect your heart rhythm.',
    whenToCall: 'Call immediately if potassium is above 6.0 mEq/L or you have muscle weakness or irregular heartbeat.',
    learnMore: 'Limit high-potassium foods (bananas, potatoes, oranges) if your levels are elevated.',
  },
  labPhos: {
    title: 'Phosphorus',
    body: 'Phosphorus levels can rise after transplant. High phosphorus long-term weakens bones and stresses the graft.',
    whenToCall: 'Notify your team if phosphorus is consistently above 4.5 mg/dL.',
    learnMore: 'Reduce phosphorus by limiting dairy, processed foods, and colas.',
  },
  labGlu: {
    title: 'Blood Glucose',
    body: 'Prednisone and tacrolimus both raise blood sugar. Post-transplant diabetes (PTDM) occurs in up to 40% of patients.',
    whenToCall: 'Call if fasting glucose is consistently above 200 mg/dL, or you have extreme thirst and frequent urination.',
    learnMore: 'Check glucose regularly, especially when prednisone doses change.',
  },
  labAlt: {
    title: 'ALT (Liver Enzyme)',
    body: 'ALT is a marker of liver health. Even kidney transplant patients are monitored because immunosuppressants can affect the liver.',
    whenToCall: 'Elevated ALT above 120 U/L should be discussed at your next appointment.',
  },
  labMg: {
    title: 'Magnesium',
    body: 'Tacrolimus can lower magnesium levels. Low magnesium causes muscle cramps, tremors, and can worsen other electrolyte issues.',
    whenToCall: 'Mention low magnesium (below 1.5 mg/dL) at your next visit. Your team may add a supplement.',
  },
  labHgb: {
    title: 'Hemoglobin',
    body: 'Hemoglobin measures red blood cells. Anemia (low hemoglobin) is common after transplant due to immunosuppressants and reduced erythropoietin.',
    whenToCall: 'Notify your team if hemoglobin falls below 10 g/dL or you feel unusually tired or short of breath.',
  },
  // Vitals
  weight: {
    title: 'Daily Weight',
    body: 'Weighing yourself at the same time every morning (after using the restroom, before breakfast) catches fluid retention early. A gain of 2+ lbs in one day can signal your kidneys are retaining fluid.',
    whenToCall: 'Call your team if you gain 2+ lbs overnight or 5+ lbs in a week.',
  },
  amTemp: {
    title: 'Body Temperature',
    body: 'Fever is a key warning sign after transplant. Because immunosuppressants suppress your immune system, infections can be serious. Even a low-grade fever warrants attention.',
    whenToCall: 'Call your team for any temperature at or above 100.5°F (38°C). Go to the ER for temperatures above 103°F.',
  },
  amSys: {
    title: 'Blood Pressure',
    body: 'High blood pressure is extremely common after transplant (70%+ of patients) and is the leading cause of graft loss long-term. Monitor it daily and take your BP medications consistently.',
    whenToCall: 'Call if systolic is consistently above 160 mmHg or below 100 mmHg. Go to the ER if above 180/120.',
  },
  amHr: {
    title: 'Heart Rate',
    body: 'Your resting heart rate should be between 60–100 bpm. Tacrolimus, beta-blockers, and other medications can affect heart rate.',
    whenToCall: 'Call if resting heart rate is consistently above 120 or below 50 bpm.',
  },
  fluidMl: {
    title: 'Fluid Intake',
    body: 'Staying well hydrated protects your transplanted kidney. Most transplant patients are advised to drink 2,500–3,000 mL (about 10–12 cups) per day unless told otherwise.',
    whenToCall: 'Talk to your team if you are unable to maintain adequate hydration due to nausea or illness.',
  },
  pain: {
    title: 'Pain Level',
    body: 'Rate your overall pain on a 0–10 scale. Note any pain near your transplant site (lower abdomen for kidney) — this can be an early rejection sign.',
    whenToCall: 'Call immediately for new pain at the transplant site, especially with fever or swelling.',
  },
  tacrolimus: {
    title: 'Tacrolimus (Prograf)',
    body: 'Tacrolimus is your most important anti-rejection medication. It must be taken at the same time every day — even being a few hours late can affect blood levels. Never stop or skip doses without calling your team.',
    whenToCall: 'Call your team if you miss a dose or are unsure whether you took it.',
  },
  rejection: {
    title: 'Rejection Warning Signs',
    body: 'Early rejection often has no symptoms. When symptoms appear they may include: fever, tenderness near the transplant site, swelling, reduced urine output, or rising creatinine.',
    whenToCall: 'Call your transplant coordinator immediately if you have fever + decreased urine + tenderness at the graft site.',
  },
  // Features
  interactionChecker: {
    title: 'Drug Interaction Checker',
    body: 'This checks your medications against a database of known interactions. Results are based on published FDA labeling and clinical guidelines — not AI guesswork. Always discuss with your pharmacist before starting any new drug, supplement, or herbal product.',
  },
  foodGuide: {
    title: 'Food Safety Guide',
    body: 'Transplant patients need to avoid certain foods because of drug interactions (grapefruit with tacrolimus) or infection risk (raw/undercooked foods). Use this guide to quickly check any food.',
  },
};
