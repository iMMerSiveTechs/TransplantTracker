import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../data/colors';
import { CL_LIMITS } from '../data/clinicalLimits';
import { fmtDate, fmtShort, fmt, toId, addD, dBt, cl, SURG_DEFAULT } from '../utils/dates';
import { parseLocalDay } from '../utils/dates';
import type { DailyLog, Medication, Profile } from '../data/types';
import Badge from '../components/Badge';
import Card from '../components/Card';
import Ring from '../components/Ring';
import SectionLabel from '../components/SectionLabel';
import TrendChart from '../components/TrendChart';

interface HistoryTabProps {
  logs: Record<string, DailyLog>;
  todayLog: DailyLog;
  meds: Medication[];
  profile: Profile;
}

export default function HistoryTab({ logs, todayLog, meds, profile }: HistoryTabProps) {
  const SURG = profile.surgDate || SURG_DEFAULT;
  const [copied, setCopied] = useState(false);
  const today = toId(new Date());

  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = addD(new Date(), -i);
    const id = toId(d);
    return { date: d, id, log: id === today ? todayLog : (logs[id] || null) };
  });

  const exportReport = (log: DailyLog | null, id: string): string => {
    if (!log) return 'No data.';
    return [
      'TRANSPLANT TRACKER \u2014 Daily Report',
      `Date: ${fmtDate(parseLocalDay(id))}`,
      `Day ${dBt(SURG, parseLocalDay(id))} post-transplant`,
      '',
      '\u2500\u2500 Morning \u2500\u2500',
      `Weight: ${log.weight || '\u2014'} lbs`,
      `Temp: ${log.amTemp || '\u2014'}\u00B0F`,
      `BP: ${log.amSys || '\u2014'}/${log.amDia || '\u2014'}  HR: ${log.amHr || '\u2014'}`,
      `AM Meds: ${log.amMeds ? '\u2713' : '\u2717'}`,
      '',
      '\u2500\u2500 Evening \u2500\u2500',
      `Temp: ${log.pmTemp || '\u2014'}\u00B0F`,
      `BP: ${log.pmSys || '\u2014'}/${log.pmDia || '\u2014'}  HR: ${log.pmHr || '\u2014'}`,
      `PM Meds: ${log.pmMeds ? '\u2713' : '\u2717'}`,
      '',
      `Hydration: ${(log.fluidMl / 1000).toFixed(1)}L / ${(CL_LIMITS.fluidGoal / 1000).toFixed(1)}L`,
      '',
      '\u2500\u2500 Symptoms \u2500\u2500',
      `Pain: ${log.pain}/10`,
      `GI: ${[log.acidReflux && 'reflux', log.gas && 'gas', log.diarrhea && 'diarrhea'].filter(Boolean).join(', ') || 'none'}`,
      `Appetite: ${log.appetite}`,
      '',
      ...(log.notes ? ['\u2500\u2500 Notes \u2500\u2500', log.notes, ''] : []),
      `\u2500\u2500 Meds (${meds.length}) \u2500\u2500`,
      ...meds.map(m => `${m.name}: ${m.inv} pills (${m.ppd > 0 ? Math.floor(m.inv / m.ppd) : '\u221E'}d)`),
    ].filter(l => l !== '').join('\n');
  };

  const copyReport = async () => {
    await Clipboard.setStringAsync(exportReport(todayLog, today));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* Export */}
      <Card>
        <View style={styles.exportRow}>
          <View style={styles.flex1}>
            <Text style={styles.exportTitle}>{"\u{1F4CB}"} Export Today</Text>
            <Text style={styles.exportSub}>Copy for your care team</Text>
          </View>
          <Pressable onPress={copyReport} style={[styles.copyBtn, copied ? styles.copyBtnCopied : undefined]}>
            <Text style={styles.copyBtnText}>{copied ? '\u2713 Copied!' : 'Copy'}</Text>
          </Pressable>
        </View>
      </Card>

      {/* 7-Day Vitals */}
      <Card>
        <Text style={styles.chartTitle}>{"\u{1F4C8}"} 7-Day Vitals</Text>
        <TrendChart data={past7} dataKey="weight" label="Weight" unit="lbs" color="#0ea5e9" />
        <View style={styles.chartDivider} />
        <TrendChart data={past7} dataKey="amTemp" label="AM Temp" unit={"\u00B0F"} color="#f43f5e" dangerAbove={CL_LIMITS.feverDanger} />
        <View style={styles.chartDivider} />
        <TrendChart data={past7} dataKey="amSys" label="BP Systolic" unit="mmHg" color="#8b5cf6" />
      </Card>

      {/* Lab Trends */}
      <Card>
        <Text style={styles.chartTitle}>{"\u{1F52C}"} Lab Trends</Text>
        <TrendChart data={past7} dataKey="labCr" label="Creatinine" unit="mg/dL" color="#0891B2" dangerAbove={2.0} />
        <View style={styles.chartDivider} />
        <TrendChart data={past7} dataKey="labGfr" label="GFR" unit="mL/min" color="#059669" dangerBelow={30} />
        <View style={styles.chartDivider} />
        <TrendChart data={past7} dataKey="labK" label="Potassium" unit="mEq/L" color="#EA580C" dangerAbove={5.5} />
        <View style={styles.chartDivider} />
        <TrendChart data={past7} dataKey="labPhos" label="Phosphorus" unit="mg/dL" color="#7C3AED" dangerAbove={5.5} />
      </Card>

      {/* Past 7 Days */}
      <SectionLabel title="Past 7 Days" />
      {past7.map(({ date, id, log }) => {
        const isT = id === today;
        if (!log) {
          return (
            <Card key={id} flat>
              <View style={styles.dayRow}>
                <Text style={styles.dayNoData}>{fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                <Badge label="No Data" variant="muted" />
              </View>
            </Card>
          );
        }

        const tasks = [log.weight, log.amTemp, log.amMeds, log.fluidMl >= CL_LIMITS.fluidGoal, log.pmTemp, log.pmMeds].filter(Boolean).length;
        const p = tasks / 6;
        const sym = log.incision || log.nausea || log.pain > 5;

        return (
          <Card key={id} accent={sym ? '#E11D48' : p >= 1 ? '#059669' : undefined}>
            <View style={styles.dayCardRow}>
              <Ring progress={p} size={42} color={p >= 1 ? '#059669' : '#6366F1'}>
                <Text style={styles.dayPct}>{Math.round(p * 100)}%</Text>
              </Ring>
              <View style={styles.flex1}>
                <View style={styles.dayTitleRow}>
                  <Text style={styles.dayTitle}>{isT ? 'Today' : fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                  {p >= 1 ? <Badge label="Complete" variant="success" icon={"\u2713"} /> : null}
                  {sym ? <Badge label="Symptoms" variant="danger" icon={"\u26A0\uFE0F"} /> : null}
                </View>
                <View style={styles.dayStatsRow}>
                  {log.weight ? <Text style={styles.dayStat}>{"\u2696\uFE0F"}{log.weight}lb</Text> : null}
                  {log.amTemp ? <Text style={styles.dayStat}>{"\u{1F321}\uFE0F"}{log.amTemp}{"\u00B0"}</Text> : null}
                  <Text style={styles.dayStat}>{"\u{1F4A7}"}{(log.fluidMl / 1000).toFixed(1)}L</Text>
                  {log.pain > 0 ? <Text style={styles.dayStat}>{"\u{1F623}"}{log.pain}/10</Text> : null}
                </View>
              </View>
            </View>
            {log.notes ? <Text style={styles.dayNotes}>"{log.notes}"</Text> : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  exportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1 },
  exportTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  exportSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  copyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.indigo500 },
  copyBtnCopied: { backgroundColor: colors.emerald500 },
  copyBtnText: { fontSize: 12, fontWeight: '600', color: colors.white },
  chartTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800, marginBottom: 2 },
  chartDivider: { height: 1, backgroundColor: colors.slate100, marginVertical: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNoData: { fontSize: 14, fontWeight: '500', color: colors.slate400 },
  dayCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayPct: { fontSize: 10, fontWeight: '700', color: colors.slate700 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  dayStatsRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  dayStat: { fontSize: 12, color: colors.slate400 },
  dayNotes: { fontSize: 12, color: colors.slate400, marginTop: 8, fontStyle: 'italic', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.slate50 },
});
