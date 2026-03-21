import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/data/colors';
import { INIT_MEDS } from '@/data/restrictions';
import { CL_LIMITS } from '@/data/clinicalLimits';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import Alrt from '@/components/Alert';
import type { Medication } from '@/data/types';

export default function MedsScreen() {
  const [meds, setMeds] = useState<Medication[]>(INIT_MEDS);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const savedMeds = await S.get('medications');
      if (savedMeds) setMeds(savedMeds);
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (loaded) {
      S.set('medications', meds);
    }
  }, [meds, loaded]);

  const updateMedInv = (id: string, delta: number) => {
    setMeds(meds.map(m => m.id === id ? { ...m, inv: Math.max(0, m.inv + delta) } : m));
  };

  const getLowStockWarning = (med: Medication) => {
    const daysLeft = Math.floor(med.inv / med.ppd);
    if (daysLeft <= CL_LIMITS.lowMedDays) {
      return { show: true, daysLeft };
    }
    return { show: false, daysLeft };
  };

  const criticalMeds = meds.filter(m => m.critical);
  const otherMeds = meds.filter(m => !m.critical);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medications</Text>
          <Text style={styles.subtitle}>Track your medication inventory</Text>
        </View>
      </View>

      {/* Low Stock Alert */}
      {meds.some(m => getLowStockWarning(m).show) ? (
        <Alrt
          icon="💊"
          title="Low Medication Stock"
          msg="You have medications running low. Contact your pharmacy to refill soon."
          variant="warning"
        />
      ) : null}

      {/* Critical Medications */}
      <SectionLabel title="Critical Medications" sub="Never skip or run out" />
      {criticalMeds.map(med => {
        const warning = getLowStockWarning(med);
        const daysLeft = Math.floor(med.inv / med.ppd);
        const progressPct = (daysLeft / 30) * 100;

        return (
          <Card key={med.id} accent={med.color}>
            <View style={styles.medHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDosage}>{med.dosage}</Text>
              </View>
              {warning.show ? (
                <Badge label={`${warning.daysLeft}d left`} variant="warning" icon="⚠️" />
              ) : null}
            </View>

            <View style={styles.medInfo}>
              <Text style={styles.medInstr}>{med.instr}</Text>
            </View>

            <View style={styles.invSection}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invLabel}>Inventory</Text>
                <Text style={styles.invValue}>{med.inv} pills</Text>
                <Text style={styles.invDays}>{daysLeft} days remaining</Text>
              </View>
              <View style={styles.invControls}>
                <Pressable
                  style={styles.invBtn}
                  onPress={() => updateMedInv(med.id, -med.ppd)}
                >
                  <Text style={styles.invBtnText}>-{med.ppd}</Text>
                </Pressable>
                <Pressable
                  style={[styles.invBtn, { backgroundColor: colors.emerald500 }]}
                  onPress={() => updateMedInv(med.id, 30)}
                >
                  <Text style={styles.invBtnText}>+30</Text>
                </Pressable>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(progressPct, 100)}%`,
                    backgroundColor: progressPct > 30 ? colors.emerald500 : progressPct > 15 ? colors.amber500 : colors.rose500,
                  },
                ]}
              />
            </View>

            {med.isTac ? (
              <View style={[styles.tacNote, { backgroundColor: colors.indigo50 }]}>
                <Text style={styles.tacNoteText}>
                  ⏰ Take exactly 12 hours apart. On lab days, wait until after blood draw to take morning dose.
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      {/* Other Medications */}
      {otherMeds.length > 0 ? (
        <>
          <SectionLabel title="Other Medications" />
          {otherMeds.map(med => {
            const warning = getLowStockWarning(med);
            const daysLeft = Math.floor(med.inv / med.ppd);

            return (
              <Card key={med.id}>
                <View style={styles.medHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>{med.dosage}</Text>
                  </View>
                  {warning.show ? (
                    <Badge label={`${warning.daysLeft}d left`} variant="warning" icon="⚠️" />
                  ) : null}
                </View>

                <View style={styles.invSection}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invValue}>{med.inv} pills</Text>
                    <Text style={styles.invDays}>{daysLeft} days remaining</Text>
                  </View>
                  <View style={styles.invControls}>
                    <Pressable
                      style={styles.invBtn}
                      onPress={() => updateMedInv(med.id, -med.ppd)}
                    >
                      <Text style={styles.invBtnText}>-{med.ppd}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.invBtn, { backgroundColor: colors.emerald500 }]}
                      onPress={() => updateMedInv(med.id, 30)}
                    >
                      <Text style={styles.invBtnText}>+30</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      {/* Medication Tips */}
      <Card flat style={{ backgroundColor: colors.sky50 }}>
        <Text style={styles.tipsTitle}>Medication Tips</Text>
        <Text style={styles.tipsText}>
          • Set phone alarms for exact dosing times{'\n'}
          • Use a pill organizer for weekly tracking{'\n'}
          • Refill when you have 7-10 days remaining{'\n'}
          • Keep medications in original containers{'\n'}
          • Store in cool, dry place (not bathroom)
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
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  medName: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  medDosage: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  medInfo: { marginBottom: 12 },
  medInstr: { fontSize: 12, color: colors.slate600, lineHeight: 18 },
  invSection: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  invLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400 },
  invValue: { fontSize: 18, fontWeight: '700', color: colors.slate800, marginTop: 2 },
  invDays: { fontSize: 11, color: colors.slate500, marginTop: 2 },
  invControls: { flexDirection: 'row', gap: 8 },
  invBtn: { backgroundColor: colors.slate600, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  invBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  progressBg: { height: 6, backgroundColor: colors.slate200, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 999 },
  tacNote: { padding: 12, borderRadius: 10, marginTop: 8 },
  tacNoteText: { fontSize: 11, color: colors.indigo600, lineHeight: 16, fontWeight: '500' },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.sky700, marginBottom: 8 },
  tipsText: { fontSize: 12, color: colors.sky700, lineHeight: 20 },
});
