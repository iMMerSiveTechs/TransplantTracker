import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '@/data/colors';
import { CL_LIMITS } from '@/data/clinicalLimits';
import { addD, toId } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import TrendChart from '@/components/TrendChart';
import type { DailyLog } from '@/data/types';

interface DataPoint {
  date: Date;
  log: DailyLog | null;
}

const SYMPTOM_KEYS = ['incision','nausea','urineDown','burning','acidReflux','gas','bloating','diarrhea','constipation','tenderness','swelling','edema','fatigue'] as const;
const SYMPTOM_LABELS: Record<string, string> = {
  incision: 'Incision issues', nausea: 'Nausea', urineDown: 'Decreased urination',
  burning: 'Burning urination', acidReflux: 'Acid reflux', gas: 'Gas', bloating: 'Bloating',
  diarrhea: 'Diarrhea', constipation: 'Constipation', tenderness: 'Tenderness',
  swelling: 'Swelling', edema: 'Edema', fatigue: 'Fatigue',
};

type SymFreq = { key: string; label: string; count: number; pct: number };

export default function HistoryScreen() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [symFreq, setSymFreq] = useState<SymFreq[]>([]);
  const [avgWeight, setAvgWeight] = useState<number | null>(null);
  const [avgMood, setAvgMood] = useState<number | null>(null);
  const [avgSleep, setAvgSleep] = useState<number | null>(null);
  const [avgFluid, setAvgFluid] = useState<number | null>(null);

  const load = useCallback(async () => {
    const today = new Date();
    const points: DataPoint[] = [];

    // Load last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = addD(today, -i);
      const dateId = toId(date);
      const log = await S.get(`log_${dateId}`);
      points.push({ date, log });
    }

    setDataPoints(points);
    setLoaded(true);

    // Compute symptom frequency
    const daysWithData = points.filter(p => p.log !== null).length;
    const freq = SYMPTOM_KEYS.map(key => ({
      key, label: SYMPTOM_LABELS[key],
      count: points.filter(p => p.log && (p.log as any)[key] === true).length,
      pct: daysWithData > 0 ? Math.round(points.filter(p => p.log && (p.log as any)[key] === true).length / daysWithData * 100) : 0,
    })).filter(f => f.count > 0).sort((a, b) => b.count - a.count);
    setSymFreq(freq);

    // Compute 7-day weekly averages (points are oldest→newest, take last 7)
    const last7 = points.slice(-7).filter(p => p.log !== null);

    const weightVals = last7.map(p => parseFloat(p.log?.weight ?? '')).filter(n => !isNaN(n));
    const moodVals = last7.map(p => p.log?.mood ?? 0).filter(n => n > 0);
    const sleepVals = last7.map(p => p.log?.sleepQuality ?? 0).filter(n => n > 0);
    const fluidVals = last7.map(p => p.log?.fluidMl ?? 0).filter(n => n > 0);

    setAvgWeight(weightVals.length > 0 ? weightVals.reduce((a, b, _, arr) => a + b / arr.length, 0) : null);
    setAvgMood(moodVals.length > 0 ? moodVals.reduce((a, b, _, arr) => a + b / arr.length, 0) : null);
    setAvgSleep(sleepVals.length > 0 ? sleepVals.reduce((a, b, _, arr) => a + b / arr.length, 0) : null);
    setAvgFluid(fluidVals.length > 0 ? fluidVals.reduce((a, b, _, arr) => a + b / arr.length, 0) : null);
  }, []);

  // Reload whenever the tab comes into focus so changes made on other tabs
  // (vitals on Today, labs on Labs) are always reflected immediately.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History & Trends</Text>
          <Text style={styles.subtitle}>Last 30 days of tracking</Text>
        </View>
      </View>

      {!loaded ? (
        <Card>
          <Text style={styles.loadingText}>Loading data...</Text>
        </Card>
      ) : null}

      {/* Symptom Frequency Analysis */}
      <SectionLabel title="Symptom Frequency" sub="Last 30 days (days reported)" />
      {symFreq.length === 0 ? (
        <Card flat style={{ backgroundColor: colors.emerald50 }}>
          <Text style={{ fontSize: 13, color: colors.emerald700, textAlign: 'center', paddingVertical: 8 }}>
            ✅ No symptoms reported in 30 days
          </Text>
        </Card>
      ) : (
        <Card>
          {symFreq.map(f => (
            <View key={f.key} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.slate700 }}>{f.label}</Text>
                <Text style={{ fontSize: 12, color: f.pct >= 50 ? colors.rose600 : f.pct >= 25 ? colors.amber700 : colors.slate500 }}>
                  {f.count}d ({f.pct}%)
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.slate200, borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${f.pct}%`, height: '100%', borderRadius: 999,
                  backgroundColor: f.pct >= 50 ? colors.rose500 : f.pct >= 25 ? colors.amber500 : colors.slate400 }} />
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Weekly Summary Card */}
      <SectionLabel title="This Week at a Glance" />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            { label: 'Avg Weight', value: avgWeight ? `${avgWeight.toFixed(1)} lbs` : '—' },
            { label: 'Avg Mood', value: avgMood ? `${avgMood.toFixed(1)}/5` : '—' },
            { label: 'Avg Sleep', value: avgSleep ? `${avgSleep.toFixed(1)}/5` : '—' },
            { label: 'Avg Fluid', value: avgFluid ? `${Math.round(avgFluid)} mL` : '—' },
          ].map(item => (
            <View key={item.label} style={{ width: '45%', padding: 10, backgroundColor: colors.slate50, borderRadius: 10 }}>
              <Text style={{ fontSize: 11, color: colors.slate500, fontWeight: '600', marginBottom: 2 }}>{item.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.slate800 }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Weight Trend */}
      <SectionLabel title="Weight Tracking" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="weight"
          label="Weight"
          unit="lbs"
          color={colors.indigo500}
          dangerAbove={undefined}
        />
        <Text style={styles.chartNote}>Monitor for sudden weight gain (more than 2 lbs in 24 hours)</Text>
      </Card>

      {/* Temperature Trends */}
      <SectionLabel title="Temperature" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amTemp"
          label="Morning Temperature"
          unit="°F"
          color={colors.cyan800}
          dangerAbove={CL_LIMITS.feverWarning}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmTemp"
          label="Evening Temperature"
          unit="°F"
          color={colors.orange700}
          dangerAbove={CL_LIMITS.feverWarning}
        />
        <Text style={styles.chartNote}>Contact team if temperature exceeds 101.5°F</Text>
      </Card>

      {/* Blood Pressure Trends */}
      <SectionLabel title="Blood Pressure (Systolic)" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amSys"
          label="Morning BP Systolic"
          unit="mmHg"
          color={colors.rose500}
          dangerAbove={CL_LIMITS.bpSysHigh}
          dangerBelow={CL_LIMITS.bpSysLow}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmSys"
          label="Evening BP Systolic"
          unit="mmHg"
          color={colors.rose600}
          dangerAbove={CL_LIMITS.bpSysHigh}
          dangerBelow={CL_LIMITS.bpSysLow}
        />
        <Text style={styles.chartNote}>Target range: 100-160 mmHg systolic</Text>
      </Card>

      {/* Heart Rate Trends */}
      <SectionLabel title="Heart Rate" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="amHr"
          label="Morning Heart Rate"
          unit="bpm"
          color={colors.pink400}
          dangerAbove={CL_LIMITS.hrHigh}
          dangerBelow={CL_LIMITS.hrLow}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="pmHr"
          label="Evening Heart Rate"
          unit="bpm"
          color={colors.purple700}
          dangerAbove={CL_LIMITS.hrHigh}
          dangerBelow={CL_LIMITS.hrLow}
        />
        <Text style={styles.chartNote}>Target range: 60-120 bpm</Text>
      </Card>

      {/* Lab Values */}
      <SectionLabel title="Lab Values" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="labCr"
          label="Creatinine"
          unit="mg/dL"
          color={colors.emerald500}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="labTac"
          label="Tacrolimus"
          unit="ng/mL"
          color={colors.indigo500}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="labGfr"
          label="GFR"
          unit="mL/min"
          color={colors.sky400}
        />
        <Text style={styles.chartNote}>Lab values show kidney function and immunosuppression levels</Text>
      </Card>

      {/* ALT Trend */}
      <SectionLabel title="ALT (Liver Enzyme)" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="labAlt"
          label="ALT"
          unit="U/L"
          color={colors.amber500}
          dangerAbove={120}
        />
        <Text style={styles.chartNote}>Normal range: 0–56 U/L. Elevated ALT may indicate liver stress from medications.</Text>
      </Card>

      {/* Magnesium Trend */}
      <SectionLabel title="Magnesium" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="labMg"
          label="Magnesium"
          unit="mg/dL"
          color={colors.cyan800}
          dangerBelow={1.5}
          dangerAbove={2.5}
        />
        <Text style={styles.chartNote}>Normal range: 1.7–2.5 mg/dL. Low magnesium is common with tacrolimus.</Text>
      </Card>

      {/* Fluid Intake */}
      <SectionLabel title="Fluid Intake" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="fluidMl"
          label="Daily Fluid Intake"
          unit="mL"
          color={colors.blue700}
          dangerBelow={CL_LIMITS.fluidGoal * 0.75}
        />
        <Text style={styles.chartNote}>Daily goal: {CL_LIMITS.fluidGoal} mL</Text>
      </Card>

      {/* Pain Level */}
      <SectionLabel title="Pain Level" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="pain"
          label="Pain Score"
          unit="/10"
          color={colors.amber500}
        />
        <Text style={styles.chartNote}>Track pain trends and report persistent high pain to your team</Text>
      </Card>

      {/* Wellbeing */}
      <SectionLabel title="Wellbeing" />
      <Card>
        <TrendChart
          data={dataPoints}
          dataKey="mood"
          label="Mood"
          unit="/5"
          color={colors.indigo500}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="sleepQuality"
          label="Sleep Quality"
          unit="/5"
          color={colors.purple700}
        />
        <View style={{ height: 20 }} />
        <TrendChart
          data={dataPoints}
          dataKey="stressLevel"
          label="Stress Level"
          unit="/5"
          color={colors.amber500}
        />
        <Text style={styles.chartNote}>Higher mood and sleep scores are better (1–5). Lower stress is better. Gaps mean no entry that day.</Text>
      </Card>

      {/* Info */}
      <Card flat style={{ backgroundColor: colors.sky50 }}>
        <Text style={styles.infoTitle}>Reading Your Trends</Text>
        <Text style={styles.infoText}>
          • Rising weight (2+ lbs/day), BP, or temperature: contact your team right away{'\n'}
          • Falling GFR or rising creatinine: call your coordinator{'\n'}
          • Improving mood and sleep trends may reflect stable recovery patterns{'\n'}
          • Red data points mean a value is outside your safe range{'\n'}
          • Daily logging gives your care team better information
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  loadingText: { fontSize: 14, color: colors.slate500, textAlign: 'center', paddingVertical: 20 },
  chartNote: { fontSize: 11, color: colors.slate500, marginTop: 12, lineHeight: 16 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.sky700, marginBottom: 8 },
  infoText: { fontSize: 12, color: colors.sky700, lineHeight: 20 },
});
