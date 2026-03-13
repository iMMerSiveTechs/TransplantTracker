import React from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '../data/colors';
import { CL_LIMITS } from '../data/clinicalLimits';
import { RESTS } from '../data/restrictions';
import { LAB_R, labClr } from '../data/labTests';
import { greet, fmtDate, toId, addD, dBt, wBt, cl, fastTn, nxLab, getLabType, fmtWd, SURG_DEFAULT } from '../utils/dates';
import type { DailyLog, Medication, Profile } from '../data/types';

import Badge from '../components/Badge';
import Card from '../components/Card';
import Ring from '../components/Ring';
import Alrt from '../components/Alert';
import NumberField from '../components/NumberField';
import BigCheck from '../components/BigCheck';
import SymCheck from '../components/SymCheck';
import SectionLabel from '../components/SectionLabel';
import TacTimer from '../components/TacTimer';

interface TodayTabProps {
  log: DailyLog;
  setLog: React.Dispatch<React.SetStateAction<DailyLog>>;
  meds: Medication[];
  past: Record<string, DailyLog>;
  profile: Profile;
}

export default function TodayTab({ log, setLog, meds, past, profile }: TodayTabProps) {
  const SURG = profile.surgDate || SURG_DEFAULT;
  const ds = dBt(SURG, new Date());
  const ws = wBt(SURG, new Date());
  const fast = fastTn();
  const nl = nxLab();
  const fPct = cl(log.fluidMl / CL_LIMITS.fluidGoal, 0, 1);
  const mDone = !!(log.weight && log.amTemp);
  const tasks = [log.weight, log.amTemp, log.amMeds, log.fluidMl >= CL_LIMITS.fluidGoal, log.pmTemp, log.pmMeds].filter(Boolean).length;
  const pct = tasks / 6;
  const lowM = meds.filter(m => m.ppd > 0 && m.inv / m.ppd <= CL_LIMITS.lowMedDays);
  const actR = RESTS.filter(r => ws < r.w);
  const hasTac = meds.some(m => m.isTac);

  // Clinical Rules Engine
  const alerts: { v: string; i: string; t: string; m: string }[] = [];
  const yId = toId(addD(new Date(), -1));
  const yLog = past?.[yId] || null;

  // Weight gain
  if (log.weight && yLog && yLog.weight) {
    const diff = parseFloat(log.weight) - parseFloat(yLog.weight);
    if (diff >= CL_LIMITS.weightGainAlert)
      alerts.push({ v: 'danger', i: '\u2696\uFE0F', t: 'Weight Gain Alert', m: `+${diff.toFixed(1)} lbs since yesterday.\nREPORT A WEIGHT GAIN OF 2 POUNDS OR MORE PER DAY.` });
  }

  // Evaluate vitals
  const evalV = (sys: string, hr: string, temp: string, period: string) => {
    const s = parseFloat(sys), h = parseFloat(hr), te = parseFloat(temp);
    if (te >= CL_LIMITS.feverDanger)
      alerts.push({ v: 'danger', i: '\u{1F321}\uFE0F', t: `${period} Fever \u2014 ${te}\u00B0F`, m: `REPORT TEMPERATURES OF ${CL_LIMITS.feverDanger} OR GREATER ASAP.${profile.emergPhone ? `\nCall: ${profile.emergPhone}` : ''}` });
    else if (te >= CL_LIMITS.feverWarning)
      alerts.push({ v: 'warning', i: '\u{1F321}\uFE0F', t: `${period} Elevated \u2014 ${te}\u00B0F`, m: `Monitor closely. Call if it reaches ${CL_LIMITS.feverDanger}\u00B0F.` });
    if (s > CL_LIMITS.bpSysHigh || h > CL_LIMITS.hrHigh)
      alerts.push({ v: 'warning', i: '\u{1F4C8}', t: `High ${period} Vitals`, m: `BP > ${CL_LIMITS.bpSysHigh} or HR > ${CL_LIMITS.hrHigh}.\nTAKE ALL MEDS, wait 45 minutes, retake.\nIf still high, REPORT.` });
    else if ((s > 0 && s < CL_LIMITS.bpSysLow) || (h > 0 && h < CL_LIMITS.hrLow))
      alerts.push({ v: 'warning', i: '\u{1F4C9}', t: `Low ${period} Vitals`, m: `BP < ${CL_LIMITS.bpSysLow} or HR < ${CL_LIMITS.hrLow}.\nHOLD BLOOD PRESSURE MEDS.\nTake all other meds & REPORT.` });
  };
  evalV(log.amSys, log.amHr, log.amTemp, 'Morning');
  evalV(log.pmSys, log.pmHr, log.pmTemp, 'Evening');

  const hasSymptom = log.incision || log.nausea || (log.pain > 7) || log.tenderness || log.swelling;
  const todayLabType = getLabType(new Date());

  const sL = (updater: (prev: DailyLog) => DailyLog) => setLog(updater);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text style={styles.greeting}>{greet(profile.name)}</Text>
          <Text style={styles.dateText}>{fmtDate(new Date())}</Text>
        </View>
        <Ring progress={pct} size={52} color={pct >= 1 ? '#059669' : '#6366F1'}>
          <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
        </Ring>
      </View>
      <View style={styles.dayBadge}>
        <Text style={styles.dayBadgeText}>Day {ds} {'\u00B7'} Week {ws}</Text>
      </View>

      {/* Clinical Alerts */}
      {alerts.map((a, i) => <Alrt key={i} icon={a.i} title={a.t} msg={a.m} variant={a.v as any} />)}
      {hasSymptom ? <Alrt icon="\u{1F6A8}" title="Symptoms Reported" msg="You logged symptoms that may need attention." variant="danger" /> : null}
      {fast ? <Alrt icon="\u{1F319}" title="Fasting Tonight" msg={`Lab draw tomorrow (${fmtWd(nl)}). Stop eating at midnight.\nWater & pain meds OK. Labs BEFORE morning meds.`} variant="warning" /> : null}
      {lowM.length > 0 && <Alrt icon="\u{1F4E6}" title={`${lowM.length} Med${lowM.length > 1 ? 's' : ''} Running Low`} msg={lowM.map(m => m.name).join(', ')} variant="warning" />}

      {/* Tac Timer */}
      {hasTac ? <TacTimer lastTacTime={log.lastTacTime} onTake={() => sL(prev => ({ ...prev, lastTacTime: Date.now() }))} /> : null}

      {/* Morning Check-In */}
      <SectionLabel title="Morning Check-In" sub="Before AM medications" right={mDone ? <Badge label="Saved" variant="success" icon={"\u2713"} /> : <Badge label="Required" variant="warning" icon={"\u23F3"} />} />
      <Card accent={alerts.some(a => a.t.includes('Morning') || a.t.includes('Weight')) ? '#E11D48' : undefined}>
        <View style={styles.inputRow}>
          <NumberField label="Weight" value={log.weight} onChange={v => sL(p => ({ ...p, weight: v }))} unit="lbs" />
          <NumberField label="Temperature" value={log.amTemp} onChange={v => sL(p => ({ ...p, amTemp: v }))} unit={"\u00B0F"} error={parseFloat(log.amTemp) >= CL_LIMITS.feverDanger} />
        </View>
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <NumberField label="BP Sys" value={log.amSys} onChange={v => sL(p => ({ ...p, amSys: v }))} placeholder="120" />
          <Text style={styles.slash}>/</Text>
          <NumberField label="Dia" value={log.amDia} onChange={v => sL(p => ({ ...p, amDia: v }))} placeholder="80" />
          <NumberField label="HR" value={log.amHr} onChange={v => sL(p => ({ ...p, amHr: v }))} unit="bpm" />
        </View>
      </Card>

      {/* AM Meds */}
      <Card style={!mDone ? { opacity: 0.5 } : undefined}>
        <View style={styles.medRow}>
          <View style={styles.flex1}>
            <Text style={styles.medTitle}>{'\u{1F48A}'} Morning Medications</Text>
            {!mDone && <Text style={styles.unlockText}>Complete vitals to unlock</Text>}
            {log.amMeds ? <Text style={styles.takenText}>Taken {'\u2713'}</Text> : null}
          </View>
          <BigCheck checked={log.amMeds} disabled={!mDone} onPress={() => sL(p => ({ ...p, amMeds: !p.amMeds }))} />
        </View>
      </Card>

      {/* Lab Results */}
      {todayLabType ? (
        <View>
          <SectionLabel title="Lab Results" sub={todayLabType === 'yellow' ? 'Twice-weekly draw' : todayLabType.includes('pink') ? 'Monthly draw + urine' : 'Protocol'} />
          <Card accent={todayLabType === 'yellow' ? '#EAB308' : '#EC4899'}>
            <Text style={styles.labHint}>Enter values as received. Colors = target ranges.</Text>
            <View style={styles.inputRow}>
              <View style={styles.flex1}>
                <NumberField label="Creatinine" value={log.labCr} onChange={v => sL(p => ({ ...p, labCr: v }))} unit="mg/dL" />
                {log.labCr ? <View style={styles.badgeWrap}><Badge label={LAB_R.cr.note} variant={labClr('cr', log.labCr) as any} /></View> : null}
              </View>
              <View style={styles.flex1}>
                <NumberField label="Tacrolimus" value={log.labTac} onChange={v => sL(p => ({ ...p, labTac: v }))} unit="ng/mL" />
                {log.labTac ? <View style={styles.badgeWrap}><Badge label={LAB_R.tac.note} variant={labClr('tac', log.labTac) as any} /></View> : null}
              </View>
            </View>
            <View style={[styles.inputRow, { marginTop: 8 }]}>
              <View style={styles.flex1}>
                <NumberField label="GFR" value={log.labGfr} onChange={v => sL(p => ({ ...p, labGfr: v }))} unit="mL/min" />
                {log.labGfr ? <View style={styles.badgeWrap}><Badge label={LAB_R.gfr.note} variant={labClr('gfr', log.labGfr) as any} /></View> : null}
              </View>
              <View style={styles.flex1}>
                <NumberField label="Glucose" value={log.labGlu} onChange={v => sL(p => ({ ...p, labGlu: v }))} unit="mg/dL" />
                {log.labGlu ? <View style={styles.badgeWrap}><Badge label={LAB_R.glu.note} variant={labClr('glu', log.labGlu) as any} /></View> : null}
              </View>
            </View>
            <View style={[styles.inputRow, { marginTop: 8 }]}>
              <View style={styles.flex1}>
                <NumberField label="Potassium" value={log.labK} onChange={v => sL(p => ({ ...p, labK: v }))} unit="mEq/L" />
                {log.labK ? <View style={styles.badgeWrap}><Badge label={LAB_R.k.note} variant={labClr('k', log.labK) as any} /></View> : null}
              </View>
              <View style={styles.flex1}>
                <NumberField label="Phosphorus" value={log.labPhos} onChange={v => sL(p => ({ ...p, labPhos: v }))} unit="mg/dL" />
                {log.labPhos ? <View style={styles.badgeWrap}><Badge label={LAB_R.phos.note} variant={labClr('phos', log.labPhos) as any} /></View> : null}
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Hydration */}
      <SectionLabel title="Hydration" sub={`Goal: ${(CL_LIMITS.fluidGoal / 1000).toFixed(1)} liters`} />
      <Card>
        <View style={styles.hydrationRow}>
          <Ring progress={fPct} size={72} color={fPct >= 0.66 ? '#059669' : fPct >= 0.33 ? '#D97706' : '#E11D48'}>
            <Text style={styles.hydrationVal}>{(log.fluidMl / 1000).toFixed(1)}</Text>
            <Text style={styles.hydrationUnit}>liters</Text>
          </Ring>
          <View style={styles.fluidBtns}>
            {[{ ml: 250, i: '\u{1F964}', l: '250ml' }, { ml: 500, i: '\u{1FAD7}', l: '500ml' }, { ml: 350, i: '\u2615', l: '350ml' }].map(b => (
              <Pressable key={b.l} onPress={() => sL(p => ({ ...p, fluidMl: Math.min(p.fluidMl + b.ml, 5000) }))} style={styles.fluidBtn}>
                <Text style={styles.fluidBtnIcon}>{b.i}</Text>
                <Text style={styles.fluidBtnLabel}>+{b.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${cl(fPct * 100, 0, 100)}%` }]} />
        </View>
      </Card>

      {/* Evening */}
      <SectionLabel title="Evening Check-In" sub="Before PM medications" right={log.pmMeds ? <Badge label="Done" variant="success" icon={"\u2713"} /> : undefined} />
      <Card accent={alerts.some(a => a.t.includes('Evening')) ? '#E11D48' : undefined}>
        <View style={styles.inputRow}>
          <NumberField label="Temperature" value={log.pmTemp} onChange={v => sL(p => ({ ...p, pmTemp: v }))} unit={"\u00B0F"} error={parseFloat(log.pmTemp) >= CL_LIMITS.feverDanger} />
          <NumberField label="HR" value={log.pmHr} onChange={v => sL(p => ({ ...p, pmHr: v }))} unit="bpm" />
        </View>
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <NumberField label="BP Sys" value={log.pmSys} onChange={v => sL(p => ({ ...p, pmSys: v }))} placeholder="120" />
          <Text style={styles.slash}>/</Text>
          <NumberField label="Dia" value={log.pmDia} onChange={v => sL(p => ({ ...p, pmDia: v }))} placeholder="80" />
        </View>
        <View style={styles.divider} />
        <View style={styles.medRow}>
          <Text style={styles.medTitle}>{'\u{1F48A}'} Evening Medications</Text>
          <BigCheck checked={log.pmMeds} onPress={() => sL(p => ({ ...p, pmMeds: !p.pmMeds }))} />
        </View>
      </Card>

      {/* Symptoms */}
      <SectionLabel title="Symptom Check" />
      <Card>
        <Text style={styles.symHeader}>REJECTION / WOUND</Text>
        {([['incision', 'Incision redness, drainage, or swelling'], ['tenderness', 'Tenderness over transplant area'], ['swelling', 'New swelling in legs or abdomen'], ['urineDown', 'Decreased urine output'], ['burning', 'Burning / pain with urination']] as [keyof DailyLog, string][]).map(([k, l]) => (
          <SymCheck key={k} label={l} checked={!!log[k]} onPress={() => sL(p => ({ ...p, [k]: !p[k] }))} />
        ))}
        <View style={styles.divider} />
        <Text style={styles.giHeader}>GI TRACT</Text>
        {([['acidReflux', 'Acid reflux / heartburn'], ['gas', 'Gas / bloating'], ['nausea', 'Nausea / vomiting'], ['diarrhea', 'Diarrhea'], ['constipation', 'Constipation']] as [keyof DailyLog, string][]).map(([k, l]) => (
          <SymCheck key={k} label={l} checked={!!log[k]} onPress={() => sL(p => ({ ...p, [k]: !p[k] }))} color="amber" />
        ))}
        <View style={styles.divider} />
        <Text style={styles.appetiteLabel}>APPETITE</Text>
        <View style={styles.appetiteRow}>
          {(['poor', 'reduced', 'normal', 'good'] as const).map(a => (
            <Pressable key={a} onPress={() => sL(p => ({ ...p, appetite: a }))} style={[styles.appetiteBtn, log.appetite === a ? styles.appetiteBtnActive : styles.appetiteBtnInactive]}>
              <Text style={[styles.appetiteBtnText, log.appetite === a ? styles.appetiteBtnTextActive : undefined]}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.painLabel}>Pain level</Text>
        <View style={styles.painRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <Pressable key={n} onPress={() => sL(p => ({ ...p, pain: n }))} style={[styles.painBtn, n <= log.pain ? (n <= 3 ? styles.painGreen : n <= 6 ? styles.painAmber : styles.painRose) : styles.painInactive]}>
              <Text style={[styles.painBtnText, n <= log.pain ? { color: colors.white } : undefined]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Notes */}
      <SectionLabel title="Daily Notes" />
      <Card>
        <TextInput
          value={log.notes}
          onChangeText={v => sL(p => ({ ...p, notes: v }))}
          placeholder="How are you feeling?"
          placeholderTextColor={colors.slate300}
          multiline
          style={styles.notesInput}
        />
      </Card>

      {/* Active Restrictions */}
      {actR.length > 0 && (
        <View>
          <SectionLabel title="Active Restrictions" sub={`${actR.length} active`} />
          <Card flat>
            {actR.slice(0, 3).map(r => {
              const prog = cl(ws / r.w, 0, 1);
              return (
                <View key={r.id} style={styles.restRow}>
                  <Text style={styles.restIcon}>{r.i}</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.restTitle}>{r.t}</Text>
                    <View style={styles.restBar}>
                      <View style={[styles.restBarFill, { width: `${prog * 100}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.restWeeks}>{r.w - ws > 0 ? `${r.w - ws}w` : '\u2713'}</Text>
                </View>
              );
            })}
            {actR.length > 3 && <Text style={styles.moreText}>+{actR.length - 3} more</Text>}
          </Card>
        </View>
      )}

      {/* Emergency */}
      {profile.emergPhone ? (
        <View style={styles.emergBanner}>
          <Text style={styles.emergText}>{'\u{1F6A8}'} Emergency: {profile.emergPhone}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  flex1: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.slate800, letterSpacing: -0.5 },
  dateText: { fontSize: 14, color: colors.slate400, marginTop: 4 },
  ringPct: { fontSize: 12, fontWeight: '700', color: colors.slate700 },
  dayBadge: { backgroundColor: 'rgba(241,245,249,0.8)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 20 },
  dayBadgeText: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  inputRow: { flexDirection: 'row', gap: 12 },
  slash: { fontSize: 20, color: colors.slate300, alignSelf: 'flex-end', marginBottom: 8 },
  medRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  unlockText: { fontSize: 12, color: colors.amber500, marginTop: 4 },
  takenText: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  labHint: { fontSize: 12, color: colors.slate400, marginBottom: 12 },
  badgeWrap: { marginTop: 4 },
  hydrationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hydrationVal: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  hydrationUnit: { fontSize: 9, color: colors.slate400, marginTop: -2 },
  fluidBtns: { flexDirection: 'row', gap: 8 },
  fluidBtn: { alignItems: 'center', backgroundColor: colors.slate50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.slate100 },
  fluidBtnIcon: { fontSize: 18 },
  fluidBtnLabel: { fontSize: 10, fontWeight: '600', color: colors.slate500, marginTop: 2 },
  progressBar: { height: 10, backgroundColor: colors.slate100, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.indigo400 },
  divider: { height: 1, backgroundColor: colors.slate100, marginVertical: 12 },
  symHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.rose400, marginBottom: 4 },
  giHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.amber500, marginBottom: 4 },
  appetiteLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.slate400, marginBottom: 4 },
  appetiteRow: { flexDirection: 'row', gap: 8 },
  appetiteBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  appetiteBtnActive: { backgroundColor: colors.indigo500 },
  appetiteBtnInactive: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate100 },
  appetiteBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate500, textTransform: 'capitalize' },
  appetiteBtnTextActive: { color: colors.white },
  painLabel: { fontSize: 14, color: colors.slate600, marginBottom: 8 },
  painRow: { flexDirection: 'row', gap: 4 },
  painBtn: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  painGreen: { backgroundColor: colors.emerald400 },
  painAmber: { backgroundColor: colors.amber400 },
  painRose: { backgroundColor: colors.rose500 },
  painInactive: { backgroundColor: colors.slate100 },
  painBtnText: { fontSize: 12, fontWeight: '700', color: colors.slate400 },
  notesInput: { height: 80, backgroundColor: colors.slate50, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, padding: 12, fontSize: 14, color: colors.slate700, textAlignVertical: 'top' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  restIcon: { fontSize: 18 },
  restTitle: { fontSize: 14, fontWeight: '500', color: colors.slate700 },
  restBar: { height: 4, backgroundColor: colors.slate100, borderRadius: 999, marginTop: 6, overflow: 'hidden' },
  restBarFill: { height: '100%', backgroundColor: colors.indigo400, borderRadius: 999 },
  restWeeks: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  moreText: { fontSize: 12, color: colors.slate400, textAlign: 'center', marginTop: 8 },
  emergBanner: { marginTop: 24, backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: 16, padding: 16, alignItems: 'center' },
  emergText: { fontSize: 14, fontWeight: '600', color: colors.rose700 },
});
