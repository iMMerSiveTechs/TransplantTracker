import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data/colors';
import { TRANSPLANT_TYPES } from '../data/restrictions';
import TextField from '../components/TextField';
import Card from '../components/Card';
import type { Profile, Contact } from '../data/types';

interface SetupScreenProps {
  onComplete: (profile: Profile) => void;
}

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    name: 'Jethro',
    type: 'Kidney & Pancreas',
    surgDate: '2026-02-09',
    emergPhone: '415-600-1000',
    coordName: 'Regina Dayao, RN',
    coordPhone: '415-600-1072',
    labPhone: '530-365-4600',
    pharmacyPhone: '415-558-7051',
    clinicPhone: '415-600-1040',
    clinicSub: '1100 Van Ness Ave, 3rd Floor',
    urologyPhone: '415-600-3127',
    urologySub: '1100 Van Ness, 5th Fl',
    dietPhone: '415-600-3269',
    dietSub: 'Mon-Fri 9-5',
  });

  const valid0 = p.name.trim() && p.surgDate;

  const finish = () => {
    const parts = p.surgDate.split('-');
    const surgDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    const contacts: Contact[] = [
      { icon: '\u{1F6A8}', label: 'Transplant Team', sub: '24hr Emergency Line', phone: p.emergPhone || '\u2014', urgent: true },
    ];
    if (p.coordName) contacts.push({ icon: '\u{1F469}\u200D\u2695\uFE0F', label: 'Coordinator', sub: p.coordName, phone: p.coordPhone || '\u2014' });
    if (p.labPhone) contacts.push({ icon: '\u{1FA78}', label: 'Lab / Draw Site', sub: 'Lab location', phone: p.labPhone });
    if (p.pharmacyPhone) contacts.push({ icon: '\u{1F48A}', label: 'Pharmacy', sub: 'For refills', phone: p.pharmacyPhone });
    if (p.clinicPhone) contacts.push({ icon: '\u{1F3E5}', label: 'Kidney Clinic', sub: p.clinicSub || 'Clinic', phone: p.clinicPhone });
    if (p.urologyPhone) contacts.push({ icon: '\u{1F52C}', label: 'Urology', sub: p.urologySub || 'Urology', phone: p.urologyPhone });
    if (p.dietPhone) contacts.push({ icon: '\u{1F957}', label: 'Dietitian', sub: p.dietSub || 'Mon-Fri', phone: p.dietPhone });

    onComplete({ name: p.name, type: p.type, surgDate, contacts, emergPhone: p.emergPhone });
  };

  const update = (key: string, val: string) => setP(prev => ({ ...prev, [key]: val }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 0 ? (
            <View>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{'\u{1FAC0}'}</Text>
              </View>
              <Text style={styles.heading}>Transplant Tracker</Text>
              <Text style={styles.subtitle}>Your personal post-transplant recovery companion.</Text>

              <Card>
                <Text style={styles.sectionTitle}>ABOUT YOU</Text>
                <View style={styles.fieldGap}>
                  <TextField label="Your First Name" value={p.name} onChange={v => update('name', v)} placeholder="e.g. Jordan" />
                </View>
                <View style={styles.fieldGap}>
                  <Text style={styles.fieldLabel}>TRANSPLANT TYPE</Text>
                  <View style={styles.typeRow}>
                    {TRANSPLANT_TYPES.map(t => (
                      <Pressable key={t} onPress={() => update('type', t)} style={[styles.typeBtn, p.type === t ? styles.typeBtnActive : styles.typeBtnInactive]}>
                        <Text style={[styles.typeBtnText, p.type === t ? styles.typeBtnTextActive : undefined]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.fieldGap}>
                  <TextField label="Surgery Date (YYYY-MM-DD)" value={p.surgDate} onChange={v => update('surgDate', v)} placeholder="2026-02-09" />
                </View>
              </Card>

              <Pressable onPress={() => valid0 && setStep(1)} disabled={!valid0} style={[styles.primaryBtn, !valid0 ? styles.disabledBtn : undefined]}>
                <Text style={[styles.primaryBtnText, !valid0 ? styles.disabledBtnText : undefined]}>Continue</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.heading2}>Care Team</Text>
              <Text style={styles.subtitle}>Add your key phone numbers. You can edit these later.</Text>

              <Card>
                <View style={styles.fieldGap}>
                  <TextField label="24hr Emergency Line" value={p.emergPhone} onChange={v => update('emergPhone', v)} placeholder="e.g. 415-600-1000" keyboardType="phone-pad" />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldGap}>
                  <TextField label="Coordinator Name" value={p.coordName} onChange={v => update('coordName', v)} placeholder="e.g. Regina Dayao, RN" />
                </View>
                <View style={styles.fieldGap}>
                  <TextField label="Coordinator Phone" value={p.coordPhone} onChange={v => update('coordPhone', v)} keyboardType="phone-pad" />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldGap}>
                  <TextField label="Lab Phone" value={p.labPhone} onChange={v => update('labPhone', v)} keyboardType="phone-pad" />
                </View>
                <View style={styles.fieldGap}>
                  <TextField label="Pharmacy Phone" value={p.pharmacyPhone} onChange={v => update('pharmacyPhone', v)} keyboardType="phone-pad" />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldGap}>
                  <TextField label="Kidney Clinic Phone" value={p.clinicPhone} onChange={v => update('clinicPhone', v)} keyboardType="phone-pad" />
                </View>
                <View style={styles.fieldGap}>
                  <TextField label="Urology Phone" value={p.urologyPhone} onChange={v => update('urologyPhone', v)} keyboardType="phone-pad" />
                </View>
                <View style={styles.fieldGap}>
                  <TextField label="Dietitian Phone" value={p.dietPhone} onChange={v => update('dietPhone', v)} keyboardType="phone-pad" />
                </View>
              </Card>

              <View style={styles.btnRow}>
                <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Pressable onPress={finish} style={styles.startBtn}>
                  <Text style={styles.startBtnText}>Start Tracking</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>This app is a personal tracking tool. It does not provide medical advice. Always follow your transplant team's instructions.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.indigo50 },
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(238,242,255,0.8)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  iconEmoji: { fontSize: 40 },
  heading: { fontSize: 28, fontWeight: '800', color: colors.slate800, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  heading2: { fontSize: 24, fontWeight: '700', color: colors.slate800, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.indigo500, marginBottom: 12 },
  fieldGap: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  typeBtnActive: { backgroundColor: colors.indigo500 },
  typeBtnInactive: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200 },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  typeBtnTextActive: { color: colors.white },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, backgroundColor: colors.indigo500, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  disabledBtn: { backgroundColor: colors.slate200 },
  disabledBtnText: { color: colors.slate400 },
  divider: { height: 1, backgroundColor: colors.slate100, marginVertical: 12 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.slate100, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: colors.slate600 },
  startBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.indigo500, alignItems: 'center' },
  startBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  disclaimer: { fontSize: 10, color: colors.slate400, textAlign: 'center', lineHeight: 14 },
});
