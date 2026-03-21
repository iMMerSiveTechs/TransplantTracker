import { useState, useMemo, useEffect, useRef } from “react”;

// ═══════════════════════════════════════════════════════════
// TRANSPLANT TRACKER v7 — Template Edition
// All personal data user-entered via onboarding flow
// No hardcoded PHI. Multi-user ready.
// Clinical rules engine, 78-food renal DB, lab scheduler
// ═══════════════════════════════════════════════════════════

// PROFILE is now loaded from storage, set during onboarding
// Surgery date is set during onboarding

const SURG_DEFAULT = new Date(2026, 1, 9, 12, 0, 0); // fallback only

// ─── Centralized Clinical Limits ────────────────────────
const CL_LIMITS = {
weightGainAlert: 2.0,
feverDanger: 101.5,
feverWarning: 100.5,
bpSysHigh: 160,
hrHigh: 120,
bpSysLow: 100,
hrLow: 60,
fluidGoal: 2500,
lowMedDays: 7,
};
const fmt = (d, o) => new Date(d).toLocaleDateString(“en-US”, o);
const fmtDate = d => fmt(d, { weekday: “long”, month: “long”, day: “numeric” });
const fmtShort = d => fmt(d, { month: “short”, day: “numeric” });
const fmtWd = d => fmt(d, { weekday: “short” });
const parseLocalDay = (s) => new Date(typeof s === “string” && !s.includes(“T”) ? `${s}T12:00:00` : s);
const toId = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const dBt = (a, b) => Math.floor((new Date(b) - new Date(a)) / 864e5);
const wBt = (a, b) => Math.floor(dBt(a, b) / 7);
const addD = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const cl = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function greet(n) { const h = new Date().getHours(); return h < 12 ? `Good morning, ${n}` : h < 17 ? `Good afternoon, ${n}` : h < 21 ? `Good evening, ${n}` : `Rest well, ${n}`; }

// ─── Lab Schedule (from 2026 color-coded calendar) ──────
const PINK_DATES = new Set([
“2026-02-16”,“2026-03-16”,“2026-04-13”,“2026-05-11”,“2026-06-15”,
“2026-07-13”,“2026-08-10”,“2026-09-14”,“2026-10-12”,“2026-11-16”,“2026-12-14”
]);
const GREEN_DATES = new Set([“2026-03-16”]);

function getLabType(d) {
const id = toId(d);
const pink = PINK_DATES.has(id), green = GREEN_DATES.has(id);
if (pink && green) return “pink-green”;
if (pink) return “pink”;
if (green) return “green”;
const day = new Date(d).getDay();
if (day === 1 || day === 4) return “yellow”;
return null;
}

function nxLab() { let d = addD(new Date(), 1); while (!getLabType(d)) d = addD(d, 1); return d; }
function fastTn() { return !!getLabType(addD(new Date(), 1)); }

const LAB_TESTS = {
yellow: [“CBC, Diff, Plt count”, “Basic Metabolic Panel (BMP)”, “Phosphorus”, “Tacrolimus FK506”],
pink: [“CBC, Diff, Plt count”, “Comprehensive Metabolic Panel (CMP)”, “Urinalysis C+S, if indicated”, “Tacrolimus FK506”, “BK Virus DNA, Blood (PCR quant)”, “BK Virus DNA, Urine (PCR quant)”],
green: [“HIV RNA Quant PCR”, “Hepatitis B Virus DNA, Real-Time PCR”, “HCV RNA PCR Quant”],
};

const LAB_CODES = {
yellow: { “CBC, Diff, Plt count”: “005009”, “Basic Metabolic Panel (BMP)”: “322758”, “Phosphorus”: “001024”, “Tacrolimus FK506”: “700248” },
pink: { “CBC, Diff, Plt count”: “5009”, “Comprehensive Metabolic Panel (CMP)”: “322000”, “Urinalysis C+S, if indicated”: “8847”, “Tacrolimus FK506”: “700248”, “BK Virus DNA, Blood (PCR quant)”: “138962”, “BK Virus DNA, Urine (PCR quant)”: “138880” },
green: { “HIV RNA Quant PCR”: “550920”, “Hepatitis B Virus DNA, Real-Time PCR”: “551620”, “HCV RNA PCR Quant”: “550100” },
};

const EMPTY = {
weight: “”, amTemp: “”, amSys: “”, amDia: “”, amHr: “”,
pmTemp: “”, pmSys: “”, pmDia: “”, pmHr: “”,
amMeds: false, pmMeds: false, fluidMl: 0,
incision: false, nausea: false, urineDown: false, burning: false, pain: 0,
acidReflux: false, gas: false, bloating: false, diarrhea: false, constipation: false, appetite: “normal”,
tenderness: false, swelling: false,
notes: “”, labCr: “”, labTac: “”, labGfr: “”, labPhos: “”, labK: “”, labGlu: “”, lastTacTime: null,
};

// Storage
const S = {
async get(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch (e) { console.error(e); } },
async del(k) { try { await window.storage.delete(k); } catch {} },
};

// ─── Template Data (universal, not patient-specific) ────
const TRANSPLANT_TYPES = [“Kidney”, “Pancreas”, “Kidney & Pancreas”, “Liver”, “Heart”, “Lung”, “Other”];

const RESTS = [
{ id: “r1”, t: “Keep bladder empty”, d: “Day and night”, w: 2, i: “🚻” },
{ id: “r2”, t: “No driving”, d: “Avoid completely”, w: 3, i: “🚗” },
{ id: “r3”, t: “No BLTs”, d: “No bending, lifting >10lbs, twisting”, w: 8, i: “🏋️” },
{ id: “r4”, t: “No strenuous activity”, d: “Wait until healed”, w: 8, i: “🏃” },
{ id: “r5”, t: “No restaurants / takeout”, d: “No fast food, food trucks”, w: 13, i: “🍔” },
{ id: “r6”, t: “Avoid crowds”, d: “No public transit, gatherings”, w: 13, i: “👥” },
{ id: “r7”, t: “No vaccines”, d: “Including COVID boosters”, w: 13, i: “💉” },
{ id: “r8”, t: “No alcohol”, d: “Then occasional, moderate”, w: 26, i: “🍷” },
{ id: “r9”, t: “No gardening”, d: “Mask + gloves after 6mo”, w: 26, i: “🌱” },
{ id: “r10”, t: “Wait for dental work”, d: “Antibiotics required”, w: 26, i: “🦷” },
];

const INIT_MEDS = [
{ id: “m1”, name: “Tacrolimus (Prograf)”, dosage: “Per doctor”, instr: “Take 12 hours apart exactly”, inv: 60, ppd: 2, critical: true, color: “#6366F1”, isTac: true },
{ id: “m2”, name: “Mycophenolate (CellCept)”, dosage: “Per doctor”, instr: “Take with food”, inv: 60, ppd: 2, critical: true, color: “#059669” },
{ id: “m3”, name: “Prednisone”, dosage: “Per doctor”, instr: “Morning with food”, inv: 30, ppd: 1, critical: true, color: “#D97706” },
];

const LAB_R = {
cr: { label: “Creatinine”, unit: “mg/dL”, green: [0.7, 1.3], yellow: [1.3, 2.0], note: “Target: 0.7-1.3” },
tac: { label: “Tacrolimus”, unit: “ng/mL”, green: [5, 15], yellow: [3, 5], note: “Target: 5-15” },
gfr: { label: “GFR”, unit: “mL/min”, green: [60, 999], yellow: [30, 60], note: “Target: >60” },
phos: { label: “Phosphorus”, unit: “mg/dL”, green: [2.5, 4.5], yellow: [4.5, 5.5], note: “Target: 2.5-4.5” },
k: { label: “Potassium”, unit: “mEq/L”, green: [3.5, 5.0], yellow: [5.0, 5.5], note: “Target: 3.5-5.0” },
glu: { label: “Glucose”, unit: “mg/dL”, green: [70, 140], yellow: [140, 200], note: “Target: 70-140” },
};

function labClr(key, val) {
if (!val || isNaN(parseFloat(val))) return “muted”;
const v = parseFloat(val), r = LAB_R[key];
if (v >= r.green[0] && v <= r.green[1]) return “success”;
if (key === “gfr”) return v >= r.yellow[0] ? “warning” : “danger”;
return v >= r.yellow[0] && v <= r.yellow[1] ? “warning” : “danger”;
}

// ─── Food Database with K+/Phos/Na+ Renal Layer ────────
// k=potassium, p=phosphorus, s=sodium (all boolean: true=high)
// cat=category for grouped browsing
const FOODS = [
// ── TOXIC (Drug Interactions — NEVER eat) ──
{ name: “Grapefruit”, al: [“grapefruit juice”, “ruby red”, “pink grapefruit”], st: “toxic”, note: “Interferes with Prograf. Prohibited in ALL forms.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Star Fruit”, al: [“starfruit”, “carambola”], st: “toxic”, note: “Neurotoxic for kidney patients.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Pomegranate”, al: [“pom juice”, “pomegranate seeds”], st: “toxic”, note: “Interferes with medication metabolism.”, cat: “Fruit”, k: true, p: false, s: false },
{ name: “Pomelo”, al: [“chinese grapefruit”, “shaddock”], st: “toxic”, note: “Same family as grapefruit.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Squirt Soda”, al: [“squirt”], st: “toxic”, note: “Contains grapefruit extract.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Fresca”, al: [“fresca soda”], st: “toxic”, note: “Contains grapefruit flavoring.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Seville Orange”, al: [“bitter orange”, “marmalade”, “orange marmalade”], st: “toxic”, note: “Same CYP3A4 compounds as grapefruit.”, cat: “Fruit”, k: false, p: false, s: false },
// ── AVOID (Food Safety — Immunocompromised) ──
{ name: “Sushi / Raw Fish”, al: [“sashimi”, “poke”, “ceviche”, “raw tuna”, “raw salmon”, “oysters”], st: “avoid”, note: “All fish must be cooked to 145°F.”, cat: “Protein”, k: false, p: false, s: false },
{ name: “Rare Steak”, al: [“pink meat”, “medium rare”, “tartare”, “steak tartare”, “carpaccio”], st: “avoid”, note: “No pink. Must reach 145°F + 3 min rest.”, cat: “Protein”, k: false, p: false, s: false },
{ name: “Raw Eggs”, al: [“runny eggs”, “soft boiled”, “poached”, “over easy”, “eggnog”, “cookie dough”], st: “avoid”, note: “Yolks and whites must be firm.”, cat: “Protein”, k: false, p: false, s: false },
{ name: “Brie / Soft Cheese”, al: [“camembert”, “brie”, “triple cream”, “queso fresco”, “feta”], st: “avoid”, note: “No soft, mold-ripened or unpasteurized cheeses.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Blue Cheese”, al: [“roquefort”, “gorgonzola”, “stilton”], st: “avoid”, note: “All moldy cheeses prohibited.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Raw Honey”, al: [“honeycomb”, “unfiltered honey”, “manuka raw”], st: “avoid”, note: “Only commercial/heat-treated honey.”, cat: “Other”, k: false, p: false, s: false },
{ name: “Bean Sprouts”, al: [“alfalfa sprouts”, “mung bean sprouts”, “raw sprouts”, “broccoli sprouts”], st: “avoid”, note: “All raw sprouts prohibited.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Unpasteurized Milk”, al: [“raw milk”, “raw cheese”], st: “avoid”, note: “All dairy must be pasteurized.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Fast Food / Restaurants”, al: [“takeout”, “restaurant”, “food truck”, “uber eats”, “doordash”], st: “avoid”, note: “No restaurants for 3 months post-transplant.”, cat: “Other”, k: false, p: false, s: true },
{ name: “Well Water”, al: [“spring water”, “untreated water”], st: “avoid”, note: “No well water. Tap and bottled fine.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Salad Bar / Buffet”, al: [“buffet”, “potluck”, “catered”, “salad bar”], st: “avoid”, note: “No shared-service food.”, cat: “Other”, k: false, p: false, s: false },
// ── COOK_TEMP (Thermometer Required) ──
{ name: “Chicken / Poultry”, al: [“chicken”, “turkey”, “duck”, “chicken breast”, “thigh”, “wing”], st: “cook_temp”, note: “No pink anywhere. Use thermometer.”, temp: “165°F (74°C)”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Ground Beef”, al: [“hamburger”, “meatloaf”, “meatballs”, “ground turkey”], st: “cook_temp”, note: “No pink center.”, temp: “160°F (71°C)”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Steaks / Beef Cuts”, al: [“steak”, “ribeye”, “sirloin”, “roast beef”, “tri-tip”, “filet”], st: “cook_temp”, note: “Rest 3 min after cooking.”, temp: “145°F + 3 min”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Pork”, al: [“pork chop”, “pork loin”, “pulled pork”, “pork tenderloin”, “pork belly”], st: “cook_temp”, note: “Cook to 145°F + 3 min rest.”, temp: “145°F + 3 min”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Lamb”, al: [“lamb chop”, “lamb shank”, “rack of lamb”], st: “cook_temp”, note: “Cook to 145°F + 3 min rest.”, temp: “145°F + 3 min”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Fish / Seafood”, al: [“salmon”, “cod”, “tilapia”, “shrimp”, “lobster”, “crab”, “halibut”, “trout”, “catfish”], st: “cook_temp”, note: “Cook until opaque and flaky.”, temp: “145°F (63°C)”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Eggs (Cooked)”, al: [“scrambled”, “hard boiled”, “omelet”, “fried egg”, “frittata”], st: “cook_temp”, note: “Yolks AND whites must be firm.”, temp: “160°F (71°C)”, cat: “Protein”, k: false, p: true, s: false },
{ name: “Leftovers”, al: [“leftover”, “reheat”, “meal prep”, “microwave”], st: “cook_temp”, note: “Max 2 days in fridge. Reheat until steaming.”, temp: “165°F (74°C)”, cat: “Other”, k: false, p: false, s: false },
{ name: “Deli Meat / Hot Dogs”, al: [“cold cuts”, “hot dog”, “bologna”, “salami”, “pepperoni”, “lunch meat”], st: “cook_temp”, note: “Listeria risk. Heat until steaming.”, temp: “165°F steaming”, cat: “Protein”, k: false, p: true, s: true },
// ── CAUTION (Renal / Electrolyte Risks) ──
{ name: “Bananas”, al: [“banana”, “banana bread”, “banana smoothie”], st: “caution”, note: “High potassium. Limit to half/day if K+ restricted.”, cat: “Fruit”, k: true, p: false, s: false },
{ name: “Oranges / OJ”, al: [“orange”, “orange juice”, “tangerine”, “clementine”, “mandarin”], st: “caution”, note: “High potassium. Monitor intake.”, cat: “Fruit”, k: true, p: false, s: false },
{ name: “Potatoes”, al: [“potato”, “baked potato”, “sweet potato”, “french fries”, “hash brown”, “mashed potato”, “tater tot”], st: “caution”, note: “Very high K+. Double-boil or soak 2+ hrs to leach potassium.”, cat: “Vegetable”, k: true, p: false, s: false },
{ name: “Tomatoes / Sauce”, al: [“tomato”, “marinara”, “salsa”, “tomato sauce”, “pizza sauce”, “ketchup”], st: “caution”, note: “High potassium. Limit portions.”, cat: “Vegetable”, k: true, p: false, s: false },
{ name: “Avocado”, al: [“guacamole”, “avocado toast”], st: “caution”, note: “Very high potassium.”, cat: “Fruit”, k: true, p: false, s: false },
{ name: “Spinach / Dark Greens”, al: [“spinach”, “kale”, “swiss chard”, “collard greens”, “beet greens”], st: “caution”, note: “High K+ and phosphorus. Cook to reduce.”, cat: “Vegetable”, k: true, p: true, s: false },
{ name: “Beans / Lentils”, al: [“kidney beans”, “black beans”, “chickpeas”, “lentils”, “pinto beans”, “hummus”, “refried beans”], st: “caution”, note: “High K+ and phosphorus. Soak overnight, discard water.”, cat: “Protein”, k: true, p: true, s: false },
{ name: “Chocolate / Cocoa”, al: [“chocolate”, “cocoa”, “hot chocolate”, “brownie”, “chocolate cake”, “nutella”], st: “caution”, note: “High K+ and phosphorus. Small amounts only.”, cat: “Other”, k: true, p: true, s: false },
{ name: “Cola / Dark Sodas”, al: [“coca cola”, “coke”, “pepsi”, “dr pepper”, “root beer”], st: “caution”, note: “Phosphoric acid additives. Limit or avoid.”, cat: “Beverage”, k: false, p: true, s: false },
{ name: “Dried Fruit”, al: [“raisins”, “dates”, “prunes”, “dried apricots”, “dried mango”, “trail mix”], st: “caution”, note: “Very concentrated potassium.”, cat: “Fruit”, k: true, p: false, s: false },
{ name: “Nuts / Seeds”, al: [“almonds”, “cashews”, “walnuts”, “peanuts”, “sunflower seeds”, “pistachios”], st: “caution”, note: “High phosphorus. Small handful max.”, cat: “Other”, k: false, p: true, s: false },
{ name: “Bacon / Ham / Sausage”, al: [“bacon”, “ham”, “sausage”, “prosciutto”, “chorizo”, “bratwurst”], st: “caution”, note: “High sodium and phosphorus additives.”, cat: “Protein”, k: false, p: true, s: true },
{ name: “Pickles / Olives”, al: [“pickle”, “olive”, “sauerkraut”, “kimchi”, “fermented”], st: “caution”, note: “Very high sodium.”, cat: “Other”, k: false, p: false, s: true },
{ name: “Canned Soup / Broth”, al: [“canned soup”, “bouillon”, “broth”, “ramen seasoning”], st: “caution”, note: “Extremely high sodium. Use low-sodium versions.”, cat: “Other”, k: false, p: false, s: true },
{ name: “Soy Sauce / Fish Sauce”, al: [“soy sauce”, “tamari”, “fish sauce”, “teriyaki”], st: “caution”, note: “Extremely high sodium. Use sparingly.”, cat: “Other”, k: false, p: false, s: true },
{ name: “Frozen Meals / TV Dinners”, al: [“frozen dinner”, “lean cuisine”, “hungry man”, “frozen pizza”], st: “caution”, note: “Usually very high sodium and phosphorus additives.”, cat: “Other”, k: false, p: true, s: true },
{ name: “Alcohol”, al: [“beer”, “wine”, “liquor”, “cocktail”, “hard seltzer”], st: “caution”, note: “None for 3-6 months. Then moderate only.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Spicy Food”, al: [“hot sauce”, “chili”, “jalapeño”, “habanero”, “sriracha”], st: “caution”, note: “May cause GI upset post-transplant.”, cat: “Other”, k: false, p: false, s: false },
{ name: “Coconut Water”, al: [“coconut water”, “coconut milk”], st: “caution”, note: “Surprisingly high potassium.”, cat: “Beverage”, k: true, p: false, s: false },
{ name: “Sports Drinks”, al: [“gatorade”, “powerade”, “body armor”, “electrolit”], st: “caution”, note: “Added potassium/sodium. Check labels.”, cat: “Beverage”, k: true, p: false, s: true },
{ name: “Milk Substitutes”, al: [“oat milk”, “soy milk”, “almond milk”], st: “caution”, note: “Often fortified with phosphorus. Check labels.”, cat: “Dairy”, k: false, p: true, s: false },
// ── SAFE (Kidney-Friendly) ──
{ name: “Rice / Grains”, al: [“rice”, “white rice”, “quinoa”, “oatmeal”, “barley”, “couscous”, “grits”], st: “safe”, note: “Excellent low-K, low-Phos carbs.”, cat: “Grain”, k: false, p: false, s: false },
{ name: “Pasta”, al: [“pasta”, “spaghetti”, “noodles”, “macaroni”, “penne”, “fettuccine”, “ramen noodles”], st: “safe”, note: “All cooked pasta safe. Watch sodium in sauce.”, cat: “Grain”, k: false, p: false, s: false },
{ name: “Bread”, al: [“toast”, “bagel”, “tortilla”, “pita”, “biscuit”, “english muffin”, “sourdough”], st: “safe”, note: “Commercially baked fine.”, cat: “Grain”, k: false, p: false, s: false },
{ name: “Hard Cheese”, al: [“cheddar”, “swiss”, “parmesan”, “mozzarella”, “provolone”, “colby”, “jack”], st: “safe”, note: “Pasteurized hard cheeses safe. Watch portions for Phos.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Yogurt”, al: [“greek yogurt”, “yogurt”, “kefir”], st: “safe”, note: “Pasteurized only. High Phos — moderate portions.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Milk (Pasteurized)”, al: [“skim milk”, “whole milk”, “2% milk”, “half and half”, “cream”], st: “safe”, note: “Only pasteurized. Moderate Phos.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Coffee / Tea”, al: [“coffee”, “espresso”, “latte”, “green tea”, “black tea”, “decaf”, “cappuccino”], st: “safe”, note: “Moderate intake. Avoid well water for brewing.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Apples”, al: [“apple”, “applesauce”, “apple juice”, “apple cider”], st: “safe”, note: “Low potassium. Wash well.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Berries”, al: [“blueberry”, “strawberry”, “raspberry”, “blackberry”, “cranberry”], st: “safe”, note: “Low potassium. Great antioxidants.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Grapes”, al: [“grape”, “grape juice”], st: “safe”, note: “Low potassium. Good snack.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Pineapple”, al: [“pineapple”, “pineapple juice”], st: “safe”, note: “Low-moderate potassium.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Watermelon”, al: [“watermelon”], st: “safe”, note: “Low potassium. Good hydration.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Peaches / Pears”, al: [“peach”, “pear”, “canned peaches”, “canned pears”], st: “safe”, note: “Low potassium. Canned (drained) fine.”, cat: “Fruit”, k: false, p: false, s: false },
{ name: “Carrots”, al: [“carrot”, “baby carrot”], st: “safe”, note: “Low potassium. Cook or eat raw.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Green Beans”, al: [“green bean”, “string bean”, “snap pea”], st: “safe”, note: “Low potassium vegetable.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Cucumber”, al: [“cucumber”], st: “safe”, note: “Low potassium. Good hydration.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Cauliflower / Broccoli”, al: [“cauliflower”, “broccoli”], st: “safe”, note: “Low-moderate K+. Cook well.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Cabbage”, al: [“cabbage”, “coleslaw”, “bok choy”, “napa cabbage”], st: “safe”, note: “Excellent kidney-friendly vegetable.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Bell Peppers”, al: [“bell pepper”, “red pepper”, “green pepper”], st: “safe”, note: “Low potassium. High vitamin C.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Onions / Garlic”, al: [“onion”, “garlic”, “shallot”, “leek”], st: “safe”, note: “Great for flavoring without salt.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Corn”, al: [“corn”, “corn on the cob”, “popcorn”], st: “safe”, note: “Low-moderate potassium.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Lettuce / Salad”, al: [“lettuce”, “iceberg”, “romaine”, “spring mix”], st: “safe”, note: “Wash thoroughly. Low K+.”, cat: “Vegetable”, k: false, p: false, s: false },
{ name: “Peanut Butter”, al: [“peanut butter”, “almond butter”, “pb”], st: “safe”, note: “Small portions. Watch phosphorus.”, cat: “Other”, k: false, p: true, s: false },
{ name: “Water”, al: [“tap water”, “bottled water”, “sparkling water”, “seltzer”], st: “safe”, note: “Tap and bottled fine. No well water.”, cat: “Beverage”, k: false, p: false, s: false },
{ name: “Condiments”, al: [“ketchup”, “mustard”, “mayo”, “ranch”, “vinaigrette”, “bbq sauce”], st: “safe”, note: “Commercial, shelf-stable. Watch sodium.”, cat: “Other”, k: false, p: false, s: false },
{ name: “Honey (Commercial)”, al: [“processed honey”, “honey”], st: “safe”, note: “Heat-treated/commercial only.”, cat: “Other”, k: false, p: false, s: false },
{ name: “Olive Oil / Butter”, al: [“olive oil”, “butter”, “cooking oil”, “coconut oil”, “avocado oil”], st: “safe”, note: “Heart-healthy fats preferred.”, cat: “Other”, k: false, p: false, s: false },
{ name: “Crackers / Pretzels”, al: [“crackers”, “goldfish”, “pretzels”, “graham crackers”], st: “safe”, note: “Low-sodium varieties preferred.”, cat: “Grain”, k: false, p: false, s: false },
{ name: “Ice Cream / Sorbet”, al: [“ice cream”, “sorbet”, “frozen yogurt”, “popsicle”], st: “safe”, note: “Pasteurized. Watch phosphorus in dairy-based.”, cat: “Dairy”, k: false, p: true, s: false },
{ name: “Protein Shake”, al: [“ensure”, “boost”, “protein powder”, “whey”], st: “safe”, note: “Check phosphorus and potassium content on label.”, cat: “Beverage”, k: false, p: true, s: false },
];

// ─── Components ─────────────────────────────────────────

function Badge({ label, variant = “muted”, icon }) {
const c = { success: “bg-emerald-50 text-emerald-700 border-emerald-200”, warning: “bg-amber-50 text-amber-700 border-amber-200”, danger: “bg-rose-50 text-rose-700 border-rose-200”, info: “bg-sky-50 text-sky-700 border-sky-200”, muted: “bg-slate-100 text-slate-500 border-slate-200”, temp: “bg-cyan-50 text-cyan-700 border-cyan-200”, potassium: “bg-orange-50 text-orange-700 border-orange-200”, phosphorus: “bg-purple-50 text-purple-700 border-purple-200”, sodium: “bg-blue-50 text-blue-700 border-blue-200”, pink: “bg-pink-50 text-pink-700 border-pink-200”, yellow: “bg-yellow-50 text-yellow-700 border-yellow-200” }[variant] || “bg-slate-100 text-slate-500 border-slate-200”;
return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c}`}>{icon && <span className="text-[10px]">{icon}</span>}{label}</span>;
}

function Ring({ progress, size = 56, color = “#6366F1”, children }) {
const r = (size - 6) / 2, ci = 2 * Math.PI * r, p = cl(progress, 0, 1);
return <div className=“relative flex items-center justify-center” style={{ width: size, height: size }}>
<svg width={size} height={size} className="absolute -rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill=“none” stroke=”#E2E8F0” strokeWidth={5} /><circle cx={size / 2} cy={size / 2} r={r} fill=“none” stroke={color} strokeWidth={5} strokeDasharray={ci} strokeDashoffset={ci * (1 - p)} strokeLinecap=“round” style={{ transition: “stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)” }} /></svg>
<div className="relative z-10 flex flex-col items-center">{children}</div>

  </div>;
}

function Alrt({ icon, title, msg, variant = “warning” }) {
const c = { warning: “bg-amber-50 border-amber-400 text-amber-900”, danger: “bg-rose-50 border-rose-400 text-rose-900”, info: “bg-sky-50 border-sky-400 text-sky-900”, success: “bg-emerald-50 border-emerald-400 text-emerald-900” }[variant];
return <div className={`flex items-start gap-3 p-4 rounded-2xl border-l-4 mb-3 anim-in ${c}`}><span className="text-xl mt-0.5 shrink-0">{icon}</span><div className="flex-1 min-w-0"><p className="font-semibold text-sm">{title}</p><p className="text-xs mt-1 opacity-80 leading-relaxed whitespace-pre-line">{msg}</p></div></div>;
}

function NF({ label, value, onChange, unit, error, placeholder }) {
return <div className="flex-1"><label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label><div className={`flex items-center h-11 px-3 rounded-xl border-2 transition-all ${error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50/80 focus-within:border-indigo-400 focus-within:bg-white"}`}><input type=“number” inputMode=“decimal” value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || “—”} className=“w-full bg-transparent text-base font-medium text-slate-800 outline-none placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none” />{unit && <span className="text-[11px] font-semibold text-slate-400 ml-1 shrink-0">{unit}</span>}</div></div>;
}

function TF({ label, value, onChange, placeholder }) {
return <div className="flex-1"><label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || “”} className=“w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white transition-all” /></div>;
}

function Card({ children, className = “”, onClick, flat, accent, delay = 0 }) {
return <div onClick={onClick} className={`bg-white rounded-2xl p-5 mb-3 anim-in ${flat ? "border border-slate-100/80" : "shadow-sm shadow-slate-200/50 border border-slate-100/40"} ${accent ? "border-l-4" : ""} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : ""} ${className}`} style={{ …(accent ? { borderLeftColor: accent } : {}), animationDelay: `${delay}ms` }}>{children}</div>;
}

function SL({ title, sub, right }) {
return <div className="flex items-center justify-between mt-7 mb-3"><div><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>{sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}</div>{right}</div>;
}

function BigCheck({ checked, onClick, disabled }) {
return <button onClick={onClick} disabled={disabled} className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "bg-indigo-500 border-indigo-500 text-white scale-105 shadow-md shadow-indigo-200" : "border-slate-200 text-slate-300"} ${disabled ? "opacity-30 cursor-not-allowed" : "hover:border-indigo-300 active:scale-95 cursor-pointer"}`}>{checked && <span className="text-lg font-bold">✓</span>}</button>;
}

function SymChk({ label, checked, onClick, color = “rose” }) {
const on = color === “rose” ? “bg-rose-500 border-rose-500” : “bg-amber-500 border-amber-500”;
const txt = color === “rose” ? “text-rose-700” : “text-amber-700”;
return <button onClick={onClick} className="flex items-center gap-3 w-full py-2 text-left group"><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? `${on} scale-110` : "border-slate-200 group-hover:border-slate-300"}`}>{checked && <span className="text-white text-[10px] font-bold">✓</span>}</div><span className={`text-[13px] transition-colors ${checked ? `${txt} font-medium` : "text-slate-600"}`}>{label}</span></button>;
}

// ─── Tacrolimus Timer ───────────────────────────────────
function TacTimer({ lastTacTime, onTake }) {
const [now, setNow] = useState(Date.now());
useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

if (!lastTacTime) return <Card accent="#6366F1"><div className="flex items-center justify-between"><div><p className="font-semibold text-sm text-indigo-700">⏱️ Tacrolimus Timer</p><p className="text-xs text-slate-500 mt-1">Tap when you take your dose</p></div><button onClick={onTake} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-90 shadow-sm shadow-indigo-200">Log Dose</button></div></Card>;

const elapsed = now - lastTacTime, target = 12 * 3600000, remaining = Math.max(target - elapsed, 0);
const pct = cl(elapsed / target, 0, 1), overdue = remaining === 0;
const hrs = Math.floor(remaining / 3600000), mins = Math.floor((remaining % 3600000) / 60000), secs = Math.floor((remaining % 60000) / 1000);
const urgC = overdue ? “#E11D48” : remaining < 3600000 ? “#D97706” : “#6366F1”;
const takenStr = new Date(lastTacTime).toLocaleTimeString(“en-US”, { hour: “numeric”, minute: “2-digit” });

return <Card accent={urgC}><div className="flex items-center gap-4">
<Ring progress={pct} size={64} color={urgC}><span className=“text-[10px] font-bold” style={{ color: urgC }}>{overdue ? “NOW” : `${hrs}h`}</span></Ring>
<div className="flex-1"><p className=“font-semibold text-sm” style={{ color: overdue ? “#E11D48” : “#1E293B” }}>{overdue ? “🚨 Tacrolimus Due NOW” : “⏱️ Next Tacrolimus”}</p>{overdue ? <p className="text-xs text-rose-600 font-semibold mt-0.5">12 hours have passed. Take now.</p> : <p className="text-xs text-slate-500 mt-0.5">{hrs}h {String(mins).padStart(2, “0”)}m {String(secs).padStart(2, “0”)}s</p>}<p className="text-[10px] text-slate-400 mt-1">Last: {takenStr}</p></div>
<button onClick={onTake} className={`text-xs font-semibold px-3 py-2.5 rounded-xl transition-all active:scale-90 shadow-sm ${overdue ? "bg-rose-500 text-white shadow-rose-200 animate-pulse" : "bg-slate-100 text-slate-600"}`}>{overdue ? “Take Now” : “Re-log”}</button>

  </div></Card>;
}

// ─── TrendChart ─────────────────────────────────────────
function TrendChart({ data, dataKey, color = “#6366F1”, label, unit, dangerAbove, dangerBelow }) {
const valid = […data].reverse().filter(d => d.log && d.log[dataKey] && !isNaN(parseFloat(d.log[dataKey])));
if (valid.length < 2) return <div className="py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center"><p className="text-xs font-semibold text-slate-400">Not enough data for {label}.</p></div>;
const vals = valid.map(d => parseFloat(d.log[dataKey]));
const mn = Math.min(…vals), mx = Math.max(…vals), rng = mx - mn || 1;
const W = 300, H = 64, pad = 10;
const pts = vals.map((v, i) => ({ x: i / (vals.length - 1) * (W - pad * 2) + pad, y: H - pad - ((v - mn) / rng) * (H - pad * 2), v }));
const line = pts.map(p => `${p.x},${p.y}`).join(” “);
const latest = vals[vals.length - 1], isDanger = (dangerAbove && latest > dangerAbove) || (dangerBelow && latest < dangerBelow);
const gid = `g${dataKey}`;
return <div className="mt-3 anim-in"><div className="flex justify-between items-end mb-1.5"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span><span className={`text-sm font-bold ${isDanger ? "text-rose-500" : ""}`} style={isDanger ? {} : { color }}>{latest}<span className="text-xs font-medium opacity-60 ml-0.5">{unit}</span></span></div>
<svg viewBox={`0 0 ${W} ${H}`} className=“w-full h-16 overflow-visible”><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.15} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs><polygon points={`${pts[0].x},${H - pad} ${line} ${pts[pts.length - 1].x},${H - pad}`} fill={`url(#${gid})`} /><polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={line} />{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 3} fill=”#fff” stroke={isDanger && i === pts.length - 1 ? “#E11D48” : color} strokeWidth={i === pts.length - 1 ? 2.5 : 2} />)}</svg>
<div className="flex justify-between mt-1 text-[9px] text-slate-400 font-medium"><span>{fmtShort(valid[0].date)}</span><span>{fmtShort(valid[valid.length - 1].date)}</span></div></div>;
}

// ─── Calendar ───────────────────────────────────────────
function MiniCal({ year, month, onDay }) {
const pad = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate(), tid = toId(new Date());
const cells = […Array(pad).fill(null), …Array.from({ length: days }, (_, i) => i + 1)];
return <div>
<div className="grid grid-cols-7 gap-0.5 text-center mb-1">{[“Su”, “Mo”, “Tu”, “We”, “Th”, “Fr”, “Sa”].map(d => <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>)}</div>
<div className="grid grid-cols-7 gap-0.5">{cells.map((d, i) => {
if (!d) return <div key={i} />;
const dt = new Date(year, month, d), id = toId(dt), t = id === tid, lt = getLabType(dt), ap = (appts || APPTS).find(a => a.date === id), dl = (appts || APPTS).find(a => a.labBy === id);
return <button key={i} onClick={() => onDay && onDay(dt, { lt, ap, dl })} className={`relative h-9 rounded-lg text-sm font-medium transition-all hover:bg-slate-50 active:scale-90 ${t ? "bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-200" : "text-slate-700"}`}>{d}
<div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
{lt === “yellow” && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
{(lt === “pink” || lt === “pink-green”) && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
{(lt === “green” || lt === “pink-green”) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
{ap && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
{dl && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
</div></button>;
})}</div></div>;
}

// ═════════════════════════════════════════════════════════
// SETUP / ONBOARDING
// ═════════════════════════════════════════════════════════
function SetupScreen({ onComplete }) {
const [step, setStep] = useState(0);
const [p, setP] = useState({ name: “Jethro”, type: “Kidney & Pancreas”, surgDate: “2026-02-09”, emergPhone: “415-600-1000”, coordName: “Regina Dayao, RN”, coordPhone: “415-600-1072”, labPhone: “530-365-4600”, pharmacyPhone: “415-558-7051”, clinicPhone: “415-600-1040”, clinicSub: “1100 Van Ness Ave, 3rd Floor”, urologyPhone: “415-600-3127”, urologySub: “1100 Van Ness, 5th Fl”, dietPhone: “415-600-3269”, dietSub: “Mon-Fri 9-5” });
const valid0 = p.name.trim() && p.surgDate;

const finish = () => {
const parts = p.surgDate.split(”-”);
const surgDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
const contacts = [
{ icon: “🚨”, label: “Transplant Team”, sub: “24hr Emergency Line”, phone: p.emergPhone || “—”, urgent: true },
…(p.coordName ? [{ icon: “👩\u200D⚕️”, label: “Coordinator”, sub: p.coordName, phone: p.coordPhone || “—” }] : []),
…(p.labPhone ? [{ icon: “🩸”, label: “Lab / Draw Site”, sub: “Lab location”, phone: p.labPhone }] : []),
…(p.pharmacyPhone ? [{ icon: “💊”, label: “Pharmacy”, sub: “For refills”, phone: p.pharmacyPhone }] : []),
…(p.clinicPhone ? [{ icon: “🏥”, label: “Kidney Clinic”, sub: p.clinicSub || “Clinic”, phone: p.clinicPhone }] : []),
…(p.urologyPhone ? [{ icon: “🔬”, label: “Urology”, sub: p.urologySub || “Urology”, phone: p.urologyPhone }] : []),
…(p.dietPhone ? [{ icon: “🥗”, label: “Dietitian”, sub: p.dietSub || “Mon-Fri”, phone: p.dietPhone }] : []),
];
onComplete({ name: p.name, type: p.type, surgDate, contacts, emergPhone: p.emergPhone });
};

return <div className=“h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-white to-slate-50 max-w-md mx-auto overflow-hidden” style={{ fontFamily: “-apple-system,BlinkMacSystemFont,‘Segoe UI’,system-ui,sans-serif” }}>
<div className="flex-1 overflow-y-auto px-6 pt-12 pb-8">
{step === 0 && <div className="anim-in">
<div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-6 shadow-inner"><span className="text-4xl">🫀</span></div>
<h1 className="text-3xl font-bold text-slate-800 text-center tracking-tight mb-2">Transplant Tracker</h1>
<p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">Your personal post-transplant recovery companion.</p>
<Card>
<p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-3">About You</p>
<div className="space-y-3">
<TF label=“Your First Name” value={p.name} onChange={v => setP(x => ({ …x, name: v }))} placeholder=“e.g. Jordan” />
<div><label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Transplant Type</label>
<div className="flex flex-wrap gap-1.5">{TRANSPLANT_TYPES.map(t => <button key={t} onClick={() => setP(x => ({ …x, type: t }))} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${p.type === t ? "bg-indigo-500 text-white shadow-sm" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>{t}</button>)}</div></div>
<div><label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Surgery Date</label>
<input type=“date” value={p.surgDate} onChange={e => setP(x => ({ …x, surgDate: e.target.value }))} className=“w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 transition-all” /></div>
</div>
</Card>
<button onClick={() => valid0 && setStep(1)} disabled={!valid0} className={`w-full py-4 rounded-2xl text-sm font-bold transition-all mt-2 ${valid0 ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>Continue</button>
</div>}

```
  {step === 1 && <div className="anim-in">
    <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Care Team</h2>
    <p className="text-sm text-slate-500 mb-6">Add your key phone numbers. You can edit these later.</p>
    <Card><div className="space-y-3">
      <TF label="24hr Emergency Line" value={p.emergPhone} onChange={v => setP(x => ({ ...x, emergPhone: v }))} placeholder="e.g. 415-600-1000" />
      <div className="h-px bg-slate-100" />
      <TF label="Coordinator Name" value={p.coordName} onChange={v => setP(x => ({ ...x, coordName: v }))} placeholder="e.g. Regina Dayao, RN" />
      <TF label="Coordinator Phone" value={p.coordPhone} onChange={v => setP(x => ({ ...x, coordPhone: v }))} placeholder="" />
      <div className="h-px bg-slate-100" />
      <TF label="Lab Phone" value={p.labPhone} onChange={v => setP(x => ({ ...x, labPhone: v }))} placeholder="" />
      <TF label="Pharmacy Phone" value={p.pharmacyPhone} onChange={v => setP(x => ({ ...x, pharmacyPhone: v }))} placeholder="" />
    </div></Card>
    <div className="flex gap-3 mt-2">
      <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl text-sm font-bold bg-slate-100 text-slate-600 active:scale-[0.98]">Back</button>
      <button onClick={finish} className="flex-1 py-4 rounded-2xl text-sm font-bold bg-indigo-500 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]">Start Tracking</button>
    </div>
  </div>}
</div>
<div className="px-6 pb-6"><p className="text-[10px] text-slate-400 text-center leading-relaxed">This app is a personal tracking tool. It does not provide medical advice. Always follow your transplant team's instructions.</p></div>
```

  </div>;
}

// ═════════════════════════════════════════════════════════
// TODAY TAB — Clinical Rules Engine
// ═════════════════════════════════════════════════════════
function TodayTab({ log, sL, meds, past, profile }) {
const SURG = profile.surgDate || SURG_DEFAULT;
const ds = dBt(SURG, new Date()), ws = wBt(SURG, new Date()), fast = fastTn(), nl = nxLab(), fPct = cl(log.fluidMl / CL_LIMITS.fluidGoal, 0, 1);
const mDone = log.weight && log.amTemp;
const tasks = [log.weight, log.amTemp, log.amMeds, log.fluidMl >= CL_LIMITS.fluidGoal, log.pmTemp, log.pmMeds].filter(Boolean).length;
const pct = tasks / 6, lowM = meds.filter(m => m.ppd > 0 && m.inv / m.ppd <= CL_LIMITS.lowMedDays), actR = RESTS.filter(r => ws < r.w);

// ── CLINICAL RULES ENGINE (from CPMC vitals sheet) ──
const alerts = [];
const yId = toId(addD(new Date(), -1)), yLog = past?.[yId] || null;

// Weight: >=2 lbs gain
if (log.weight && yLog && yLog.weight) {
const diff = parseFloat(log.weight) - parseFloat(yLog.weight);
if (diff >= CL_LIMITS.weightGainAlert) alerts.push({ v: “danger”, i: “⚖️”, t: “Weight Gain Alert”, m: `+${diff.toFixed(1)} lbs since yesterday.\nREPORT A WEIGHT GAIN OF 2 POUNDS OR MORE PER DAY.` });
}

// Evaluate vitals for a time period
const evalV = (sys, hr, temp, period) => {
const s = parseFloat(sys), h = parseFloat(hr), te = parseFloat(temp);
if (te >= CL_LIMITS.feverDanger) alerts.push({ v: “danger”, i: “🌡️”, t: `${period} Fever — ${te}°F`, m: `REPORT TEMPERATURES OF ${CL_LIMITS.feverDanger} OR GREATER ASAP.${profile.emergPhone ? `\nCall: ${profile.emergPhone}` : ""}` });
else if (te >= CL_LIMITS.feverWarning) alerts.push({ v: “warning”, i: “🌡️”, t: `${period} Elevated — ${te}°F`, m: `Monitor closely. Call if it reaches ${CL_LIMITS.feverDanger}°F.` });
if (s > CL_LIMITS.bpSysHigh || h > CL_LIMITS.hrHigh) alerts.push({ v: “warning”, i: “📈”, t: `High ${period} Vitals`, m: `BP > ${CL_LIMITS.bpSysHigh} or HR > ${CL_LIMITS.hrHigh}.\nTAKE ALL MEDS, wait 45 minutes, retake.\nIf still high, REPORT.` });
else if ((s > 0 && s < CL_LIMITS.bpSysLow) || (h > 0 && h < CL_LIMITS.hrLow)) alerts.push({ v: “warning”, i: “📉”, t: `Low ${period} Vitals`, m: `BP < ${CL_LIMITS.bpSysLow} or HR < ${CL_LIMITS.hrLow}.\nHOLD BLOOD PRESSURE MEDS.\nTake all other meds & REPORT.` });
};
evalV(log.amSys, log.amHr, log.amTemp, “Morning”);
evalV(log.pmSys, log.pmHr, log.pmTemp, “Evening”);

const hasSymptom = log.incision || log.nausea || log.pain > 7 || log.tenderness || log.swelling;
const todayLabType = getLabType(new Date());

return <div className="pb-8">
<div className="flex items-start justify-between mb-2">
<div><h1 className="text-2xl font-bold text-slate-800 tracking-tight">{greet(profile.name)}</h1><p className="text-sm text-slate-400 mt-1">{fmtDate(new Date())}</p></div>
<Ring progress={pct} size={52} color={pct >= 1 ? “#059669” : “#6366F1”}><span className="text-xs font-bold text-slate-700">{Math.round(pct * 100)}%</span></Ring>
</div>
<div className="inline-flex items-center bg-slate-100/80 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 mb-5">Day {ds} · Week {ws}</div>

```
{/* Clinical alerts */}
{alerts.map((a, i) => <Alrt key={i} icon={a.i} title={a.t} msg={a.m} variant={a.v} />)}
{hasSymptom && <Alrt icon="🚨" title="Symptoms Reported" msg="You logged symptoms that may need attention." variant="danger" />}
{fast && <Alrt icon="🌙" title="Fasting Tonight" msg={`Lab draw tomorrow (${fmtWd(nl)}). Stop eating at midnight.\nWater & pain meds OK. Labs BEFORE morning meds.`} variant="warning" />}
{lowM.length > 0 && <Alrt icon="📦" title={`${lowM.length} Med${lowM.length > 1 ? "s" : ""} Running Low`} msg={lowM.map(m => m.name).join(", ")} variant="warning" />}

<TacTimer lastTacTime={log.lastTacTime} onTake={() => sL(p => ({ ...p, lastTacTime: Date.now() }))} />

{/* Morning */}
<SL title="Morning Check-In" sub="Before AM medications" right={mDone ? <Badge label="Saved" variant="success" icon="✓" /> : <Badge label="Required" variant="warning" icon="⏳" />} />
<Card delay={50} accent={alerts.some(a => a.t.includes("Morning") || a.t.includes("Weight")) ? "#E11D48" : undefined}>
  <div className="flex gap-3 mb-3"><NF label="Weight" value={log.weight} onChange={v => sL(p => ({ ...p, weight: v }))} unit="lbs" /><NF label="Temperature" value={log.amTemp} onChange={v => sL(p => ({ ...p, amTemp: v }))} unit="°F" error={parseFloat(log.amTemp) >= CL_LIMITS.feverDanger} /></div>
  <div className="flex gap-2 mb-3 items-end"><NF label="BP Sys" value={log.amSys} onChange={v => sL(p => ({ ...p, amSys: v }))} placeholder="120" /><span className="text-xl text-slate-300 mb-2">/</span><NF label="Dia" value={log.amDia} onChange={v => sL(p => ({ ...p, amDia: v }))} placeholder="80" /><NF label="HR" value={log.amHr} onChange={v => sL(p => ({ ...p, amHr: v }))} unit="bpm" /></div>
</Card>

<Card delay={80} className={!mDone ? "opacity-50 pointer-events-none" : ""}><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-800 text-sm">💊 Morning Medications</p>{!mDone && <p className="text-xs text-amber-600 mt-1">Complete vitals to unlock</p>}{log.amMeds && <p className="text-xs text-slate-400 mt-1">Taken ✓</p>}</div><BigCheck checked={log.amMeds} disabled={!mDone} onClick={() => sL(p => ({ ...p, amMeds: !p.amMeds }))} /></div></Card>

{/* Lab Results on lab days */}
{todayLabType && <div>
  <SL title="Lab Results" sub={todayLabType === "yellow" ? "Twice-weekly draw" : todayLabType.includes("pink") ? "Monthly draw + urine" : "Protocol"} />
  <Card delay={100} accent={todayLabType === "yellow" ? "#EAB308" : "#EC4899"}>
    <p className="text-xs text-slate-400 mb-3">Enter values as received. Colors = target ranges.</p>
    <div className="flex gap-3 mb-2">
      <div className="flex-1"><NF label="Creatinine" value={log.labCr} onChange={v => sL(p => ({ ...p, labCr: v }))} unit="mg/dL" />{log.labCr && <div className="mt-1"><Badge label={LAB_R.cr.note} variant={labClr("cr", log.labCr)} /></div>}</div>
      <div className="flex-1"><NF label="Tacrolimus" value={log.labTac} onChange={v => sL(p => ({ ...p, labTac: v }))} unit="ng/mL" />{log.labTac && <div className="mt-1"><Badge label={LAB_R.tac.note} variant={labClr("tac", log.labTac)} /></div>}</div>
    </div>
    <div className="flex gap-3"><div className="flex-1"><NF label="GFR" value={log.labGfr} onChange={v => sL(p => ({ ...p, labGfr: v }))} unit="mL/min" />{log.labGfr && <div className="mt-1"><Badge label={LAB_R.gfr.note} variant={labClr("gfr", log.labGfr)} /></div>}</div><div className="flex-1"><NF label="Glucose" value={log.labGlu} onChange={v => sL(p => ({ ...p, labGlu: v }))} unit="mg/dL" />{log.labGlu && <div className="mt-1"><Badge label={LAB_R.glu.note} variant={labClr("glu", log.labGlu)} /></div>}</div></div>
    <div className="flex gap-3 mt-2"><div className="flex-1"><NF label="Potassium" value={log.labK} onChange={v => sL(p => ({ ...p, labK: v }))} unit="mEq/L" />{log.labK && <div className="mt-1"><Badge label={LAB_R.k.note} variant={labClr("k", log.labK)} /></div>}</div><div className="flex-1"><NF label="Phosphorus" value={log.labPhos} onChange={v => sL(p => ({ ...p, labPhos: v }))} unit="mg/dL" />{log.labPhos && <div className="mt-1"><Badge label={LAB_R.phos.note} variant={labClr("phos", log.labPhos)} /></div>}</div></div>
  </Card>
</div>}

{/* Fluid */}
<SL title="Hydration" sub={`Goal: ${(CL_LIMITS.fluidGoal/1000).toFixed(1)} liters`} />
<Card delay={120}><div className="flex items-center justify-between mb-4"><Ring progress={fPct} size={72} color={fPct >= .66 ? "#059669" : fPct >= .33 ? "#D97706" : "#E11D48"}><span className="text-base font-bold text-slate-800">{(log.fluidMl / 1000).toFixed(1)}</span><span className="text-[9px] text-slate-400 -mt-0.5">liters</span></Ring>
  <div className="flex gap-2">{[{ ml: 250, i: "🥤", l: "250ml" }, { ml: 500, i: "🫗", l: "500ml" }, { ml: 350, i: "☕", l: "350ml" }].map(b => <button key={b.l} onClick={() => sL(p => ({ ...p, fluidMl: Math.min(p.fluidMl + b.ml, 5000) }))} className="flex flex-col items-center bg-slate-50 hover:bg-indigo-50 active:scale-90 rounded-xl px-3 py-2.5 transition-all border border-slate-100"><span className="text-lg">{b.i}</span><span className="text-[10px] font-semibold text-slate-500 mt-0.5">+{b.l}</span></button>)}</div></div>
  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${cl(fPct * 100, 0, 100)}%` }} /></div></Card>

{/* Evening */}
<SL title="Evening Check-In" sub="Before PM medications" right={log.pmMeds ? <Badge label="Done" variant="success" icon="✓" /> : undefined} />
<Card delay={150} accent={alerts.some(a => a.t.includes("Evening")) ? "#E11D48" : undefined}>
  <div className="flex gap-3 mb-3"><NF label="Temperature" value={log.pmTemp} onChange={v => sL(p => ({ ...p, pmTemp: v }))} unit="°F" error={parseFloat(log.pmTemp) >= CL_LIMITS.feverDanger} /><NF label="HR" value={log.pmHr} onChange={v => sL(p => ({ ...p, pmHr: v }))} unit="bpm" /></div>
  <div className="flex gap-2 mb-3 items-end"><NF label="BP Sys" value={log.pmSys} onChange={v => sL(p => ({ ...p, pmSys: v }))} placeholder="120" /><span className="text-xl text-slate-300 mb-2">/</span><NF label="Dia" value={log.pmDia} onChange={v => sL(p => ({ ...p, pmDia: v }))} placeholder="80" /></div>
  <div className="h-px bg-slate-100 my-3" /><div className="flex items-center justify-between"><p className="font-semibold text-slate-800 text-sm">💊 Evening Medications</p><BigCheck checked={log.pmMeds} onClick={() => sL(p => ({ ...p, pmMeds: !p.pmMeds }))} /></div>
</Card>

{/* Symptoms */}
<SL title="Symptom Check" />
<Card delay={200}>
  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-1">Rejection / Wound</p>
  {[["incision", "Incision redness, drainage, or swelling"], ["tenderness", "Tenderness over transplant area"], ["swelling", "New swelling in legs or abdomen"], ["urineDown", "Decreased urine output"], ["burning", "Burning / pain with urination"]].map(([k, l]) => <SymChk key={k} label={l} checked={log[k]} onClick={() => sL(p => ({ ...p, [k]: !p[k] }))} />)}
  <div className="h-px bg-slate-100 my-3" />
  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">GI Tract</p>
  {[["acidReflux", "Acid reflux / heartburn"], ["gas", "Gas / bloating"], ["nausea", "Nausea / vomiting"], ["diarrhea", "Diarrhea"], ["constipation", "Constipation"]].map(([k, l]) => <SymChk key={k} label={l} checked={log[k]} onClick={() => sL(p => ({ ...p, [k]: !p[k] }))} color="amber" />)}
  <div className="h-px bg-slate-100 my-3" />
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Appetite</p>
  <div className="flex gap-2">{["poor", "reduced", "normal", "good"].map(a => <button key={a} onClick={() => sL(p => ({ ...p, appetite: a }))} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${log.appetite === a ? "bg-indigo-500 text-white" : "bg-slate-50 text-slate-500 border border-slate-100"}`}>{a}</button>)}</div>
  <div className="h-px bg-slate-100 my-3" />
  <p className="text-sm text-slate-600 mb-2">Pain level</p>
  <div className="flex gap-1">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <button key={n} onClick={() => sL(p => ({ ...p, pain: n }))} className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all active:scale-90 ${n <= log.pain ? (n <= 3 ? "bg-emerald-400 text-white" : n <= 6 ? "bg-amber-400 text-white" : "bg-rose-500 text-white") : "bg-slate-100 text-slate-400"}`}>{n}</button>)}</div>
</Card>

<SL title="Daily Notes" />
<Card delay={250}><textarea value={log.notes} onChange={e => sL(p => ({ ...p, notes: e.target.value }))} placeholder="How are you feeling?" className="w-full h-20 bg-slate-50 rounded-xl border-2 border-slate-200 p-3 text-sm text-slate-700 outline-none resize-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-300" /></Card>

{actR.length > 0 && <div><SL title="Active Restrictions" sub={`${actR.length} active`} /><Card flat delay={280}>{actR.slice(0, 3).map(r => { const p = cl(ws / r.w, 0, 1); return <div key={r.id} className="flex items-center gap-3 py-2"><span className="text-lg shrink-0">{r.i}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{r.t}</p><div className="h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-indigo-400 rounded-full transition-all duration-700" style={{ width: `${p * 100}%` }} /></div></div><span className="text-xs font-semibold text-slate-500 shrink-0">{r.w - ws > 0 ? `${r.w - ws}w` : "✓"}</span></div>; })}{actR.length > 3 && <p className="text-xs text-slate-400 text-center mt-2">+{actR.length - 3} more</p>}</Card></div>}

{profile.emergPhone && <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-center gap-2"><span>🚨</span><span className="text-sm font-semibold text-rose-700">Emergency: {profile.emergPhone}</span></div>}
```

  </div>;
}

// ═════════════════════════════════════════════════════════
// LABS TAB — Three-tier color calendar + Clean Catch
// ═════════════════════════════════════════════════════════
function LabsTab({ appts }) {
const today = new Date(), [mo, setMo] = useState(today.getMonth()), [yr, setYr] = useState(today.getFullYear()), [rules, setRules] = useState(false), [det, setDet] = useState(null), [showCC, setShowCC] = useState(false);
const fast = fastTn(), nl = nxLab(), nlType = getLabType(nl), up = (appts || APPTS).filter(a => parseLocalDay(a.date) > today);

return <div className="pb-8">
{fast ? <Alrt icon=“🌙” title=“Fasting Tonight” msg={`Lab draw tomorrow (${fmtWd(nl)}). Stop eating at midnight.\nWater & pain meds OK. Labs BEFORE morning meds.${nlType && nlType.includes("pink") ? "\n\n🫙 REMINDER: Tomorrow is a MONTHLY lab — bring urine sample." : ""}`} variant=“warning” /> :
<Card flat><div className="flex items-center gap-3"><span className="text-2xl">🗓️</span><div className="flex-1"><p className="font-semibold text-slate-800 text-sm">Next Lab Draw</p><p className="text-sm text-slate-500">{fmtDate(nl)}</p></div>{nlType === “yellow” && <Badge label="Twice/Wk" variant="yellow" />}{nlType && nlType.includes(“pink”) && <Badge label="Monthly" variant="pink" />}</div></Card>}

```
<div className="flex gap-2 mb-4">
  <button onClick={() => setRules(true)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95">📋 Lab Rules</button>
  <button onClick={() => setShowCC(true)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-slate-100">🫙 Urine Protocol</button>
</div>

<Card>
  <div className="flex items-center justify-between mb-3">
    <button onClick={() => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); }} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90">‹</button>
    <span className="font-bold text-slate-700 text-sm">{new Date(yr, mo).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
    <button onClick={() => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); }} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90">›</button>
  </div>
  <MiniCal year={yr} month={mo} onDay={(d, info) => { if (info.lt) setDet({ t: "lab", lt: info.lt, d }); else if (info.ap) setDet({ t: "ap", data: info.ap }); else setDet(null); }} />
  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
    {[["#EAB308", "Twice/Wk"], ["#EC4899", "Monthly"], ["#4ADE80", "Protocol"], ["#3B82F6", "Appt"], ["#EF4444", "Deadline"]].map(([c, l]) => <div key={l} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /><span className="text-[10px] text-slate-400 font-medium">{l}</span></div>)}
  </div>
</Card>

{/* Detail panel */}
{det && <Card accent={det.t === "lab" ? (det.lt.includes("pink") ? "#EC4899" : det.lt === "green" ? "#4ADE80" : "#EAB308") : "#3B82F6"} className="anim-in">
  {det.t === "lab" && <div>
    <p className="font-bold text-slate-800 mb-1">{det.lt === "yellow" ? "🟨 Twice-a-Week Labs" : det.lt === "pink" ? "🟪 Monthly Labs" : det.lt === "pink-green" ? "🟪🟩 Monthly + Protocol Labs" : "🟩 Protocol Labs"}</p>
    <p className="text-xs text-slate-400 mb-3">{fmtDate(det.d)}</p>
    {(det.lt === "yellow") && <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tests</p>{LAB_TESTS.yellow.map(t => <div key={t} className="flex justify-between py-1 text-sm"><span className="text-slate-600">{t}</span><span className="text-[10px] font-mono text-slate-400">{LAB_CODES.yellow[t]}</span></div>)}</div>}
    {det.lt.includes("pink") && <div><p className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-1">Monthly Tests</p>{LAB_TESTS.pink.map(t => <div key={t} className="flex justify-between py-1 text-sm"><span className="text-slate-600">{t}</span><span className="text-[10px] font-mono text-slate-400">{LAB_CODES.pink[t]}</span></div>)}
      <div className="mt-3 bg-pink-50 p-3 rounded-xl border border-pink-100"><p className="text-xs text-pink-700 font-semibold">🫙 This day requires a urine sample. Review Clean Catch protocol.</p></div></div>}
    {det.lt.includes("green") && <div className="mt-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">One-Time Protocol (UNOS)</p>{LAB_TESTS.green.map(t => <div key={t} className="flex justify-between py-1 text-sm"><span className="text-emerald-800 font-medium">{t}</span><span className="text-[10px] font-mono text-emerald-500">{LAB_CODES.green[t]}</span></div>)}</div>}
  </div>}
  {det.t === "ap" && <div><p className="font-semibold text-sm">{det.data.type === "virtual" ? "📹" : "🏥"} {det.data.doc}</p><p className="text-xs text-slate-500 mt-1">{det.data.time} — {det.data.desc}</p>{det.data.labBy && <p className="text-xs text-rose-600 font-semibold mt-2">⚠️ Labs by {det.data.labBy}</p>}</div>}
  <button onClick={() => setDet(null)} className="w-full text-xs font-bold text-slate-400 mt-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200">Close</button>
</Card>}

<SL title="Upcoming" right={<Badge label={`${up.length}`} variant="info" />} />
{up.map(a => { const d = parseLocalDay(a.date), days = dBt(today, d); return <Card key={a.id} accent="#3B82F6"><div className="flex justify-between items-start"><div><p className="font-semibold text-slate-800 text-sm">{a.doc}</p><p className="text-xs text-slate-500 mt-0.5">{a.desc}</p><p className="text-xs text-slate-400 mt-1">{fmtShort(d)} at {a.time} · {a.type === "virtual" ? "📹" : "🏥"}</p></div><Badge label={days === 0 ? "Today" : `${days}d`} variant={days <= 2 ? "danger" : days <= 7 ? "warning" : "info"} /></div>{a.labBy && <div className="bg-rose-50 p-2.5 rounded-xl mt-3 border border-rose-100"><p className="text-xs text-rose-700 font-semibold">⚠️ Labs by {a.labBy}</p></div>}</Card>; })}

{/* Clean Catch Modal */}
{showCC && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center anim-fade" onClick={() => setShowCC(false)}><div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 anim-up" onClick={e => e.stopPropagation()}>
  <div className="flex items-center gap-2 mb-4"><span className="text-2xl">🫙</span><h2 className="text-xl font-bold text-slate-800">Clean Catch Urine Protocol</h2></div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Males</p>
  {["Wash hands with soap and water.", "Remove cap from urine container.", "Pull back foreskin, if present.", "Begin urinating into the toilet.", "During urination, insert container into stream to catch sample. Before bladder is empty, withdraw container.", "Finish urinating into the toilet.", "Screw lid tightly onto container.", "Wash hands with soap and water."].map((s, i) => <div key={i} className="flex gap-3 py-2"><span className="text-sm font-bold text-indigo-500 shrink-0 w-6 text-right">{i + 1}.</span><p className="text-sm text-slate-600">{s}</p></div>)}
  <button onClick={() => setShowCC(false)} className="w-full mt-4 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200">Got It</button>
</div></div>}

{/* Lab Rules Modal */}
{rules && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center anim-fade" onClick={() => setRules(false)}><div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 anim-up" onClick={e => e.stopPropagation()}>
  <h2 className="text-xl font-bold text-slate-800 mb-4">Lab Day Rules</h2>
  {[["📅", "Draw labs every Monday & Thursday"], ["🚫", "Never 2 days in a row. Avoid Fridays."], ["🌙", "Fast from midnight. Water and pain meds OK."], ["💊", "Draw BEFORE morning medications."], ["📋", "Bring your color-coded lab slip."], ["🫙", "Monthly labs require urine sample — review clean catch."], ["⏰", "Twice weekly until function improves."]].map(([e, t], i) => <div key={i} className="flex items-start gap-3 py-2.5"><span className="text-xl">{e}</span><p className="text-sm text-slate-600">{t}</p></div>)}
  <button onClick={() => setRules(false)} className="w-full mt-4 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200">Got It</button>
</div></div>}
```

  </div>;
}

// ═════════════════════════════════════════════════════════
// MEDS TAB
// ═════════════════════════════════════════════════════════
function MedsTab({ meds, sM }) {
const [show, setShow] = useState(false), [form, setF] = useState({ name: “”, dosage: “”, instr: “”, ppd: “1”, inv: “30” });
const low = meds.filter(m => m.ppd > 0 && m.inv / m.ppd <= CL_LIMITS.lowMedDays);
const add = () => { if (!form.name.trim()) return; const cols = [”#6366F1”, “#059669”, “#D97706”, “#0284C7”, “#7C3AED”, “#E11D48”]; sM(p => […p, { id: Date.now().toString(), name: form.name.trim(), dosage: form.dosage || “Per doctor”, instr: form.instr, inv: parseInt(form.inv) || 30, ppd: parseInt(form.ppd) || 1, critical: false, color: cols[meds.length % cols.length] }]); setF({ name: “”, dosage: “”, instr: “”, ppd: “1”, inv: “30” }); setShow(false); };

return <div className="pb-8">
{low.length > 0 && <Alrt icon=“📦” title={`${low.length} Med${low.length > 1 ? "s" : ""} Below ${CL_LIMITS.lowMedDays}-Day Supply`} msg={low.map(m => m.name).join(”, “) + “\n\nPharmacy Fax: 415-558-7051”} variant=“danger” />}
<Card flat><p className="text-xs text-slate-400 italic">Maintain 1+ week supply. Reorder 3rd week of cycle.</p></Card>
<SL title=“My Medications” right={<Badge label={`${meds.length}`} variant=“muted” />} />
{meds.map((m, idx) => { const dl = m.ppd > 0 ? Math.floor(m.inv / m.ppd) : 999, isLow = dl <= CL_LIMITS.lowMedDays, sp = m.ppd > 0 ? cl(m.inv / (m.ppd * 30), 0, 1) : 1; return <Card key={m.id} accent={isLow ? “#E11D48” : undefined} delay={idx * 40}><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2"><div className=“w-1 h-5 rounded-full” style={{ backgroundColor: m.color }} /><div><p className="font-semibold text-slate-800 text-sm">{m.name}</p><p className="text-xs text-slate-400 mt-0.5">{m.dosage} · {m.instr || “As directed”}</p></div></div>{m.critical && <Badge label="Critical" variant="danger" />}</div><div className="flex items-center gap-3"><Ring progress={sp} size={46} color={isLow ? “#E11D48” : “#6366F1”}><span className={`text-xs font-bold ${isLow ? "text-rose-600" : "text-slate-700"}`}>{m.inv}</span></Ring><div className="flex-1"><p className="text-sm text-slate-600">{m.inv} pills · {dl}d</p>{isLow && <p className="text-xs text-rose-600 font-semibold mt-0.5">⚠️ Order refill</p>}</div><button onClick={() => sM(p => p.map(x => x.id === m.id ? { …x, inv: Math.max(0, x.inv - 1) } : x))} className=“bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-90 shadow-sm shadow-indigo-200”>💊 Take</button></div><div className="flex gap-4 mt-3 pt-3 border-t border-slate-50"><button onClick={() => sM(p => p.filter(x => x.id !== m.id))} className=“text-xs text-rose-500 font-semibold”>Remove</button></div></Card>; })}
<button onClick={() => setShow(true)} className=“w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all mt-1”>+ Add Medication</button>
{show && <div className=“fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center anim-fade” onClick={() => setShow(false)}><div className=“bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 anim-up” onClick={e => e.stopPropagation()}><h2 className="text-xl font-bold text-slate-800 mb-4">Add Medication</h2><div className="space-y-3">{[[“Name *”, “name”, “e.g. Tacrolimus”], [“Dosage”, “dosage”, “5mg”], [“Instructions”, “instr”, “With food”]].map(([l, k, ph]) => <div key={k}><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{l}</label><input value={form[k]} onChange={e => setF(f => ({ …f, [k]: e.target.value }))} placeholder={ph} className=“w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-300 outline-none bg-slate-50” /></div>)}<div className="flex gap-3">{[[“Pills/Day”, “ppd”], [“Supply”, “inv”]].map(([l, k]) => <div key={k} className="flex-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{l}</label><input type=“number” value={form[k]} onChange={e => setF(f => ({ …f, [k]: e.target.value }))} className=“w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-300 outline-none bg-slate-50” /></div>)}</div></div><div className="flex gap-3 mt-5"><button onClick={() => setShow(false)} className=“flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm”>Cancel</button><button onClick={add} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200">Save</button></div></div></div>}

  </div>;
}

// ═════════════════════════════════════════════════════════
// HISTORY TAB
// ═════════════════════════════════════════════════════════
function HistoryTab({ logs, tL, meds, profile }) {
const SURG = profile.surgDate || SURG_DEFAULT;
const [copied, setCopied] = useState(false), today = toId(new Date());
const past7 = Array.from({ length: 7 }, (_, i) => { const d = addD(new Date(), -i), id = toId(d); return { date: d, id, log: id === today ? tL : (logs[id] || null) }; });
const exprt = (log, id) => { if (!log) return “No data.”; return [“TRANSPLANT TRACKER — Daily Report”, `Date: ${fmtDate(parseLocalDay(id))}`, `Day ${dBt(SURG, parseLocalDay(id))} post-transplant`, “”, “── Morning ──”, `Weight: ${log.weight || "—"} lbs`, `Temp: ${log.amTemp || "—"}°F`, `BP: ${log.amSys || "—"}/${log.amDia || "—"}  HR: ${log.amHr || "—"}`, `AM Meds: ${log.amMeds ? "✓" : "✗"}`, “”, “── Evening ──”, `Temp: ${log.pmTemp || "—"}°F`, `BP: ${log.pmSys || "—"}/${log.pmDia || "—"}  HR: ${log.pmHr || "—"}`, `PM Meds: ${log.pmMeds ? "✓" : "✗"}`, “”, `Hydration: ${(log.fluidMl / 1000).toFixed(1)}L / ${(CL_LIMITS.fluidGoal/1000).toFixed(1)}L`, “”, “── Symptoms ──”, `Pain: ${log.pain}/10`, `GI: ${[log.acidReflux && "reflux", log.gas && "gas", log.diarrhea && "diarrhea"].filter(Boolean).join(", ") || "none"}`, `Appetite: ${log.appetite}`, “”, …(log.notes ? [“── Notes ──”, log.notes, “”] : []), `── Meds (${meds.length}) ──`, …meds.map(m => `${m.name}: ${m.inv} pills (${m.ppd > 0 ? Math.floor(m.inv / m.ppd) : "∞"}d)`)].filter(l => l !== “”).join(”\n”); };
const copy = () => { navigator.clipboard?.writeText(exprt(tL, today)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2e3); }); };

return <div className="pb-8">
<Card><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-800 text-sm">📋 Export Today</p><p className="text-xs text-slate-400 mt-0.5">Copy for your care team</p></div><button onClick={copy} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${copied ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>{copied ? “✓ Copied!” : “Copy”}</button></div></Card>
<Card delay={30}><p className="font-semibold text-slate-800 text-sm mb-0.5">📈 7-Day Vitals</p><TrendChart data={past7} dataKey="weight" label="Weight" unit="lbs" color="#0ea5e9" /><div className="h-px bg-slate-100 my-3" /><TrendChart data={past7} dataKey="amTemp" label="AM Temp" unit="°F" color="#f43f5e" dangerAbove={CL_LIMITS.feverDanger} /><div className="h-px bg-slate-100 my-3" /><TrendChart data={past7} dataKey="amSys" label="BP Systolic" unit="mmHg" color="#8b5cf6" /></Card>
<Card delay={60}><p className="font-semibold text-slate-800 text-sm mb-0.5">🔬 Lab Trends</p><TrendChart data={past7} dataKey="labCr" label="Creatinine" unit="mg/dL" color="#0891B2" dangerAbove={2.0} /><div className="h-px bg-slate-100 my-3" /><TrendChart data={past7} dataKey="labGfr" label="GFR" unit="mL/min" color="#059669" dangerBelow={30} /><div className="h-px bg-slate-100 my-3" /><TrendChart data={past7} dataKey="labK" label="Potassium" unit="mEq/L" color="#EA580C" dangerAbove={5.5} /><div className="h-px bg-slate-100 my-3" /><TrendChart data={past7} dataKey="labPhos" label="Phosphorus" unit="mg/dL" color="#7C3AED" dangerAbove={5.5} /></Card>
<SL title="Past 7 Days" />
{past7.map(({ date, id, log }, i) => { const isT = id === today; if (!log) return <Card key={id} flat delay={i * 30}><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-400">{fmt(date, { weekday: “short”, month: “short”, day: “numeric” })}</p><Badge label="No Data" variant="muted" /></div></Card>; const tasks = [log.weight, log.amTemp, log.amMeds, log.fluidMl >= CL_LIMITS.fluidGoal, log.pmTemp, log.pmMeds].filter(Boolean).length, p = tasks / 6, sym = log.incision || log.nausea || log.pain > 5; return <Card key={id} delay={i * 30} accent={sym ? “#E11D48” : p >= 1 ? “#059669” : undefined}><div className="flex items-center gap-3"><Ring progress={p} size={42} color={p >= 1 ? “#059669” : “#6366F1”}><span className="text-[10px] font-bold text-slate-700">{Math.round(p * 100)}%</span></Ring><div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800">{isT ? “Today” : fmt(date, { weekday: “short”, month: “short”, day: “numeric” })}</p>{p >= 1 && <Badge label="Complete" variant="success" icon="✓" />}{sym && <Badge label="Symptoms" variant="danger" icon="⚠️" />}</div><div className="flex gap-3 mt-1 text-xs text-slate-400 flex-wrap">{log.weight && <span>⚖️{log.weight}lb</span>}{log.amTemp && <span>🌡️{log.amTemp}°</span>}<span>💧{(log.fluidMl / 1000).toFixed(1)}L</span>{log.pain > 0 && <span>😣{log.pain}/10</span>}</div></div></div>{log.notes && <p className="text-xs text-slate-400 mt-2 italic border-t border-slate-50 pt-2">”{log.notes}”</p>}</Card>; })}

  </div>;
}

// ═════════════════════════════════════════════════════════
// ME TAB
// ═════════════════════════════════════════════════════════
function MeTab({ aversions, setAversions, profile, appts, setAppts, onReset }) {
const SURG = profile.surgDate || SURG_DEFAULT;
const ds = dBt(SURG, new Date()), ws = wBt(SURG, new Date()), [foodQ, setFoodQ] = useState(””), [sec, setSec] = useState(“contacts”), [showFilter, setShowFilter] = useState(false);
const cleared = RESTS.filter(r => ws >= r.w).length;
const results = useMemo(() => { if (!foodQ.trim()) return []; const q = foodQ.toLowerCase(); return FOODS.filter(f => !aversions.includes(f.name)).filter(f => f.name.toLowerCase().includes(q) || f.al.some(a => a.includes(q))).sort((a, b) => ({ toxic: 0, avoid: 1, cook_temp: 2, caution: 3, safe: 4 }[a.st] - { toxic: 0, avoid: 1, cook_temp: 2, caution: 3, safe: 4 }[b.st])); }, [foodQ, aversions]);
const cfg = { toxic: { l: “PROHIBITED”, v: “danger”, a: “#E11D48”, e: “☠️” }, avoid: { l: “AVOID”, v: “danger”, a: “#EA580C”, e: “🚫” }, cook_temp: { l: “COOK TEMP”, v: “temp”, a: “#0891B2”, e: “🌡️” }, caution: { l: “CAUTION”, v: “warning”, a: “#D97706”, e: “⚠️” }, safe: { l: “SAFE”, v: “success”, a: “#059669”, e: “✅” } };
const toxic = FOODS.filter(f => f.st === “toxic”), temps = FOODS.filter(f => f.st === “cook_temp”);
const highK = FOODS.filter(f => f.k), highP = FOODS.filter(f => f.p), highS = FOODS.filter(f => f.s);

return <div className="pb-8">
<Card><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center shrink-0 shadow-inner"><span className="text-3xl">🫀</span></div><div className="flex-1"><h2 className="text-xl font-bold text-slate-800">{profile.name}</h2><p className="text-sm text-slate-500">{profile.type} Transplant</p><div className="flex items-center gap-5 mt-3"><div className="text-center"><p className="text-xl font-bold text-slate-800">{ds}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Days</p></div><div className="w-px h-7 bg-slate-200" /><div className="text-center"><p className="text-xl font-bold text-slate-800">{ws}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Weeks</p></div><div className="w-px h-7 bg-slate-200" /><div className="text-center"><p className="text-xl font-bold text-slate-800">{cleared}/{RESTS.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cleared</p></div></div></div></div></Card>

```
<div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 mt-2">{[["contacts", "Team"], ["timeline", "Timeline"], ["food", "Food"], ["settings", "Settings"]].map(([id, l]) => <button key={id} onClick={() => setSec(id)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${sec === id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>{l}</button>)}</div>

{sec === "contacts" && <div>{(profile.contacts || []).map((c, i) => <div key={i} className={`flex items-center gap-3 p-4 bg-white rounded-2xl mb-2 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.99] anim-in ${c.urgent ? "ring-1 ring-rose-200 bg-rose-50/30" : ""}`} style={{ animationDelay: `${i * 25}ms` }}><span className="text-2xl shrink-0">{c.icon}</span><div className="flex-1 min-w-0"><p className={`font-semibold text-sm ${c.urgent ? "text-rose-700" : "text-slate-800"}`}>{c.label}</p><p className="text-xs text-slate-400 truncate">{c.sub}</p></div><span className={`text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-lg shrink-0 ${c.urgent ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>{c.phone}</span></div>)}{(profile.contacts || []).length === 0 && <Card flat><p className="text-sm text-slate-400 text-center">No contacts. Reset and re-run setup to add them.</p></Card>}</div>}

{sec === "timeline" && <Card>{RESTS.map((r, i) => { const done = ws >= r.w, p = cl(ws / r.w, 0, 1), rem = r.w - ws; return <div key={r.id}><div className="flex items-start gap-3 py-2.5"><div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}><span className="text-sm">{done ? "✓" : r.i}</span></div><div className="flex-1 min-w-0"><div className="flex items-center justify-between"><p className={`text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{r.t}</p>{done ? <Badge label="Cleared" variant="success" /> : <span className="text-xs font-semibold text-slate-500">{rem}w</span>}</div><p className="text-xs text-slate-400 mt-0.5">{r.d}</p>{!done && <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-indigo-400 rounded-full transition-all duration-700" style={{ width: `${p * 100}%` }} /></div>}</div></div>{i < RESTS.length - 1 && <div className="w-0.5 h-3 bg-slate-200 ml-[18px]" />}</div>; })}</Card>}

{sec === "food" && <div>
  <div className="flex items-center bg-white rounded-2xl px-4 h-12 mb-3 shadow-sm border border-slate-100 focus-within:border-indigo-300 transition-all"><span className="text-lg mr-3">🔍</span><input value={foodQ} onChange={e => setFoodQ(e.target.value)} placeholder="Search any food..." className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300" />{foodQ && <button onClick={() => setFoodQ("")} className="text-slate-300 hover:text-slate-500 text-lg ml-2">✕</button>}</div>
  <div className="flex items-center justify-between mb-3"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{aversions.length > 0 ? `${aversions.length} hidden` : "No aversions"}</p><button onClick={() => setShowFilter(!showFilter)} className="text-xs text-indigo-500 font-semibold">{showFilter ? "Close" : "⚙️ Aversions"}</button></div>
  {showFilter && <Card flat className="anim-in"><p className="text-xs text-slate-500 mb-2">Tap to hide from search results</p><div className="flex flex-wrap gap-1.5">{FOODS.filter(f => f.st !== "toxic").map(f => <button key={f.name} onClick={() => setAversions(p => p.includes(f.name) ? p.filter(x => x !== f.name) : [...p, f.name])} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${aversions.includes(f.name) ? "bg-slate-300 text-white line-through" : "bg-slate-50 text-slate-600 border border-slate-100"}`}>{f.name}</button>)}</div></Card>}
  {foodQ && results.length === 0 && <Card flat><p className="text-sm text-slate-400 text-center py-2">No results. When in doubt, cook thoroughly to 165°F.</p></Card>}
  {results.map((f, i) => { const c = cfg[f.st]; return <Card key={i} accent={c.a} delay={i * 25}><div className="flex items-start justify-between mb-1"><p className="font-semibold text-sm text-slate-800">{c.e} {f.name}</p><div className="flex gap-1 flex-wrap justify-end">{f.k && <Badge label="K+" variant="potassium" icon="⚡" />}{f.p && <Badge label="Phos" variant="phosphorus" icon="💎" />}{f.s && <Badge label="Na+" variant="sodium" icon="🧂" />}<Badge label={c.l} variant={c.v} /></div></div>{f.cat && <p className="text-[10px] font-semibold text-slate-400 mb-1">{f.cat}</p>}<p className="text-sm text-slate-600">{f.note}</p>{f.temp && <div className="flex items-center gap-2 mt-2 bg-cyan-50 border border-cyan-100 px-3 py-2 rounded-xl"><span>🌡️</span><span className="text-sm font-semibold text-cyan-800">{f.temp}</span></div>}</Card>; })}
  {!foodQ && <div>
    <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-600 mb-2">🌡️ Cooking Temperatures</p>
    <Card accent="#0891B2">{temps.map((f, i) => <div key={i} className={`flex items-center justify-between py-2.5 ${i < temps.length - 1 ? "border-b border-slate-50" : ""}`}><div className="flex items-center gap-2"><span>🌡️</span><span className="text-sm font-medium text-slate-700">{f.name}</span></div><span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100">{f.temp}</span></div>)}</Card>
    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-2 mt-4">⚡ High Potassium (Hyperkalemia Risk)</p>
    <Card accent="#EA580C"><p className="text-[10px] text-slate-400 mb-2">Tacrolimus can raise K+. Monitor intake of these foods.</p><div className="flex flex-wrap gap-1.5">{highK.map((f, i) => <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">{f.name}</span>)}</div></Card>
    <p className="text-[11px] font-bold uppercase tracking-widest text-purple-500 mb-2 mt-4">💎 High Phosphorus</p>
    <Card accent="#7C3AED"><div className="flex flex-wrap gap-1.5">{highP.map((f, i) => <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">{f.name}</span>)}</div></Card>
    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500 mb-2 mt-4">🧂 High Sodium</p>
    <Card accent="#2563EB"><p className="text-[10px] text-slate-400 mb-2">Heart-healthy diet. Watch hidden sodium in processed foods.</p><div className="flex flex-wrap gap-1.5">{highS.map((f, i) => <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">{f.name}</span>)}</div></Card>
    <Card accent="#E11D48" className="mt-3"><p className="font-semibold text-rose-700 text-sm mb-2">☠️ Never Eat — Drug Interactions</p>{toxic.map((f, i) => <div key={i} className="flex items-start gap-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" /><p className="text-sm text-slate-600"><b className="text-slate-700">{f.name}</b> — {f.note}</p></div>)}</Card>
  </div>}
</div>}

{sec === "settings" && <div>
  <SL title="Appointments" right={<span className="text-xs text-slate-400">{(appts||[]).length} saved</span>} />
  {(appts||[]).length === 0 && <Card flat><p className="text-sm text-slate-400 text-center">No appointments added yet.</p></Card>}
  {(appts||[]).map(a => <Card key={a.id} flat><div className="flex justify-between items-start"><div><p className="font-semibold text-sm text-slate-800">{a.doc}</p><p className="text-xs text-slate-500">{a.date} at {a.time} — {a.desc}</p>{a.labBy && <p className="text-xs text-rose-500 mt-1">Labs by {a.labBy}</p>}</div><button onClick={() => setAppts(p => p.filter(x => x.id !== a.id))} className="text-xs text-rose-500 font-semibold shrink-0">Remove</button></div></Card>)}
  <SL title="Data Management" />
  <Card flat><button onClick={onReset} className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200 hover:bg-rose-100 transition-all">Reset All Data & Start Over</button><p className="text-[10px] text-slate-400 text-center mt-2">Erases all data and returns to setup screen.</p></Card>
</div>}

{/* Medical Disclaimer */}
<div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-[10px] text-slate-400 text-center leading-relaxed">This app is a personal tracking tool only. It does not provide medical advice, diagnosis, or treatment. Always follow your transplant team's instructions. In an emergency, call your transplant team or 911.</p></div>
```

  </div>;
}

// ═════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════
const TABS = [{ id: “today”, l: “Today”, i: “🏠” }, { id: “labs”, l: “Labs”, i: “🔬” }, { id: “meds”, l: “Meds”, i: “💊” }, { id: “history”, l: “Trends”, i: “📈” }, { id: “me”, l: “Me”, i: “🫀” }];

export default function App() {
const [tab, setTab] = useState(“today”), [profile, setProfile] = useState(null), [meds, setMeds] = useState([]), [log, setLog] = useState({ …EMPTY }), [past, setPast] = useState({}), [aversions, setAversions] = useState([]), [appts, setAppts] = useState([]), [loaded, setLoaded] = useState(false);
const ref = useRef(null), tid = toId(new Date());

useEffect(() => { (async () => { try { const sp = await S.get(“tt-profile”), sm = await S.get(“tt-meds”), sd = await S.get(“tt-log-date”), sl = await S.get(“tt-log”), sh = await S.get(“tt-past”), sa = await S.get(“tt-aversions”), sap = await S.get(“tt-appts”); if (sp) { sp.surgDate = parseLocalDay(sp.surgDate); setProfile(sp); } if (sm) setMeds(sm); if (sh) setPast(sh); if (sa) setAversions(sa); if (sap) setAppts(sap); if (sd && sd !== tid && sl) { setPast(p => ({ …p, …(sh || {}), [sd]: sl })); setLog({ …EMPTY }); } else if (sl && sd === tid) setLog(sl); } catch (e) { console.error(e); } setLoaded(true); })(); }, [tid]);

useEffect(() => { if (!loaded || !profile) return; S.set(“tt-profile”, { …profile, surgDate: toId(profile.surgDate) }); S.set(“tt-meds”, meds); S.set(“tt-log”, log); S.set(“tt-log-date”, tid); S.set(“tt-past”, past); S.set(“tt-aversions”, aversions); S.set(“tt-appts”, appts); }, [meds, log, past, aversions, appts, loaded, tid, profile]);

useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: “smooth” }); }, [tab]);

const handleSetup = (p) => { setProfile(p); setMeds(INIT_MEDS); setAppts([
{ id: “a1”, date: “2026-02-19”, time: “1:30 PM”, doc: “Dr. Katznelson”, desc: “1 Wk Post-Discharge” },
{ id: “a2”, date: “2026-02-26”, time: “9:30 AM”, doc: “Dr. Sandhu”, desc: “2 Wks Post-Discharge”, labBy: “2026-02-25” },
{ id: “a3”, date: “2026-03-19”, time: “9:30 AM”, doc: “Dr. Peddi”, desc: “4 Wks Post-Discharge”, labBy: “2026-03-18” },
{ id: “a4”, date: “2026-04-20”, time: “9:15 AM”, doc: “Dr. Kung”, desc: “8 Wks Post-Discharge”, labBy: “2026-04-19” },
]); };
const handleReset = async () => { for (const k of [“tt-profile”,“tt-meds”,“tt-log”,“tt-log-date”,“tt-past”,“tt-aversions”,“tt-appts”]) await S.del(k); setProfile(null); setMeds([]); setLog({ …EMPTY }); setPast({}); setAversions([]); setAppts([]); setTab(“today”); };

if (!loaded) return <div className=“h-screen flex flex-col items-center justify-center bg-slate-50” style={{ fontFamily: “-apple-system,BlinkMacSystemFont,‘Segoe UI’,system-ui,sans-serif” }}><div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 animate-pulse"><span className="text-2xl">🫀</span></div><p className="text-sm font-semibold text-slate-400 animate-pulse">Loading…</p></div>;

if (!profile) return <SetupScreen onComplete={handleSetup} />;

const titles = { today: “Transplant Tracker”, labs: “Lab Schedule”, meds: “Medications”, history: “Trends & History”, me: “My Recovery” };

return <div className=“h-screen flex flex-col bg-gray-50 max-w-md mx-auto overflow-hidden” style={{ fontFamily: “-apple-system,BlinkMacSystemFont,‘Segoe UI’,system-ui,sans-serif” }}>
<div className="shrink-0 bg-white/90 backdrop-blur-lg border-b border-slate-100/80 px-5 pt-3 pb-2.5 z-10"><p className="text-sm font-bold text-slate-800 tracking-tight">{titles[tab]}</p></div>
<div ref={ref} className="flex-1 overflow-y-auto overscroll-y-contain px-5 pt-4 scroll-smooth">
{tab === “today” && <TodayTab log={log} sL={setLog} meds={meds} past={past} profile={profile} />}
{tab === “labs” && <LabsTab appts={appts} />}
{tab === “meds” && <MedsTab meds={meds} sM={setMeds} />}
{tab === “history” && <HistoryTab logs={past} tL={log} meds={meds} profile={profile} />}
{tab === “me” && <MeTab aversions={aversions} setAversions={setAversions} profile={profile} appts={appts} setAppts={setAppts} onReset={handleReset} />}
</div>
<div className="shrink-0 bg-white/95 backdrop-blur-lg border-t border-slate-100/80 flex items-center justify-around px-1 py-2 z-10">
{TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${tab === t.id ? "bg-indigo-50" : ""}`}><span className={`transition-all ${tab === t.id ? "text-xl scale-110" : "text-lg opacity-45"}`}>{t.i}</span><span className={`text-[9px] font-semibold ${tab === t.id ? "text-indigo-600" : "text-slate-400"}`}>{t.l}</span></button>)}
</div>
<style>{`@keyframes si{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fi{from{opacity:0}to{opacity:1}}.anim-in{animation:si .4s cubic-bezier(.16,1,.3,1) both}.anim-up{animation:su .35s cubic-bezier(.16,1,.3,1)}.anim-fade{animation:fi .2s ease}input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none}input[type="number"]{-moz-appearance:textfield}*{-webkit-tap-highlight-color:transparent}::-webkit-scrollbar{width:0}textarea::-webkit-scrollbar{width:0}`}</style>

  </div>;
}