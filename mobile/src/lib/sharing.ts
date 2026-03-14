import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import S from '@/utils/storage';
import { toId, addD } from '@/utils/dates';
import type { Profile, Medication, DailyLog, MedDose } from '@/data/types';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function vitalsRows(logs: { date: Date; log: DailyLog | null }[]): string {
  const rows = logs
    .filter(p => p.log)
    .map(p => {
      const l = p.log!;
      return `
        <tr>
          <td>${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td>${l.weight || '—'}</td>
          <td>${l.amTemp || '—'} / ${l.pmTemp || '—'}</td>
          <td>${l.amSys ? `${l.amSys}/${l.amDia}` : '—'} / ${l.pmSys ? `${l.pmSys}/${l.pmDia}` : '—'}</td>
          <td>${l.amHr || '—'} / ${l.pmHr || '—'}</td>
          <td>${l.fluidMl ? `${l.fluidMl} mL` : '—'}</td>
        </tr>`;
    }).join('');
  return rows || '<tr><td colspan="6" style="text-align:center;color:#888;">No data recorded</td></tr>';
}

function labRows(logs: { date: Date; log: DailyLog | null }[]): string {
  const rows = logs
    .filter(p => p.log && (p.log.labCr || p.log.labTac || p.log.labGfr))
    .map(p => {
      const l = p.log!;
      return `
        <tr>
          <td>${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td>${l.labCr || '—'}</td>
          <td>${l.labTac || '—'}</td>
          <td>${l.labGfr || '—'}</td>
          <td>${l.labPhos || '—'}</td>
          <td>${l.labK || '—'}</td>
          <td>${l.labGlu || '—'}</td>
        </tr>`;
    }).join('');
  return rows || '<tr><td colspan="7" style="text-align:center;color:#888;">No lab data recorded</td></tr>';
}

function medRows(meds: Medication[]): string {
  return meds.map(m => `
    <tr>
      <td>${m.name}</td>
      <td>${m.dosage || '—'}</td>
      <td>${m.instr || '—'}</td>
      <td>${m.critical ? '⭐ Critical' : 'Standard'}</td>
      <td>${Math.floor(m.inv / m.ppd)} days</td>
    </tr>
  `).join('');
}

async function adherenceRows(meds: Medication[], days: Date[]): Promise<string> {
  if (!meds.length) return '<tr><td colspan="3" style="text-align:center;color:#888;">No medications tracked</td></tr>';
  // Batch-load all days in parallel to avoid sequential storage calls (N×M → N)
  const dayDosesMap = new Map<string, MedDose[]>();
  await Promise.all(days.map(async d => {
    const key = toId(d);
    const doses: MedDose[] = (await S.get(`doses_${key}`)) ?? [];
    dayDosesMap.set(key, doses);
  }));
  const rows: string[] = [];
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
    rows.push(`<tr><td>${med.name}</td><td>${taken}/${total} doses</td><td>${pct}%</td></tr>`);
  }
  return rows.join('');
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
        <td>${l.wellbeingNotes || '—'}</td>
      </tr>`;
    }).join('');
  return rows || '<tr><td colspan="5" style="text-align:center;color:#888;">No wellbeing data recorded</td></tr>';
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
  const name = profile?.name || 'Patient';
  const transplantType = profile?.type || 'Transplant';
  const surgDate = profile?.surgDate ? fmtDate(new Date(profile.surgDate)) : 'Unknown';
  const adherenceHtml = await adherenceRows(meds, allDates);
  const wellbeingHtml = wellbeingRows(recentPoints);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; font-size: 13px; }
    h1 { color: #4f46e5; font-size: 22px; margin-bottom: 4px; }
    h2 { color: #334155; font-size: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
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

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Health Report',
      UTI: 'com.adobe.pdf',
    });
  }
}
