import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/data/colors';
import { toId } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import type { DailyLog, Profile, Medication, Appointment } from '@/data/types';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExportScreen() {
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const exportData = async () => {
    setLoading(true);
    try {
      const profile: Profile | null = await S.get('profile');
      const medications: Medication[] = (await S.get('medications')) || [];
      const appointments: Appointment[] = (await S.get('appointments')) || [];

      const today = new Date();
      const logs: { date: string; log: DailyLog }[] = [];
      for (let i = 0; i < range; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const id = toId(d);
        const log = await S.get(`log_${id}`);
        if (log) logs.push({ date: id, log });
      }
      logs.reverse();

      let csv = 'TransplantTracker Health Report\n';
      csv += `Generated: ${formatDate(today)}\n`;
      csv += `Period: ${range} days\n\n`;

      if (profile) {
        csv += '--- PATIENT INFO ---\n';
        csv += `Name: ${profile.name}\n`;
        csv += `Transplant: ${profile.type}\n`;
        csv += `Surgery Date: ${profile.surgDate instanceof Date ? formatDate(profile.surgDate) : profile.surgDate}\n\n`;
      }

      csv += '--- DAILY VITALS ---\n';
      csv += 'Date,Weight,AM Temp,AM BP,AM HR,PM Temp,PM BP,PM HR,AM Meds,PM Meds,Fluid(mL),Pain,Notes\n';
      for (const { date, log } of logs) {
        csv += [
          date,
          log.weight || '-',
          log.amTemp || '-',
          log.amSys && log.amDia ? `${log.amSys}/${log.amDia}` : '-',
          log.amHr || '-',
          log.pmTemp || '-',
          log.pmSys && log.pmDia ? `${log.pmSys}/${log.pmDia}` : '-',
          log.pmHr || '-',
          log.amMeds ? 'Yes' : 'No',
          log.pmMeds ? 'Yes' : 'No',
          log.fluidMl,
          log.pain,
          `"${(log.notes || '').replace(/"/g, '""')}"`,
        ].join(',') + '\n';
      }

      csv += '\n--- LAB VALUES ---\n';
      csv += 'Date,Creatinine,Tacrolimus,GFR,Phosphorus,Potassium,Glucose\n';
      for (const { date, log } of logs) {
        if (log.labCr || log.labTac || log.labGfr || log.labPhos || log.labK || log.labGlu) {
          csv += [
            date,
            log.labCr || '-',
            log.labTac || '-',
            log.labGfr || '-',
            log.labPhos || '-',
            log.labK || '-',
            log.labGlu || '-',
          ].join(',') + '\n';
        }
      }

      csv += '\n--- SYMPTOMS ---\n';
      csv += 'Date,Incision,Nausea,Low Urine,Burning,Acid Reflux,Gas,Bloating,Diarrhea,Constipation,Tenderness,Swelling\n';
      for (const { date, log } of logs) {
        const syms = [
          log.incision, log.nausea, log.urineDown, log.burning,
          log.acidReflux, log.gas, log.bloating, log.diarrhea,
          log.constipation, log.tenderness, log.swelling,
        ];
        if (syms.some(Boolean)) {
          csv += [date, ...syms.map((s) => (s ? 'Yes' : '-'))].join(',') + '\n';
        }
      }

      if (medications.length) {
        csv += '\n--- MEDICATIONS ---\n';
        csv += 'Name,Dosage,Pills/Day,Inventory,Days Left,Critical\n';
        for (const m of medications) {
          const daysLeft = m.ppd > 0 ? Math.floor(m.inv / m.ppd) : '-';
          csv += [m.name, m.dosage, m.ppd, m.inv, daysLeft, m.critical ? 'Yes' : 'No'].join(',') + '\n';
        }
      }

      if (appointments.length) {
        csv += '\n--- UPCOMING APPOINTMENTS ---\n';
        csv += 'Date,Time,Doctor,Description\n';
        for (const a of appointments) {
          csv += [a.date, a.time, a.doc, `"${a.desc}"`].join(',') + '\n';
        }
      }

      await Share.share({
        message: csv,
        title: `TransplantTracker Report - ${formatDate(today)}`,
      });
    } catch (e) {
      // Share cancelled
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Export Health Data',
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55],
          sheetGrabberVisible: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Share Your Health Report</Text>
        <Text style={styles.subtitle}>
          Generate a report of your vitals, labs, symptoms, and medications to share with your care team.
        </Text>

        <Card>
          <Text style={styles.label}>Report Period</Text>
          <View style={styles.rangeRow}>
            {([7, 14, 30] as const).map((r) => (
              <Pressable
                key={r}
                style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                onPress={() => setRange(r)}
              >
                <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                  {r} days
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.includesTitle}>Report includes:</Text>
          <Text style={styles.includesItem}>  Daily vitals (weight, temp, BP, HR)</Text>
          <Text style={styles.includesItem}>  Lab results (Cr, Tac, GFR, etc.)</Text>
          <Text style={styles.includesItem}>  Symptom tracking</Text>
          <Text style={styles.includesItem}>  Medication inventory</Text>
          <Text style={styles.includesItem}>  Upcoming appointments</Text>
        </Card>

        <Pressable
          style={[styles.exportBtn, loading && styles.exportBtnDisabled]}
          onPress={exportData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.exportBtnText}>Generate & Share Report</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 20, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.slate800, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate500, lineHeight: 20, marginBottom: 24 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.slate600,
    marginBottom: 12,
  },
  rangeRow: { flexDirection: 'row', gap: 10 },
  rangeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  rangeBtnActive: {
    borderColor: colors.indigo500,
    backgroundColor: colors.indigo50,
  },
  rangeText: { fontSize: 14, fontWeight: '600', color: colors.slate500 },
  rangeTextActive: { color: colors.indigo600 },
  includesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate800,
    marginBottom: 8,
  },
  includesItem: { fontSize: 13, color: colors.slate600, lineHeight: 22 },
  exportBtn: {
    backgroundColor: colors.emerald500,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.emerald500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
