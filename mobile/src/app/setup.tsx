import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/data/colors';
import { TRANSPLANT_TYPES, INIT_MEDS, INIT_APPTS } from '@/data/restrictions';
import S from '@/utils/storage';
import Card from '@/components/Card';
import type { Profile } from '@/data/types';

const TRANSPLANT_ICONS: Record<string, string> = {
  'Kidney': '🫘',
  'Pancreas': '🫁',
  'Kidney & Pancreas': '🫘🫁',
  'Liver': '🫀',
  'Heart': '❤️',
  'Lung': '🫁',
  'Other': '💊',
};

export default function SetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [transplantType, setTransplantType] = useState<string>('Kidney');
  const [surgDate, setSurgDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [transplantCenter, setTransplantCenter] = useState<string>('');
  const [coordPhone, setCoordPhone] = useState<string>('');
  const [pharmacyPhone, setPharmacyPhone] = useState<string>('');

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setSurgDate(selectedDate);
  };

  const handleComplete = async () => {
    const contacts = [];
    if (transplantCenter) {
      contacts.push({ icon: '🏥', label: 'Transplant Center', sub: '24/7 Urgent Line', phone: transplantCenter, urgent: true });
    }
    if (coordPhone) {
      contacts.push({ icon: '👨‍⚕️', label: 'Transplant Coordinator', sub: 'Business Hours', phone: coordPhone });
    }
    if (pharmacyPhone) {
      contacts.push({ icon: '💊', label: 'Pharmacy', sub: 'Medication Questions', phone: pharmacyPhone });
    }

    const profile: Profile = {
      name,
      type: transplantType,
      surgDate,
      contacts,
      emergPhone: '911',
    };

    await S.set('profile', profile);
    await S.set('medications', INIT_MEDS);
    await S.set('appointments', INIT_APPTS);
    await S.set('onboarding_complete', true);

    router.replace('/(tabs)');
  };

  const fmtSurgDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step 1 — Welcome */}
      {step === 1 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.emoji}>🫀</Text>
            <Text style={styles.title}>Welcome to Your{'\n'}Transplant Tracker</Text>
            <Text style={styles.subtitle}>
              Track your post-transplant journey with confidence. Daily vitals, medications, lab results, and more — all on your device.
            </Text>
          </View>

          <Card>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Daily Vitals & Symptoms</Text>
                <Text style={styles.featureDesc}>Weight, temp, BP, heart rate, fluid intake, and more</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Lab Results</Text>
                <Text style={styles.featureDesc}>Track creatinine, tacrolimus, GFR, and key values</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Medication Management</Text>
                <Text style={styles.featureDesc}>Inventory tracking + reminder notifications</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📈</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Trend Charts</Text>
                <Text style={styles.featureDesc}>30-day health trends with safety thresholds</Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📤</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Share with Your Team</Text>
                <Text style={styles.featureDesc}>Export health reports for your doctor or caregiver</Text>
              </View>
            </View>
          </Card>

          <Card flat style={{ backgroundColor: colors.indigo50 }}>
            <Text style={styles.privacyTitle}>🔒 Your data stays on your device</Text>
            <Text style={styles.privacyText}>
              No account required. All health data is stored locally and never leaves your phone unless you choose to share it.
            </Text>
          </Card>

          <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
        </>
      ) : null}

      {/* Step 2 — Name & Transplant Type */}
      {step === 2 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 1 of 3</Text>
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
                  <Text style={styles.typeBtnIcon}>{TRANSPLANT_ICONS[type] || '💊'}</Text>
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
              style={[styles.primaryBtn, { flex: 1 }, !name ? styles.btnDisabled : null]}
              onPress={() => setStep(3)}
              disabled={!name}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* Step 3 — Surgery Date & Contacts */}
      {step === 3 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 2 of 3</Text>
            <Text style={styles.title}>When was your transplant?</Text>
            <Text style={styles.subtitle}>
              This lets us calculate your recovery progress and show the right restrictions for your stage.
            </Text>
          </View>

          <Card>
            <Text style={styles.inputLabel}>Transplant / Surgery Date</Text>
            <Pressable
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerIcon}>📅</Text>
              <Text style={styles.datePickerText}>{fmtSurgDate(surgDate)}</Text>
            </Pressable>

            {(showDatePicker || Platform.OS === 'ios') ? (
              <DateTimePicker
                value={surgDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
                style={{ marginTop: 8 }}
              />
            ) : null}

            {Platform.OS === 'android' ? (
              <Text style={styles.dateHint}>Tap the date above to change it</Text>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.inputLabel}>Emergency Contacts</Text>
            <Text style={styles.inputHint}>Optional — you can add or edit these later in your profile</Text>

            <Text style={styles.subLabel}>🏥 Transplant Center (24/7 line)</Text>
            <TextInput
              value={transplantCenter}
              onChangeText={setTransplantCenter}
              placeholder="e.g. (650) 498-6000"
              placeholderTextColor={colors.slate300}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <View style={{ height: 12 }} />
            <Text style={styles.subLabel}>👨‍⚕️ Transplant Coordinator</Text>
            <TextInput
              value={coordPhone}
              onChangeText={setCoordPhone}
              placeholder="e.g. (650) 723-6661"
              placeholderTextColor={colors.slate300}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <View style={{ height: 12 }} />
            <Text style={styles.subLabel}>💊 Pharmacy</Text>
            <TextInput
              value={pharmacyPhone}
              onChangeText={setPharmacyPhone}
              placeholder="e.g. (650) 723-5000"
              placeholderTextColor={colors.slate300}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={() => setStep(4)}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* Step 4 — Ready */}
      {step === 4 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 3 of 3</Text>
            <Text style={styles.emoji}>✅</Text>
            <Text style={styles.title}>Ready to start{'\n'}tracking!</Text>
            <Text style={styles.subtitle}>
              We've loaded sample medications for {transplantType.toLowerCase()} transplant patients. Customize them in the Meds tab anytime.
            </Text>
          </View>

          <Card accent={colors.indigo500}>
            <Text style={styles.summaryLabel}>Your Profile</Text>
            <Text style={styles.summaryName}>{name}</Text>
            <Text style={styles.summaryType}>{TRANSPLANT_ICONS[transplantType] || '💊'} {transplantType} Transplant</Text>
            <Text style={styles.summaryDate}>📅 {fmtSurgDate(surgDate)}</Text>
          </Card>

          <Card>
            <Text style={styles.infoTitle}>What's Next?</Text>
            <Text style={styles.infoText}>
              1. Log today's vitals and symptoms in the Today tab{'\n'}
              2. Enter your actual medication names & doses in Meds{'\n'}
              3. Add lab results as you receive them{'\n'}
              4. Set medication reminders so you never miss a dose{'\n'}
              5. Review 30-day health trends in the History tab{'\n'}
              6. Share health reports with your doctor anytime
            </Text>
          </Card>

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep(3)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleComplete}
            >
              <Text style={styles.primaryBtnText}>Start Tracking 🚀</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <View style={{ height: 40 }} />
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
  privacyTitle: { fontSize: 14, fontWeight: '700', color: colors.indigo600, marginBottom: 6 },
  privacyText: { fontSize: 13, color: colors.indigo600, lineHeight: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8 },
  inputHint: { fontSize: 12, color: colors.slate400, marginBottom: 12 },
  subLabel: { fontSize: 13, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
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
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.indigo200,
    backgroundColor: colors.indigo50,
  },
  datePickerIcon: { fontSize: 24 },
  datePickerText: { fontSize: 15, fontWeight: '600', color: colors.indigo600, flex: 1 },
  dateHint: { fontSize: 11, color: colors.slate400, marginTop: 8, textAlign: 'center' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBtnActive: {
    borderColor: colors.indigo500,
    backgroundColor: colors.indigo50,
  },
  typeBtnIcon: { fontSize: 16 },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  typeBtnTextActive: { color: colors.indigo600 },
  summaryLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginBottom: 8 },
  summaryName: { fontSize: 24, fontWeight: '700', color: colors.slate800, marginBottom: 4 },
  summaryType: { fontSize: 16, fontWeight: '600', color: colors.slate700, marginBottom: 4 },
  summaryDate: { fontSize: 14, color: colors.slate600 },
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
  btnDisabled: { backgroundColor: colors.slate300, shadowOpacity: 0 },
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
