# TransplantTracker — Manual QA Matrix

**Device targets:** iPhone (primary), iPad (secondary)
**Build type:** Development (Expo Go or dev build)
**Use Dev Tools:** Profile tab → 🛠 Dev Tools to seed data and trigger tests

---

## Setup Before Testing

1. Open Dev Tools → **Clear All Vault Data** → confirm
2. Open Dev Tools → **Seed Demo Patient** (Alex Chen, Kidney, 90 days)
3. Open Dev Tools → **Seed Medications**
4. Open Dev Tools → **Seed 7 Days of Logs**
5. Force-quit and reopen the app
6. Verify: app opens to Today tab (not setup screen)

---

## BLOCK 1 — Onboarding & Profile

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 1.1 | Clear vault → open app | Setup/onboarding screen shown | ☐ |
| 1.2 | Complete setup → tap Done | Redirects to Today tab | ☐ |
| 1.3 | Profile tab → edit name, type, surgery date → save | Changes persist after kill/reopen | ☐ |
| 1.4 | Add 2 contacts with phone numbers → save | Contacts appear on profile | ☐ |
| 1.5 | Tap Call on a contact | Phone dialer opens with correct number | ☐ |
| 1.6 | Delete a contact | Contact removed immediately | ☐ |

---

## BLOCK 2 — Today Tab: Daily Log

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 2.1 | Enter weight, AM temp, AM BP, AM HR | Values save without errors | ☐ |
| 2.2 | Kill app → reopen → Today tab | All entered values present | ☐ |
| 2.3 | Enter PM vitals | AM and PM shown separately, no overwrite | ☐ |
| 2.4 | Enter temp >101.0°F | Fever alert appears in red | ☐ |
| 2.5 | Enter BP systolic >160 or <90 | BP alert appears in orange | ☐ |
| 2.6 | Tap fluid buttons (+250, +500, +750) | Total increments correctly, progress bar updates | ☐ |
| 2.7 | Tap pain scale 0 through 10 | Selected button highlights, value saves | ☐ |
| 2.8 | Tap pain level 5 then tap again | Toggles correctly (stays at 5) | ☐ |
| 2.9 | Check symptoms (incision, nausea, etc.) | Checkboxes toggle, card turns red when active | ☐ |
| 2.10 | Enter wellbeing check-in (mood, sleep, stress, notes) | All save correctly | ☐ |
| 2.11 | Navigate away to Meds → return to Today | Values unchanged (no data loss on focus) | ☐ |

---

## BLOCK 3 — Tacrolimus Timer

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 3.1 | Today tab with no tac dose logged | Shows "Tap when you take your dose" with Log Dose button | ☐ |
| 3.2 | Tap "Log Dose" on Today tab | Timer starts counting down from 12:00:00 | ☐ |
| 3.3 | Timer counting — verify real-time update | Seconds tick down every second | ☐ |
| 3.4 | Log tac dose on **Meds tab** → return to Today | Timer resets/updates to reflect Meds tab dose | ☐ |
| 3.5 | Log tac dose on Meds tab → undo it → return to Today | Timer reverts to previous state (or clears if first dose) | ☐ |
| 3.6 | Set phone clock 13 hours ahead (simulate overdue) | Timer shows "!" ring, red alert, "Xh Ym overdue — take now" | ☐ |
| 3.7 | Tap "Take Now" when overdue | Timer resets to 12:00:00 countdown | ☐ |
| 3.8 | Kill app → reopen | Timer continues from correct last-taken time | ☐ |

---

## BLOCK 4 — Medications Tab

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 4.1 | Seed meds → open Meds tab | 3 meds shown: Tacrolimus, CellCept, Prednisone | ☐ |
| 4.2 | Tap "+ Add Med" → fill form → save | New med appears in list | ☐ |
| 4.3 | Edit medication name → save | Updated name shown, old notification name does NOT fire with old name (test with notification) | ☐ |
| 4.4 | Log dose for each med | Dose count increments, inventory decrements by 1 | ☐ |
| 4.5 | Log all required doses (ppd met) | Shows "Done ✓" badge, can no longer tap Log Dose | ☐ |
| 4.6 | Tap Undo after logging dose | Dose removed, inventory restored by 1, "Taken at" time gone | ☐ |
| 4.7 | Manually adjust inventory (-N, +30) | Inventory cannot go below 0; +30 works correctly | ☐ |
| 4.8 | Open edit modal → tap "Remove Medication" | Confirmation shown ("Remove X? This cannot be undone.") | ☐ |
| 4.9 | Confirm remove | Med gone, notification canceled, no orphaned data | ☐ |
| 4.10 | Cancel remove | Med still present | ☐ |
| 4.11 | No meds at all | Shows "No medications added yet" empty state | ☐ |
| 4.12 | Kill app → reopen → Meds tab | All meds, inventory, and dose counts correct | ☐ |

---

## BLOCK 5 — Notifications

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 5.1 | Enable reminder on a med → set time → toggle On | Bell shows 🔔 "Reminders On" | ☐ |
| 5.2 | Disable reminder → toggle Off | Bell shows 🔕 "Reminders Off" | ☐ |
| 5.3 | Enable reminder, deny permission when prompted | Toast appears: "Notification permission required" | ☐ |
| 5.4 | Dev Tools → Trigger Test Notification | Notification fires in ~10 seconds with correct title/body | ☐ |
| 5.5 | Enable reminder at a time, edit med name → save | Notification fires with NEW name at NEW time | ☐ |
| 5.6 | Delete med with reminder enabled | Notification is canceled (does not fire later) | ☐ |
| 5.7 | Kill app completely → wait for reminder time | Notification fires while app is closed | ☐ |

---

## BLOCK 6 — Lab Results Tab

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 6.1 | Enter Creatinine, GFR, Tacrolimus level, K+, Phos, Glucose | Values save correctly | ☐ |
| 6.2 | Enter Creatinine >1.5 | Badge shows DANGER, field border red | ☐ |
| 6.3 | Enter TAC level within range | Badge shows appropriate NORMAL/WARNING/DANGER | ☐ |
| 6.4 | Kill app → reopen → Labs tab | All lab values present | ☐ |
| 6.5 | Tap "📎 Attach" button | File picker opens | ☐ |
| 6.6 | Attach a PDF | File appears under "Attached Lab Files — Reference only" with "reference only" subtitle | ☐ |
| 6.7 | Verify NO implication of automatic parsing | No text implies OCR or auto-extraction happened | ☐ |
| 6.8 | Remove attached file | File removed from list | ☐ |
| 6.9 | Navigate away → return to Labs | Lab values unchanged (no data loss on focus) | ☐ |

---

## BLOCK 7 — History & Trends

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 7.1 | Seed 7 days of logs → open History | Charts populate with data | ☐ |
| 7.2 | Weight trend chart | Shows 7 data points, no NaN values | ☐ |
| 7.3 | BP trend chart | Shows AM/PM correctly | ☐ |
| 7.4 | No data at all | "No data yet" shown in each chart (not crash, not blank) | ☐ |
| 7.5 | History with only 1 day of data | Chart shows single point without errors | ☐ |

---

## BLOCK 8 — Export / Share

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 8.1 | Profile tab → tap Share | Report generates, share sheet opens | ☐ |
| 8.2 | Verify report includes: patient name, surgery date, transplant type | All present in report header | ☐ |
| 8.3 | Verify vitals section | Last 7 days of vitals (or "No data") | ☐ |
| 8.4 | Verify lab values section | Last 30 days of labs (or "No data") | ☐ |
| 8.5 | Verify medications section | All meds with dosage and supply | ☐ |
| 8.6 | Verify adherence section | Percentages correct (no NaN, no Infinity) | ☐ |
| 8.7 | Export with NO data at all (fresh install) | Report shows "No data recorded" in each section — does NOT crash | ☐ |
| 8.8 | Export with profile name set to empty | Report shows "Patient" fallback | ☐ |
| 8.9 | Cancel share sheet | App returns to Profile tab, no crash, no stuck state | ☐ |
| 8.10 | Tap Share while previous share is in progress | Second tap does nothing (button disabled) | ☐ |

---

## BLOCK 9 — Midnight & Rollover

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 9.1 | Fill Today tab vitals → advance device clock to next day | Navigate away and back → Today tab shows empty EMPTY_LOG | ☐ |
| 9.2 | Old vitals after rollover | Old vitals accessible in History, NOT overwritten | ☐ |
| 9.3 | Log dose on day X → advance clock to day X+1 | Meds tab shows 0 doses for new day | ☐ |
| 9.4 | Labs tab after rollover | Lab fields clear for new day, old data in history | ☐ |

---

## BLOCK 10 — Background / Foreground / Kill

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 10.1 | Fill Today tab → background app (home button) → foreground | Data unchanged | ☐ |
| 10.2 | Fill vitals → force kill app → reopen | Data persisted | ☐ |
| 10.3 | TacTimer running → background app for 5 min → foreground | Timer shows correct time (not frozen) | ☐ |
| 10.4 | Log lab → kill app → reopen → Labs | Lab values present | ☐ |
| 10.5 | Log doses → kill app → reopen → Meds | Dose counts match, inventory correct | ☐ |

---

## BLOCK 11 — Accessibility

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 11.1 | Enable VoiceOver → navigate Today tab | Pain scale buttons read "Pain level 0" through "Pain level 10" | ☐ |
| 11.2 | VoiceOver → fluid buttons | Reads "Add 250 milliliters of fluid" etc. | ☐ |
| 11.3 | VoiceOver → TacTimer Log Dose | Reads "Log tacrolimus dose" | ☐ |
| 11.4 | VoiceOver → NumberField inputs | Reads field label (e.g., "Weight", "Creatinine") | ☐ |
| 11.5 | iOS Settings → Accessibility → Larger Text → max size | App text scales or at minimum does not overlap/break layout fatally | ☐ |
| 11.6 | Pain scale on smallest iPhone SE | All 11 buttons remain tappable (minHeight 44pt) | ☐ |

---

## BLOCK 12 — Privacy & Trust Posture

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 12.1 | Attach lab file → verify UI language | No text implies OCR or automatic extraction | ☐ |
| 12.2 | Check Expo logs during normal use | No patient vitals or med names printed to console | ☐ |
| 12.3 | Check all alert/banner text | No claims of diagnosis, no "your kidney is ___" medical conclusions | ☐ |
| 12.4 | Fever alert text | Says "Contact your team if above 101.5°F" — not "You have a fever" | ☐ |
| 12.5 | BP alert text | Says "Monitor closely and contact team" — not a diagnosis | ☐ |
| 12.6 | Export footer | Includes "for informational purposes only. Always consult your transplant team." | ☐ |

---

## DEV Tools Validation

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| D.1 | Profile tab → 🛠 Dev Tools visible in dev build | Button appears | ☐ |
| D.2 | Dev Tools hidden in production build | Button NOT shown | ☐ |
| D.3 | Seed Demo Patient | Alex Chen profile with 3 contacts | ☐ |
| D.4 | Seed 7 Days Logs → check History | 7 days of charts visible | ☐ |
| D.5 | Test Notification → wait 10s | Notification fires | ☐ |
| D.6 | Test Export | Share sheet opens with PDF | ☐ |
| D.7 | Storage Inspector | Shows all storage keys | ☐ |
| D.8 | Clear All Vault | Confirmation dialog → clears → app shows setup | ☐ |

---

## Release Gate Criteria

All items in Blocks 1–6 and 8 must PASS before submission.
Block 7 (History): minimum 3/5 must pass.
Block 9 (Rollover): must test manually with clock advancement.
Block 11 (Accessibility): items 11.1–11.4 are required.
Block 12 (Privacy): all required — these protect the app's medical credibility.

**DO NOT submit if any of these have known failures:**
- 2.2 (data persistence after kill)
- 3.4 (tac timer cross-tab sync)
- 3.5 (undo reverts timer)
- 4.9 (delete removes med correctly)
- 5.4 (test notification fires)
- 6.7 (no misleading lab import language)
- 8.7 (export doesn't crash with no data)
- 12.3 (no diagnosis claims in UI)
