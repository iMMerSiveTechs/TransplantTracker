import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import S from '@/utils/storage';
import { toId, addD } from '@/utils/dates';
import { LAB_R } from '@/data/clinicalLimits';
import type { Profile, Medication, DailyLog, MedDose } from '@/data/types';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Escape user-supplied strings before embedding in HTML to prevent markup injection.
function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Trend arrow: compare current vs previous creatinine value
function trendArrow(current: string, previous: string | undefined): string {
  if (!previous || !current) return '';
  const cur = parseFloat(current);
  const prev = parseFloat(previous);
  if (isNaN(cur) || isNaN(prev)) return '';
  const diff = cur - prev;
  if (diff > 0.2) return ' <span style="color:#E11D48;font-weight:700;">↑</span>';
  if (diff < -0.2) return ' <span style="color:#047857;font-weight:700;">↓</span>';
  return ' <span style="color:#64748B;">→</span>';
}

// Reference range annotation for a given lab key and value
function refAnnotation(labKey: keyof typeof LAB_R, value: string): string {
  if (!value) return '';
  const ref = LAB_R[labKey];
  if (!ref) return '';
  const [lo, hi] = ref.green;
  const rangeStr = hi >= 900 ? `${lo}+ ${ref.unit}` : `${lo}–${hi} ${ref.unit}`;
  return ` <small style="color:#64748B">(ref: ${rangeStr})</small>`;
}

function vitalsRows(logs: { date: Date; log: DailyLog | null }[]): string {
  const rows = logs
    .filter(p => p.log)
    .map(p => {
      const l = p.log!;
      return `
        <tr>
          <td>${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td>${esc(l.weight) || '—'}</td>
          <td>${esc(l.amTemp) || '—'} / ${esc(l.pmTemp) || '—'}</td>
          <td>${l.amSys ? `${esc(l.amSys)}/${esc(l.amDia)}` : '—'} / ${l.pmSys ? `${esc(l.pmSys)}/${esc(l.pmDia)}` : '—'}</td>
          <td>${esc(l.amHr) || '—'} / ${esc(l.pmHr) || '—'}</td>
          <td>${l.fluidMl ? `${l.fluidMl} mL` : '—'}</td>
        </tr>`;
    }).join('');
  return rows || '<tr><td colspan="6" style="text-align:center;color:#888;">No data recorded</td></tr>';
}

function labRows(logs: { date: Date; log: DailyLog | null }[]): string {
  // Build array of logs with lab data for trend comparison
  const withLabs = logs.filter(p => p.log && (p.log.labCr || p.log.labTac || p.log.labGfr));

  const rows = withLabs
    .map((p, idx) => {
      const l = p.log!;
      const prevLog = idx > 0 ? withLabs[idx - 1].log : null;

      const crArrow = trendArrow(l.labCr, prevLog?.labCr);
      const tacArrow = trendArrow(l.labTac, prevLog?.labTac);
      const gfrArrow = trendArrow(l.labGfr, prevLog?.labGfr);

      return `
        <tr>
          <td>${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td>${l.labCr ? `${esc(l.labCr)}${crArrow}${refAnnotation('labCr', l.labCr)}` : '—'}</td>
          <td>${l.labTac ? `${esc(l.labTac)}${tacArrow}${refAnnotation('labTac', l.labTac)}` : '—'}</td>
          <td>${l.labGfr ? `${esc(l.labGfr)}${gfrArrow}${refAnnotation('labGfr', l.labGfr)}` : '—'}</td>
          <td>${l.labPhos ? `${esc(l.labPhos)}${refAnnotation('labPhos', l.labPhos)}` : '—'}</td>
          <td>${l.labK ? `${esc(l.labK)}${refAnnotation('labK', l.labK)}` : '—'}</td>
          <td>${l.labGlu ? `${esc(l.labGlu)}${refAnnotation('labGlu', l.labGlu)}` : '—'}</td>
        </tr>`;
    }).join('');
  return rows || '<tr><td colspan="7" style="text-align:center;color:#888;">No lab data recorded</td></tr>';
}

function medRows(meds: Medication[]): string {
  return meds.map(m => {
    const daysLeft = m.ppd > 0 ? Math.floor(m.inv / m.ppd) : null;
    const supplyStr = daysLeft !== null ? `${daysLeft} days` : '—';
    return `
    <tr>
      <td>${esc(m.name)}</td>
      <td>${esc(m.dosage || '—')}</td>
      <td>${esc(m.instr || '—')}</td>
      <td>${m.critical ? 'Critical' : 'Standard'}</td>
      <td>${supplyStr}</td>
    </tr>
  `;
  }).join('');
}

async function adherenceRows(meds: Medication[], days: Date[]): Promise<{ html: string; avgPct: number }> {
  if (!meds.length) return {
    html: '<tr><td colspan="3" style="text-align:center;color:#888;">No medications tracked</td></tr>',
    avgPct: 0,
  };
  // Batch-load all days in parallel to avoid sequential storage calls (N×M → N)
  const dayDosesMap = new Map<string, MedDose[]>();
  await Promise.all(days.map(async d => {
    const key = toId(d);
    const doses: MedDose[] = (await S.get(`doses_${key}`)) ?? [];
    dayDosesMap.set(key, doses);
  }));
  const rows: string[] = [];
  let totalTaken = 0;
  let totalDoses = 0;
  for (const med of meds) {
    let taken = 0;
    let total = 0;
    for (const d of days) {
      const doses = dayDosesMap.get(toId(d)) ?? [];
      const count = doses.filter(dose => dose.medId === med.id).length;
      taken += Math.min(count, med.ppd);
      total += med.ppd;
    }
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    totalTaken += taken;
    totalDoses += total;
    rows.push(`<tr><td>${esc(med.name)}</td><td>${taken}/${total} doses</td><td>${pct}%</td></tr>`);
  }
  const avgPct = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;
  return { html: rows.join(''), avgPct };
}

function wellbeingRows(logs: { date: Date; log: DailyLog | null }[]): string {
  const moodLabels = ['', 'Very Low', 'Low', 'Neutral', 'Good', 'Great'];
  const stressLabels = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];
  const rows = logs
    .filter(p => p.log && (p.log.mood > 0 || p.log.sleepQuality > 0 || p.log.stressLevel > 0))
    .map(p => {
      const l = p.log!;
      return `<tr>
        <td>${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td>${l.mood > 0 ? moodLabels[l.mood] : '—'}</td>
        <td>${l.sleepQuality > 0 ? `${l.sleepQuality}/5` : '—'}</td>
        <td>${l.stressLevel > 0 ? stressLabels[l.stressLevel] : '—'}</td>
        <td>${esc(l.wellbeingNotes) || '—'}</td>
      </tr>`;
    }).join('');
  return rows || '<tr><td colspan="5" style="text-align:center;color:#888;">No wellbeing data recorded</td></tr>';
}

function symptomSummaryRows(logs: { date: Date; log: DailyLog | null }[]): string {
  // Tally symptom frequency over period
  const symptomMap: Record<string, number> = {
    Nausea: 0,
    Fatigue: 0,
    Swelling: 0,
    'Shortness of Breath': 0,
    'Incision Issues': 0,
    'Urine Decrease': 0,
    'Acid Reflux': 0,
    Bloating: 0,
    Diarrhea: 0,
    Constipation: 0,
    Tenderness: 0,
    Edema: 0,
    Pain: 0,
  };

  for (const p of logs) {
    if (!p.log) continue;
    const l = p.log;
    if (l.nausea) symptomMap['Nausea']++;
    if (l.fatigue) symptomMap['Fatigue']++;
    if (l.swelling) symptomMap['Swelling']++;
    if (l.shortnessOfBreath) symptomMap['Shortness of Breath']++;
    if (l.incision) symptomMap['Incision Issues']++;
    if (l.urineDown) symptomMap['Urine Decrease']++;
    if (l.acidReflux) symptomMap['Acid Reflux']++;
    if (l.bloating) symptomMap['Bloating']++;
    if (l.diarrhea) symptomMap['Diarrhea']++;
    if (l.constipation) symptomMap['Constipation']++;
    if (l.tenderness) symptomMap['Tenderness']++;
    if (l.edema) symptomMap['Edema']++;
    if (l.pain > 0) symptomMap['Pain']++;
  }

  const reported = Object.entries(symptomMap).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  if (!reported.length) {
    return '<tr><td colspan="3" style="text-align:center;color:#888;">No symptoms reported in this period</td></tr>';
  }
  return reported.map(([symptom, count]) => {
    const total = logs.filter(p => p.log).length || 1;
    const pct = Math.round((count / total) * 100);
    const color = pct >= 50 ? '#E11D48' : pct >= 20 ? '#B45309' : '#64748B';
    return `<tr>
      <td>${symptom}</td>
      <td>${count} day${count !== 1 ? 's' : ''}</td>
      <td style="color:${color};font-weight:600;">${pct}%</td>
    </tr>`;
  }).join('');
}

// Build executive summary alerts string
function buildSummaryAlerts(logs: { date: Date; log: DailyLog | null }[], avgPct: number): string {
  let feverDays = 0;
  let weightAlertDays = 0;
  let bpAlertDays = 0;
  let symptomDays = 0;

  const weightValues: number[] = [];

  for (const p of logs) {
    if (!p.log) continue;
    const l = p.log;
    // Fever check
    const amT = parseFloat(l.amTemp);
    const pmT = parseFloat(l.pmTemp);
    if ((!isNaN(amT) && amT >= 100.5) || (!isNaN(pmT) && pmT >= 100.5)) feverDays++;
    // BP alert
    const amSys = parseFloat(l.amSys);
    const pmSys = parseFloat(l.pmSys);
    if ((!isNaN(amSys) && amSys >= 160) || (!isNaN(pmSys) && pmSys >= 160)) bpAlertDays++;
    // Weight
    const w = parseFloat(l.weight);
    if (!isNaN(w)) weightValues.push(w);
    // Symptoms
    const hasSymptom = l.nausea || l.fatigue || l.swelling || l.shortnessOfBreath || l.incision || l.urineDown || l.pain > 0;
    if (hasSymptom) symptomDays++;
  }

  // Weight gain alert: flag if gained >2 lbs in any consecutive pair
  for (let i = 1; i < weightValues.length; i++) {
    if (weightValues[i] - weightValues[i - 1] > 2) { weightAlertDays++; }
  }

  const parts: string[] = [];
  if (feverDays > 0) parts.push(`⚠️ Fever: ${feverDays} day${feverDays !== 1 ? 's' : ''}`);
  if (bpAlertDays > 0) parts.push(`🩺 BP High: ${bpAlertDays} day${bpAlertDays !== 1 ? 's' : ''}`);
  if (weightAlertDays > 0) parts.push(`⚖️ Weight Spike: ${weightAlertDays} day${weightAlertDays !== 1 ? 's' : ''}`);
  if (symptomDays > 0) parts.push(`🤒 Symptoms: ${symptomDays} day${symptomDays !== 1 ? 's' : ''}`);
  parts.push(`💊 Avg Adherence: ${avgPct}%`);

  return parts.join(' · ');
}

// Latest lab values summary for executive box
function buildLatestLabSummary(logs: { date: Date; log: DailyLog | null }[]): string {
  // Find latest entry with each key
  const latest: Partial<Record<'labCr' | 'labTac' | 'labGfr' | 'labK', string>> = {};
  for (const p of [...logs].reverse()) {
    if (!p.log) continue;
    if (!latest.labCr && p.log.labCr) latest.labCr = p.log.labCr;
    if (!latest.labTac && p.log.labTac) latest.labTac = p.log.labTac;
    if (!latest.labGfr && p.log.labGfr) latest.labGfr = p.log.labGfr;
    if (!latest.labK && p.log.labK) latest.labK = p.log.labK;
  }
  const items: string[] = [];
  if (latest.labCr) items.push(`Creatinine: ${latest.labCr} mg/dL`);
  if (latest.labTac) items.push(`TAC: ${latest.labTac} ng/mL`);
  if (latest.labGfr) items.push(`GFR: ${latest.labGfr} mL/min`);
  if (latest.labK) items.push(`K+: ${latest.labK} mEq/L`);
  return items.length ? items.join(' · ') : 'No recent lab values';
}

export async function generateAndShareReport(): Promise<void> {
  const profile: Profile | null = await S.get('profile');
  const meds: Medication[] = (await S.get('medications')) || [];

  const today = new Date();
  const points: { date: Date; log: DailyLog | null }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = addD(today, -i);
    const log = await S.get(`log_${toId(d)}`);
    points.push({ date: d, log });
  }

  const recentPoints = points.slice(-7);
  const allDates = points.map(p => p.date);
  const name = esc(profile?.name || 'Patient');
  const transplantType = esc(profile?.type || 'Transplant');
  const surgDate = esc(profile?.surgDate ? fmtDate(new Date(profile.surgDate)) : 'Unknown');
  const { html: adherenceHtml, avgPct } = await adherenceRows(meds, allDates);
  const wellbeingHtml = wellbeingRows(recentPoints);
  const symptomHtml = symptomSummaryRows(points);

  const summaryAlerts = buildSummaryAlerts(points, avgPct);
  const latestLabSummary = buildLatestLabSummary(points);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; font-size: 13px; }
    h1 { color: #4f46e5; font-size: 22px; margin-bottom: 4px; }
    h2 { color: #334155; font-size: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
    h3 { color: #334155; font-size: 13px; margin: 0 0 8px 0; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .critical { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .profile-item { background: #f8fafc; padding: 12px; border-radius: 8px; }
    .profile-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
    .profile-value { font-size: 16px; font-weight: 700; color: #1e293b; }
    .summary-box { background: #eff6ff; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
    .summary-alerts { font-size: 12px; color: #334155; line-height: 20px; margin-top: 6px; }
    .summary-labs { font-size: 11px; color: #64748b; margin-top: 6px; }
  </style>
</head>
<body>

  <h1>🫀 Transplant Recovery Report</h1>
  <div class="meta">Generated on ${fmtDate(today)} · ${transplantType} Transplant</div>

  <div class="profile-grid">
    <div class="profile-item">
      <div class="profile-label">Patient Name</div>
      <div class="profile-value">${name}</div>
    </div>
    <div class="profile-item">
      <div class="profile-label">Transplant Type</div>
      <div class="profile-value">${transplantType}</div>
    </div>
    <div class="profile-item">
      <div class="profile-label">Surgery Date</div>
      <div class="profile-value">${surgDate}</div>
    </div>
    <div class="profile-item">
      <div class="profile-label">Report Period</div>
      <div class="profile-value">Last 30 Days</div>
    </div>
  </div>

  <div class="summary-box">
    <h3>Executive Summary</h3>
    <div class="summary-alerts">${summaryAlerts}</div>
    <div class="summary-labs">Latest Labs: ${latestLabSummary}</div>
  </div>

  <h2>📊 Vitals — Last 7 Days</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Weight (lbs)</th>
        <th>Temp AM/PM (°F)</th>
        <th>BP AM/PM (mmHg)</th>
        <th>HR AM/PM (bpm)</th>
        <th>Fluids</th>
      </tr>
    </thead>
    <tbody>
      ${vitalsRows(recentPoints)}
    </tbody>
  </table>

  <h2>🧪 Lab Values — Last 30 Days</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Creatinine (mg/dL)</th>
        <th>Tacrolimus (ng/mL)</th>
        <th>GFR (mL/min)</th>
        <th>Phos (mg/dL)</th>
        <th>K+ (mEq/L)</th>
        <th>Glucose (mg/dL)</th>
      </tr>
    </thead>
    <tbody>
      ${labRows(points)}
    </tbody>
  </table>

  <h2>💊 Current Medications</h2>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Dosage</th>
        <th>Instructions</th>
        <th>Type</th>
        <th>Supply Remaining</th>
      </tr>
    </thead>
    <tbody>
      ${medRows(meds)}
    </tbody>
  </table>

  <h2>✅ Medication Adherence — Last 30 Days</h2>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Doses Taken</th>
        <th>Adherence</th>
      </tr>
    </thead>
    <tbody>
      ${adherenceHtml}
    </tbody>
  </table>

  <h2>🤒 Symptom Summary — Last 30 Days</h2>
  <table>
    <thead>
      <tr>
        <th>Symptom</th>
        <th>Days Reported</th>
        <th>Frequency</th>
      </tr>
    </thead>
    <tbody>
      ${symptomHtml}
    </tbody>
  </table>

  <h2>🧠 Wellbeing — Last 7 Days</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Mood</th>
        <th>Sleep</th>
        <th>Stress</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${wellbeingHtml}
    </tbody>
  </table>

  <div class="footer">
    This report was generated by the Transplant Tracker app for informational purposes only.<br>
    Always consult your transplant team before making any changes to your medications or care plan.
  </div>

</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Health Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device.');
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Export failed. Please try again.');
  }
}
