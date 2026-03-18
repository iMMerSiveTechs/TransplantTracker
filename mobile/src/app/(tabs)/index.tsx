import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import { EMPTY_LOG, type DailyLog, type MedDose, type Medication } from '@/data/types';
import { CL_LIMITS } from '@/data/clinicalLimits';
import { toId, fmtDate, greet, dBt, getSurgDefault, addD } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import NumberField from '@/components/NumberField';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import SymCheck from '@/components/SymCheck';
import TacTimer from '@/components/TacTimer';
import Alrt from '@/components/Alert';
import Ring from '@/components/Ring';

export default function TodayScreen() {
  const [log, setLog] = useState<DailyLog>(EMPTY_LOG);
  const [loaded, setLoaded] = useState<boolean>(false);
  // Track whether we've received real data from storage (or confirmed it's absent)
  const [logFromStorage, setLogFromStorage] = useState<boolean>(false);
  // Track the date key the log was loaded for — used to detect midnight rollovers
  const [loadedDateKey, setLoadedDateKey] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [medsDone, setMedsDone] = useState<number>(0);
  const [medsTotal, setMedsTotal] = useState<number>(0);
  const [prevWeight, setPrevWeight] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date();
  const surgDate = profile?.surgDate ? new Date(profile.surgDate) : getSurgDefault();
  const daysSince = dBt(surgDate, today);

  const loadMedCompliance = useCallback(async () => {
    const currentId = toId(new Date());
    const meds: Medication[] = (await S.get('medications')) ?? [];
    const doses: MedDose[] = (await S.get(`doses_${currentId}`)) ?? [];
    const total = meds.reduce((sum, m) => sum + m.ppd, 0);
    const done = meds.reduce((sum, m) => {
      const taken = doses.filter(d => d.medId === m.id).length;
      return sum + Math.min(taken, m.ppd);
    }, 0);
    setMedsTotal(total);
    setMedsDone(done);
  }, []);

  const loadDayLog = useCallback(async () => {
    const currentId = toId(new Date());
    const savedLog = await S.get(`log_${currentId}`);
    if (savedLog) {
      // Merge with EMPTY_LOG so fields added in later app versions have safe defaults
      // for users whose old storage is missing those fields.
      setLog({ ...EMPTY_LOG, ...savedLog });
      setLogFromStorage(true);
    } else {
      setLog(EMPTY_LOG);
      setLogFromStorage(false);
    }
    // Load yesterday's weight for gain comparison
    const yesterday = toId(addD(new Date(), -1));
    const prevLog = await S.get(`log_${yesterday}`);
    setPrevWeight(prevLog?.weight ?? null);
    setLoadedDateKey(currentId);
    setLoaded(true);
  }, []);

  // On initial mount: load today's log and profile
  useEffect(() => {
    async function load() {
      const savedProfile = await S.get('profile');
      if (savedProfile) setProfile(savedProfile);
      await loadDayLog();
    }
    load();
  }, []);

  // On focus: refresh med compliance ring and reload daily log.
  // Always reload (not just on date change) so cross-tab writes (e.g. Meds → lastTacTime)
  // and midnight rollovers are picked up immediately.
  useFocusEffect(useCallback(() => {
    loadMedCompliance();
    loadDayLog();
  }, [loadMedCompliance, loadDayLog]));

  useEffect(() => {
    // Only persist if the user has made a change (log was modified after initial load,
    // or we have confirmed there is no prior data and the user entered something).
    // Never overwrite storage with EMPTY_LOG just because storage returned null.
    if (!loaded) return;
    const currentId = toId(new Date());
    // Do not write yesterday's data to today's key after a midnight rollover.
    // The save is safe once loadedDateKey matches the current day.
    if (loadedDateKey && loadedDateKey !== currentId) return;
    const isEmpty = JSON.stringify(log) === JSON.stringify(EMPTY_LOG);
    if (!logFromStorage && isEmpty) return;
    S.set(`log_${currentId}`, log).then(saved => {
      if (!saved) Burnt.toast({ title: 'Could not save vitals', preset: 'error' });
    });
  }, [log, loaded]);

  const upd = (k: keyof DailyLog, v: any) => setLog({ ...log, [k]: v });

  // Physiologically impossible upper bounds — reject values above these to prevent
  // absurd entries (e.g. weight 99999) from polluting charts and shared reports.
  const VITAL_MAX: Partial<Record<keyof DailyLog, number>> = {
    weight: 999, amTemp: 115, pmTemp: 115,
    amSys: 300, pmSys: 300, amDia: 200, pmDia: 200, amHr: 300, pmHr: 300,
  };
  const updVital = (k: keyof DailyLog, v: string) => {
    const n = parseFloat(v);
    const max = VITAL_MAX[k];
    if (v !== '' && !isNaN(n) && max !== undefined && n > max) {
      Burnt.toast({ title: `Value too high — check entry`, preset: 'error' });
      return;
    }
    upd(k, v);
  };

  // Validation helpers
  const amTempNum = parseFloat(log.amTemp);
  const pmTempNum = parseFloat(log.pmTemp);
  const amSysNum = parseFloat(log.amSys);
  const pmSysNum = parseFloat(log.pmSys);
  const amHrNum = parseFloat(log.amHr);
  const pmHrNum = parseFloat(log.pmHr);

  // Guard isNaN: parseFloat("") or parseFloat(undefined) returns NaN.
  // NaN comparisons always return false, so the alert would silently never fire.
  const validTemps = [amTempNum, pmTempNum].filter(n => !isNaN(n));
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : 0;
  const hasFever = validTemps.some(t => t >= CL_LIMITS.feverWarning);
  const hasBpIssue = (!isNaN(amSysNum) && (amSysNum > CL_LIMITS.bpSysHigh || amSysNum < CL_LIMITS.bpSysLow)) ||
                     (!isNaN(pmSysNum) && (pmSysNum > CL_LIMITS.bpSysHigh || pmSysNum < CL_LIMITS.bpSysLow));

  const fluidPct = (log.fluidMl / CL_LIMITS.fluidGoal) * 100;
  const hasSymptoms = log.incision || log.nausea || log.urineDown || log.burning || log.pain > 0;

  const todayWt = parseFloat(log.weight);
  const yestWt = parseFloat(prevWeight ?? '');
  const weightGainAmt = !isNaN(todayWt) && !isNaN(yestWt) ? todayWt - yestWt : 0;
  const hasWeightGain = weightGainAmt >= CL_LIMITS.weightGainAlert;

  const handleTacTaken = () => {
    upd('lastTacTime', Date.now());
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greet(profile?.name?.split(' ')[0] || 'there')}</Text>
          <Text style={styles.date}>{fmtDate(today)}</Text>
        </View>
        <Badge label={`Day ${daysSince}`} variant="info" icon="📅" />
      </View>

      {/* Alerts */}
      {hasFever ? (
        <Alrt
          icon="🌡️"
          title="Temperature Warning"
          msg={`Fever detected (${maxTemp.toFixed(1)}°F). Contact your team if above 101.5°F.`}
          variant="danger"
        />
      ) : null}
      {hasBpIssue ? (
        <Alrt
          icon="⚠️"
          title="Blood Pressure Alert"
          msg="BP outside normal range. Monitor closely and contact team if persistent."
          variant="warning"
        />
      ) : null}
      {hasWeightGain ? (
        <Alrt
          icon="⚖️"
          title="Weight Gain Alert"
          msg={`You gained ${weightGainAmt.toFixed(1)} lbs since yesterday. Sudden weight gain can indicate fluid retention — contact your transplant team.`}
          variant="warning"
        />
      ) : null}

      {/* Tacrolimus Timer */}
      <TacTimer lastTacTime={log.lastTacTime} onTake={handleTacTaken} />

      {/* Medication Compliance */}
      {medsTotal > 0 ? (
        <Pressable onPress={() => router.push('/(tabs)/meds')}>
          <Card>
            <View style={styles.complianceRow}>
              <Ring progress={medsTotal > 0 ? medsDone / medsTotal : 0} size={60} color={medsDone >= medsTotal ? colors.emerald500 : colors.indigo500}>
                <Text style={[styles.complianceRingText, medsDone >= medsTotal && styles.complianceRingDone]}>
                  {medsDone >= medsTotal ? '✓' : `${medsDone}/${medsTotal}`}
                </Text>
              </Ring>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.complianceTitle}>Today's Adherence</Text>
                <Text style={styles.complianceSub}>
                  {medsDone >= medsTotal
                    ? 'All required doses logged'
                    : `${medsTotal - medsDone} dose${medsTotal - medsDone === 1 ? '' : 's'} remaining`}
                </Text>
              </View>
              <Text style={styles.complianceCta}>Open{'\n'}Medications</Text>
            </View>
          </Card>
        </Pressable>
      ) : null}

      {/* Daily Vitals */}
      <SectionLabel title="Daily Vitals" />
      <Card>
        <View style={styles.row}>
          <NumberField
            label="Weight"
            value={log.weight}
            onChange={(v) => updVital('weight', v)}
            unit="lbs"
          />
        </View>
      </Card>

      {/* Morning Vitals */}
      <SectionLabel title="Morning Vitals" />
      <Card>
        <View style={styles.row}>
          <NumberField
            label="Temp"
            value={log.amTemp}
            onChange={(v) => updVital('amTemp', v)}
            unit="°F"
            error={amTempNum >= CL_LIMITS.feverWarning}
          />
          <View style={{ width: 12 }} />
          <NumberField
            label="BP Systolic"
            value={log.amSys}
            onChange={(v) => updVital('amSys', v)}
            unit="mmHg"
            error={(amSysNum > CL_LIMITS.bpSysHigh) || (amSysNum < CL_LIMITS.bpSysLow)}
          />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <NumberField
            label="BP Diastolic"
            value={log.amDia}
            onChange={(v) => updVital('amDia', v)}
            unit="mmHg"
          />
          <View style={{ width: 12 }} />
          <NumberField
            label="Heart Rate"
            value={log.amHr}
            onChange={(v) => updVital('amHr', v)}
            unit="bpm"
            error={(amHrNum > CL_LIMITS.hrHigh) || (amHrNum < CL_LIMITS.hrLow)}
          />
        </View>
      </Card>

      {/* Evening Vitals */}
      <SectionLabel title="Evening Vitals" />
      <Card>
        <View style={styles.row}>
          <NumberField
            label="Temp"
            value={log.pmTemp}
            onChange={(v) => updVital('pmTemp', v)}
            unit="°F"
            error={pmTempNum >= CL_LIMITS.feverWarning}
          />
          <View style={{ width: 12 }} />
          <NumberField
            label="BP Systolic"
            value={log.pmSys}
            onChange={(v) => updVital('pmSys', v)}
            unit="mmHg"
            error={(pmSysNum > CL_LIMITS.bpSysHigh) || (pmSysNum < CL_LIMITS.bpSysLow)}
          />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <NumberField
            label="BP Diastolic"
            value={log.pmDia}
            onChange={(v) => updVital('pmDia', v)}
            unit="mmHg"
          />
          <View style={{ width: 12 }} />
          <NumberField
            label="Heart Rate"
            value={log.pmHr}
            onChange={(v) => updVital('pmHr', v)}
            unit="bpm"
            error={(pmHrNum > CL_LIMITS.hrHigh) || (pmHrNum < CL_LIMITS.hrLow)}
          />
        </View>
      </Card>

      {/* Fluid Intake */}
      <SectionLabel title="Fluid Intake" sub={`Goal: ${CL_LIMITS.fluidGoal} mL/day`} />
      <Card>
        <View style={styles.fluidHeader}>
          <Text style={styles.fluidValue}>{log.fluidMl} mL</Text>
          <Badge
            label={`${Math.round(fluidPct)}%`}
            variant={fluidPct >= 100 ? 'success' : fluidPct >= 75 ? 'info' : 'warning'}
          />
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressBar, { width: `${Math.min(fluidPct, 100)}%` }]} />
        </View>
        <View style={styles.fluidButtons}>
          {[250, 500, 750].map((amt) => (
            <Pressable
              key={amt}
              style={styles.fluidBtn}
              accessibilityLabel={`Add ${amt} milliliters of fluid`}
              onPress={() => upd('fluidMl', log.fluidMl + amt)}
            >
              <Text style={styles.fluidBtnText}>+{amt} mL</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Symptoms */}
      <SectionLabel title="Symptoms" />
      <Card accent={hasSymptoms ? colors.rose400 : undefined}>
        <SymCheck label="Incision issues" checked={log.incision} onPress={() => upd('incision', !log.incision)} />
        <SymCheck label="Nausea/vomiting" checked={log.nausea} onPress={() => upd('nausea', !log.nausea)} />
        <SymCheck label="Decreased urination" checked={log.urineDown} onPress={() => upd('urineDown', !log.urineDown)} />
        <SymCheck label="Burning with urination" checked={log.burning} onPress={() => upd('burning', !log.burning)} />
        <View style={{ height: 12 }} />
        <Text style={styles.painLabel}>Pain Level (0 = none): {log.pain}/10</Text>
        <View style={styles.painScale}>
          {[...Array(11)].map((_, i) => {
            const painColor = i === 0 ? '#10B981' : i <= 3 ? '#F59E0B' : i <= 6 ? '#F97316' : '#E11D48';
            const isActive = log.pain === i;
            return (
              <Pressable
                key={i}
                style={[styles.painBtn, isActive ? { backgroundColor: painColor, borderColor: painColor } : null]}
                accessibilityLabel={`Pain level ${i}`}
                accessibilityRole="button"
                onPress={() => upd('pain', i)}
              >
                <Text style={[styles.painBtnText, isActive && styles.painBtnTextActive]}>{i}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* GI Symptoms */}
      <SectionLabel title="GI Symptoms" />
      <Card>
        <SymCheck label="Acid reflux" checked={log.acidReflux} onPress={() => upd('acidReflux', !log.acidReflux)} color="amber" />
        <SymCheck label="Gas" checked={log.gas} onPress={() => upd('gas', !log.gas)} color="amber" />
        <SymCheck label="Bloating" checked={log.bloating} onPress={() => upd('bloating', !log.bloating)} color="amber" />
        <SymCheck label="Diarrhea" checked={log.diarrhea} onPress={() => upd('diarrhea', !log.diarrhea)} color="amber" />
        <SymCheck label="Constipation" checked={log.constipation} onPress={() => upd('constipation', !log.constipation)} color="amber" />
        <SymCheck label="Tenderness" checked={log.tenderness} onPress={() => upd('tenderness', !log.tenderness)} color="amber" />
        <SymCheck label="Swelling" checked={log.swelling} onPress={() => upd('swelling', !log.swelling)} color="amber" />
      </Card>

      {/* Wellbeing Check-in */}
      <SectionLabel title="Wellbeing Check-in" />
      <Card accent={colors.indigo400}>
        <Text style={styles.wbLabel}>Mood</Text>
        <View style={styles.wbRow}>
          {(['😞', '😕', '😐', '🙂', '😊'] as const).map((emoji, i) => (
            <Pressable
              key={i}
              style={[styles.wbBtn, log.mood === i + 1 && styles.wbBtnActive]}
              onPress={() => upd('mood', log.mood === i + 1 ? 0 : i + 1)}
            >
              <Text style={styles.wbEmoji}>{emoji}</Text>
              <Text style={styles.wbScale}>{['Bad', 'Low', 'OK', 'Good', 'Great'][i]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.wbLabel}>Sleep Quality</Text>
        <View style={styles.wbRow}>
          {(['😴', '🥱', '😐', '😌', '🌟'] as const).map((emoji, i) => (
            <Pressable
              key={i}
              style={[styles.wbBtn, log.sleepQuality === i + 1 && styles.wbBtnActive]}
              onPress={() => upd('sleepQuality', log.sleepQuality === i + 1 ? 0 : i + 1)}
            >
              <Text style={styles.wbEmoji}>{emoji}</Text>
              <Text style={styles.wbScale}>{['Poor', 'Fair', 'OK', 'Good', 'Great'][i]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.wbLabel}>Stress Level</Text>
        <View style={styles.wbRow}>
          {(['😌', '🙂', '😐', '😰', '🤯'] as const).map((emoji, i) => (
            <Pressable
              key={i}
              style={[styles.wbBtn, log.stressLevel === i + 1 && styles.wbBtnActive]}
              onPress={() => upd('stressLevel', log.stressLevel === i + 1 ? 0 : i + 1)}
            >
              <Text style={styles.wbEmoji}>{emoji}</Text>
              <Text style={styles.wbScale}>{['None', 'Low', 'Mid', 'High', 'Max'][i]}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.wbNotes}
          placeholder="Any notes about how you're feeling..."
          placeholderTextColor={colors.slate400}
          value={log.wellbeingNotes}
          onChangeText={(v) => upd('wellbeingNotes', v)}
          multiline
          maxLength={500}
        />
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  date: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  row: { flexDirection: 'row' },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medLabel: { fontSize: 14, fontWeight: '500', color: colors.slate700 },
  fluidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fluidValue: { fontSize: 20, fontWeight: '700', color: colors.slate800 },
  progressBg: { height: 12, backgroundColor: colors.slate200, borderRadius: 999, overflow: 'hidden', marginBottom: 16 },
  progressBar: { height: '100%', backgroundColor: colors.indigo500, borderRadius: 999 },
  fluidButtons: { flexDirection: 'row', gap: 8 },
  fluidBtn: { flex: 1, minHeight: 44, backgroundColor: colors.indigo500, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fluidBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  painLabel: { fontSize: 12, fontWeight: '600', color: colors.slate600, marginBottom: 8 },
  painScale: { flexDirection: 'row', gap: 3 },
  painBtn: { flex: 1, minHeight: 44, paddingVertical: 8, backgroundColor: colors.slate100, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.slate200 },
  painBtnActive: { backgroundColor: colors.rose500, borderColor: colors.rose500 },
  painBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  painBtnTextActive: { color: colors.white },
  complianceRow: { flexDirection: 'row', alignItems: 'center' },
  complianceRingText: { fontSize: 11, fontWeight: '700', color: colors.slate700 },
  complianceRingDone: { fontSize: 18, fontWeight: '800', color: colors.emerald700 },
  complianceTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  complianceSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  complianceCta: { fontSize: 10, fontWeight: '600', color: colors.indigo500, textAlign: 'right', lineHeight: 15 },
  wbLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 12 },
  wbRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  wbBtn: { flex: 1, paddingVertical: 8, backgroundColor: colors.slate100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.slate200, minHeight: 52 },
  wbBtnActive: { backgroundColor: colors.indigo50, borderColor: colors.indigo400 },
  wbEmoji: { fontSize: 20 },
  wbScale: { fontSize: 8, fontWeight: '600', color: colors.slate400, marginTop: 2 },
  wbNotes: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, fontSize: 14, color: colors.slate700, minHeight: 60, textAlignVertical: 'top' },
});
