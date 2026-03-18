// Hardcoded drug interaction rules sourced from FDA labeling and established
// clinical transplant guidelines. NEVER add rules without a cited source.
// Every alert must include what to do — not just what might happen.

export type InteractionSeverity = 'informational' | 'caution' | 'urgent_review' | 'call_care_team';

export interface InteractionRule {
  id: string;
  drugA: string[];        // lowercase name fragments that match med name
  drugB: string[];        // lowercase name fragments — the interacting substance
  drugBLabel: string;     // human-readable display name for drugB
  severity: InteractionSeverity;
  description: string;    // plain-English mechanism
  clinicalEffect: string; // what can go wrong
  whatToDo: string;       // clear action step
  source: string;
  lastVerified: string;   // "YYYY-MM"
}

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: 'tac-grapefruit',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf'],
    drugB: ['grapefruit'],
    drugBLabel: 'Grapefruit / Grapefruit Juice',
    severity: 'urgent_review',
    description: 'Grapefruit blocks the enzyme (CYP3A4) that breaks down tacrolimus, causing blood levels to rise unpredictably.',
    clinicalEffect: 'Risk of tacrolimus toxicity — which can damage your transplanted kidney and cause tremors, high blood pressure, or kidney failure.',
    whatToDo: 'Avoid grapefruit, grapefruit juice, and pomelo entirely. If you already consumed some, contact your transplant team to discuss a level check.',
    source: 'FDA labeling / DailyMed',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-starfruit',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf'],
    drugB: ['star fruit', 'starfruit', 'carambola'],
    drugBLabel: 'Star Fruit',
    severity: 'urgent_review',
    description: 'Star fruit contains oxalic acid and CYP3A4 inhibitors that can both raise tacrolimus levels and directly harm kidneys.',
    clinicalEffect: 'Risk of tacrolimus toxicity and acute kidney injury, especially in patients with reduced kidney function.',
    whatToDo: 'Do not eat star fruit. It is on the toxic list for transplant patients. Contact your team if you have consumed it.',
    source: 'Nephrology case reports / Clinical pharmacology literature',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-nsaids',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf'],
    drugB: ['ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'diclofenac', 'meloxicam', 'celecoxib', 'indomethacin', 'piroxicam', 'ketorolac'],
    drugBLabel: 'NSAIDs (Ibuprofen, Naproxen, etc.)',
    severity: 'call_care_team',
    description: 'NSAIDs reduce blood flow to the kidneys. Combined with tacrolimus — which is also hard on kidney blood vessels — the risk of kidney damage is much higher.',
    clinicalEffect: 'Nephrotoxicity: acute kidney injury, rising creatinine, reduced GFR, and potentially permanent kidney damage.',
    whatToDo: 'Do NOT take ibuprofen, naproxen, or any NSAID without your transplant team\'s explicit approval. Use acetaminophen (Tylenol) for pain relief instead.',
    source: 'FDA labeling / KDIGO transplant guidelines',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-stjohnswort',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf', 'cyclosporine', 'neoral', 'sandimmune'],
    drugB: ["st john's wort", 'st johns wort', 'hypericum', 'saint john'],
    drugBLabel: "St. John's Wort",
    severity: 'urgent_review',
    description: "St. John's Wort strongly induces CYP3A4, the enzyme that breaks down tacrolimus, causing blood levels to drop significantly.",
    clinicalEffect: 'Risk of acute rejection due to sub-therapeutic tacrolimus levels. Even small amounts can have significant effects.',
    whatToDo: "Stop taking St. John's Wort immediately and contact your transplant team. A tacrolimus level check is likely needed.",
    source: 'FDA labeling — carries Black Box Warning for immunosuppressant interactions',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-azoles',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf'],
    drugB: ['fluconazole', 'diflucan', 'voriconazole', 'vfend', 'ketoconazole', 'itraconazole', 'sporanox', 'posaconazole', 'clotrimazole'],
    drugBLabel: 'Azole Antifungals (Fluconazole, Voriconazole, etc.)',
    severity: 'call_care_team',
    description: 'Azole antifungals are potent CYP3A4 inhibitors and dramatically raise tacrolimus blood levels.',
    clinicalEffect: 'Tacrolimus toxicity: nephrotoxicity, neurotoxicity (tremors, confusion), hypertension. A 2–4× increase in levels is common.',
    whatToDo: 'Notify your transplant team before starting any antifungal. Your tacrolimus dose will need to be reduced and levels monitored closely.',
    source: 'FDA labeling / Multiple published pharmacokinetic studies',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-macrolides',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf'],
    drugB: ['clarithromycin', 'biaxin', 'erythromycin', 'azithromycin', 'zithromax', 'z-pack'],
    drugBLabel: 'Macrolide Antibiotics (Clarithromycin, Erythromycin, Azithromycin)',
    severity: 'call_care_team',
    description: 'Clarithromycin and erythromycin are strong CYP3A4 inhibitors that raise tacrolimus levels. Azithromycin has a weaker but still relevant effect.',
    clinicalEffect: 'Elevated tacrolimus levels with risk of toxicity. Clarithromycin can cause 3–5× increases.',
    whatToDo: 'Tell your prescriber you are on tacrolimus before any antibiotic is prescribed. If already started, contact your transplant team about a dose adjustment and level check.',
    source: 'FDA labeling / Clinical drug interaction studies',
    lastVerified: '2025-01',
  },
  {
    id: 'tac-diltiazem',
    drugA: ['tacrolimus', 'prograf', 'envarsus', 'astagraf', 'cyclosporine'],
    drugB: ['diltiazem', 'cardizem', 'verapamil', 'calan', 'isoptin'],
    drugBLabel: 'Non-Dihydropyridine Calcium Channel Blockers (Diltiazem, Verapamil)',
    severity: 'caution',
    description: 'Diltiazem and verapamil inhibit CYP3A4 and P-glycoprotein, increasing tacrolimus exposure. Amlodipine has minimal effect by comparison.',
    clinicalEffect: 'Moderate elevation in tacrolimus levels. May require dose adjustment when starting or stopping these medications.',
    whatToDo: 'Inform your transplant team if you start or stop diltiazem or verapamil. More frequent tacrolimus level monitoring may be needed.',
    source: 'FDA labeling / Transplant pharmacology literature',
    lastVerified: '2025-01',
  },
  {
    id: 'mmf-antacids',
    drugA: ['mycophenolate', 'cellcept', 'myfortic'],
    drugB: ['antacid', 'calcium carbonate', 'tums', 'magnesium hydroxide', 'maalox', 'mylanta', 'aluminum hydroxide'],
    drugBLabel: 'Antacids (Tums, Maalox, etc.)',
    severity: 'caution',
    description: 'Antacids containing magnesium or aluminum can bind to mycophenolate in the gut, reducing how much is absorbed.',
    clinicalEffect: 'Reduced mycophenolate levels, which could lower immune suppression — potentially increasing rejection risk.',
    whatToDo: 'Separate antacid doses from mycophenolate by at least 2 hours. Use acid reducers (proton pump inhibitors) if needed — they do not interact the same way.',
    source: 'FDA labeling for CellCept / Myfortic',
    lastVerified: '2025-01',
  },
  {
    id: 'mmf-cholestyramine',
    drugA: ['mycophenolate', 'cellcept', 'myfortic'],
    drugB: ['cholestyramine', 'questran', 'colestipol', 'colestid', 'colesevelam', 'welchol'],
    drugBLabel: 'Bile Acid Sequestrants (Cholestyramine, Colestipol)',
    severity: 'caution',
    description: 'Bile acid sequestrants interfere with the enterohepatic recirculation of mycophenolate, significantly lowering its blood levels.',
    clinicalEffect: 'Potentially subtherapeutic mycophenolate levels, increasing the risk of rejection.',
    whatToDo: 'Avoid combining these drugs if possible. If required, take mycophenolate at least 4 hours before or after the sequestrant, and discuss with your transplant team.',
    source: 'FDA labeling for CellCept',
    lastVerified: '2025-01',
  },
  {
    id: 'pred-nsaids',
    drugA: ['prednisone', 'prednisolone', 'methylprednisolone', 'medrol'],
    drugB: ['ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'diclofenac', 'meloxicam', 'aspirin'],
    drugBLabel: 'NSAIDs (Ibuprofen, Naproxen, etc.)',
    severity: 'caution',
    description: 'Corticosteroids already irritate the stomach lining. Adding NSAIDs significantly increases the risk of GI bleeding and ulcers.',
    clinicalEffect: 'Increased risk of stomach ulcers, GI bleeding, and peptic ulcer disease.',
    whatToDo: 'Use acetaminophen (Tylenol) for pain instead. If an NSAID is needed for a specific reason, discuss with your doctor — a stomach protectant (PPI) may also be needed.',
    source: 'Clinical pharmacology — established interaction class effect',
    lastVerified: '2025-01',
  },
  {
    id: 'pred-diabetes',
    drugA: ['prednisone', 'prednisolone', 'methylprednisolone', 'medrol'],
    drugB: ['metformin', 'insulin', 'glipizide', 'glyburide', 'glimepiride', 'sitagliptin', 'januvia', 'empagliflozin', 'jardiance'],
    drugBLabel: 'Diabetes Medications',
    severity: 'informational',
    description: 'Corticosteroids raise blood sugar by reducing insulin sensitivity and increasing glucose production in the liver.',
    clinicalEffect: 'Elevated blood glucose levels, which may require adjustments to diabetes medications. Post-transplant diabetes (PTDM) is common in steroid-treated patients.',
    whatToDo: 'Monitor blood sugar more frequently when prednisone dose changes. Your diabetes medications may need adjustment. Inform your endocrinologist you are on prednisone.',
    source: 'KDIGO transplant guidelines / ADA standards of care',
    lastVerified: '2025-01',
  },
  {
    id: 'immuno-livevaccines',
    drugA: ['tacrolimus', 'prograf', 'mycophenolate', 'cellcept', 'prednisone', 'prednisolone', 'azathioprine', 'imuran'],
    drugB: ['mmr vaccine', 'live vaccine', 'varicella vaccine', 'shingrix', 'zostavax', 'yellow fever vaccine', 'nasal flu vaccine', 'flumist', 'typhoid oral', 'bcg'],
    drugBLabel: 'Live Vaccines (MMR, Varicella, Yellow Fever, etc.)',
    severity: 'urgent_review',
    description: 'Immunosuppressants prevent your immune system from fighting infections, including live vaccine strains, which can cause serious illness.',
    clinicalEffect: 'Vaccine-strain infection from live viruses. This can be severe or life-threatening in immunocompromised patients.',
    whatToDo: 'Do NOT receive live vaccines while on immunosuppressants without explicit approval from your transplant team. Inactivated vaccines (flu shot, Shingrix, pneumococcal) are generally safe — ask your team.',
    source: 'ACIP guidelines / KDIGO transplant immunization guidelines',
    lastVerified: '2025-01',
  },
];
