import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/data/colors';
import { TRANSPLANT_TYPES, INIT_MEDS, INIT_APPTS } from '@/data/restrictions';
import { SURG_DEFAULT } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import { api } from '@/lib/api/api';
import type { Profile, Contact } from '@/data/types';

export default function SetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [transplantType, setTransplantType] = useState<string>('Kidney');
  const [surgDate, setSurgDate] = useState<Date>(SURG_DEFAULT);

  const handleComplete = async () => {
    const profile: Profile = {
      name,
      type: transplantType,
      surgDate,
      contacts: [
        { icon: '🏥', label: 'Transplant Center', sub: '24/7 Urgent Line', phone: '(650) 498-6000', urgent: true },
        { icon: '👨‍⚕️', label: 'Transplant Coordinator', sub: 'Business Hours', phone: '(650) 723-6661' },
        { icon: '💊', label: 'Pharmacy', sub: 'Medication Questions', phone: '(650) 723-5000' },
      ],
      emergPhone: '911',
    };

    await S.set('profile', profile);
    await S.set('medications', INIT_MEDS);
    await S.set('appointments', INIT_APPTS);
    await S.set('onboarding_complete', true);

    try {
      const isLoggedIn = await S.get('auth_logged_in');
      if (isLoggedIn) {
        await api.post('/api/sync', {
          profile: {
            name: profile.name,
            type: profile.type,
            surgDate: profile.surgDate instanceof Date
              ? profile.surgDate.toISOString().split('T')[0]
              : String(profile.surgDate),
            emergPhone: profile.emergPhone,
            contacts: profile.contacts,
          },
          medications: INIT_MEDS.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            instr: m.instr,
            inv: m.inv,
            ppd: m.ppd,
            critical: m.critical,
            color: m.color,
            isTac: m.isTac,
          })),
          appointments: INIT_APPTS.map((a) => ({
            date: a.date,
            time: a.time,
            doc: a.doc,
            desc: a.desc,
            type: (a as any).type || '',
            labBy: (a as any).labBy || '',
          })),
        });
      }
    } catch (_) {}

    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {step === 1 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.emoji}>🫀</Text>
            <Text style={styles.title}>Welcome to Your{'\n'}Health Tracker</Text>
            <Text style={styles.subtitle}>
              Track your post-transplant journey with confidence. Daily vitals, medications, lab results, and more.
            </Text>
          </View>

          <Card>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Daily Tracking</Text>
                <Text style={styles.featureDesc}>Monitor vitals, symptoms, medications, and fluid intake</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Lab Results</Text>
                <Text style={styles.featureDesc}>Track creatinine, tacrolimus, and key lab values</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📈</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Trend Charts</Text>
                <Text style={styles.featureDesc}>Visualize your health data over time</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Medication Tracking</Text>
                <Text style={styles.featureDesc}>Never miss a dose with inventory management</Text>
              </View>
            </View>
          </Card>

          <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 1 of 2</Text>
            <Text style={styles.title}>Tell us about yourself</Text>
          </View>

          <Card>
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.slate300}
              style={styles.input}
            />

            <View style={{ height: 20 }} />

            <Text style={styles.inputLabel}>Transplant Type</Text>
            <View style={styles.typeGrid}>
              {TRANSPLANT_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeBtn,
                    transplantType === type && styles.typeBtnActive,
                  ]}
                  onPress={() => setTransplantType(type)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      transplantType === type && styles.typeBtnTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={() => setStep(3)}
              disabled={!name}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 2 of 2</Text>
            <Text style={styles.title}>Ready to start tracking</Text>
            <Text style={styles.subtitle}>
              We've set up sample medications and appointments. You can customize these later in your profile.
            </Text>
          </View>

          <Card accent={colors.indigo500}>
            <Text style={styles.summaryLabel}>Your Profile</Text>
            <Text style={styles.summaryName}>{name}</Text>
            <Text style={styles.summaryType}>{transplantType} Transplant</Text>
          </Card>

          <Card>
            <Text style={styles.infoTitle}>What's Next?</Text>
            <Text style={styles.infoText}>
              1. Start tracking your daily vitals and symptoms{'\n'}
              2. Enter lab results as you receive them{'\n'}
              3. Track medication inventory to avoid running out{'\n'}
              4. Review your health trends in the History tab{'\n'}
              5. Add emergency contacts in your profile
            </Text>
          </Card>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleComplete}
            >
              <Text style={styles.primaryBtnText}>Start Tracking</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  stepLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: colors.indigo500, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', color: colors.slate800, textAlign: 'center', lineHeight: 38 },
  subtitle: { fontSize: 16, color: colors.slate600, textAlign: 'center', marginTop: 12, lineHeight: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  featureIcon: { fontSize: 32 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: colors.slate800, marginBottom: 4 },
  featureDesc: { fontSize: 13, color: colors.slate600, lineHeight: 18 },
  inputLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8 },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate800,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  typeBtnActive: {
    borderColor: colors.indigo500,
    backgroundColor: colors.indigo50,
  },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  typeBtnTextActive: { color: colors.indigo600 },
  summaryLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginBottom: 8 },
  summaryName: { fontSize: 24, fontWeight: '700', color: colors.slate800, marginBottom: 4 },
  summaryType: { fontSize: 14, color: colors.slate600 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: colors.slate800, marginBottom: 12 },
  infoText: { fontSize: 14, color: colors.slate600, lineHeight: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  primaryBtn: {
    backgroundColor: colors.indigo500,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.indigo500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  secondaryBtn: {
    backgroundColor: colors.slate200,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: colors.slate700 },
});
