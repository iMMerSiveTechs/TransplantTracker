import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import { toId } from '@/utils/dates';
import { EMPTY_LOG } from '@/data/types';
import { INIT_MEDS } from '@/data/restrictions';
import { generateAndShareReport } from '@/lib/sharing';
import type { Profile, DailyLog } from '@/data/types';

// ─── DEV-ONLY SCREEN — hidden from production ───────────────────────────────
// __DEV__ is true only in Expo development builds. This screen is never shown
// in production and does not affect any production data paths.
// Access: Profile tab → "Dev Tools" link (only visible in dev builds)
// ─────────────────────────────────────────────────────────────────────────────

function addD(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const DEMO_PROFILE: Profile = {
  name: 'Alex Chen',
  type: 'Kidney',
  surgDate: addD(new Date(), -90).toISOString().split('T')[0],
  contacts: [
    { label: 'Transplant Coordinator', sub: 'UCSF Transplant Center', phone: '(415) 555-0100', icon: '👨‍⚕️', urgent: true },
    { label: 'Transplant Pharmacy', sub: 'UCSF Pharmacy', phone: '(415) 555-0200', icon: '💊', urgent: false },
    { label: 'After-Hours Line', sub: '24/7 on-call', phone: '(415) 555-0911', icon: '🚑', urgent: true },
  ],
  emergPhone: '(415) 555-0911',
};

function buildSampleLog(dayOffset: number): DailyLog {
  const weight = (165 + dayOffset * 0.1).toFixed(1);
  return {
    ...EMPTY_LOG,
    weight,
    amTemp: '98.4', pmTemp: '98.7',
    amSys: '118', amDia: '76', amHr: '72',
    pmSys: '122', pmDia: '78', pmHr: '74',
    fluidMl: 2200 + dayOffset * 50,
    nausea: false, incision: false, urineDown: false, burning: false,
    pain: 1, mood: 4, sleepQuality: 3, stressLevel: 2,
    wellbeingNotes: 'Feeling good today. Energy improving.',
    labCr: dayOffset % 3 === 0 ? '1.2' : '',
    labTac: dayOffset % 3 === 0 ? '8.5' : '',
    labGfr: dayOffset % 3 === 0 ? '58' : '',
    lastTacTime: null,
  };
}

export default function DevScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Ready. Tap an action below.');
  const [busy, setBusy] = useState<boolean>(false);

  if (!__DEV__) return null;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setStatus(`Running: ${label}…`);
    try {
      await fn();
      setStatus(`✓ ${label} complete.`);
    } catch (e: any) {
      setStatus(`✗ ${label} failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const seedProfile = () => run('Seed Demo Patient', async () => {
    await S.set('profile', DEMO_PROFILE);
    await S.set('onboarding_complete', true);
  });

  const seedLogs = () => run('Seed 7 Days of Logs', async () => {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = addD(today, -i);
      const key = `log_${toId(d)}`;
      const log = buildSampleLog(i);
      await S.set(key, log);
    }
  });

  const seedMeds = () => run('Seed Medications', async () => {
    await S.set('medications', INIT_MEDS);
  });

  const seedDoses = () => run('Seed Today Doses', async () => {
    const key = `doses_${toId(new Date())}`;
    const doses = [
      { medId: 'm1', timestamp: Date.now() - 3600000 * 14 },
      { medId: 'm2', timestamp: Date.now() - 3600000 * 3 },
      { medId: 'm2', timestamp: Date.now() - 3600000 * 3 },
      { medId: 'm3', timestamp: Date.now() - 3600000 * 6 },
    ];
    await S.set(key, doses);
  });

  const clearVault = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL app data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: () => run('Clear Vault', async () => {
            const keys = await AsyncStorage.getAllKeys();
            await AsyncStorage.multiRemove([...keys]);
          }),
        },
      ]
    );
  };

  const triggerNotification = () => run('Test Notification (10s)', async () => {
    await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DEV Test Notification',
        body: 'This is a QA test notification from TransplantTracker dev mode.',
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
    });
  });

  const triggerExport = () => run('Test Export', async () => {
    await generateAndShareReport();
  });

  const showStorage = () => run('Storage Inspector', async () => {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet([...keys]);
    const summary = pairs.map(([k, v]) => {
      const preview = v ? v.substring(0, 80) : 'null';
      return `${k}: ${preview}`;
    }).join('\n\n');
    setStatus(`Storage keys (${keys.length}):\n\n${summary}`);
  });

  const Btn = ({ label, color, onPress }: { label: string; color?: string; onPress: () => void }) => (
    <Pressable
      style={[styles.btn, { backgroundColor: color ?? colors.indigo500, opacity: busy ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={busy}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Dev Tools</Text>
        <Text style={styles.subtitle}>DEV BUILD ONLY — not visible in production</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <Text style={styles.sectionTitle}>Seed Data</Text>
      <Btn label="Seed Demo Patient (Alex Chen)" onPress={seedProfile} />
      <Btn label="Seed 7 Days of Vitals Logs" onPress={seedLogs} />
      <Btn label="Seed Medications (Tac, CellCept, Pred)" onPress={seedMeds} />
      <Btn label="Seed Today's Doses" onPress={seedDoses} />

      <Text style={styles.sectionTitle}>Tests</Text>
      <Btn label="Trigger Test Notification (fires in 10s)" color={colors.amber500} onPress={triggerNotification} />
      <Btn label="Trigger Test Export / Share" color={colors.amber500} onPress={triggerExport} />

      <Text style={styles.sectionTitle}>Inspect</Text>
      <Btn label="Show Storage Inspector" color={colors.slate600} onPress={showStorage} />

      <Text style={styles.sectionTitle}>Reset</Text>
      <Btn label="Clear All Vault Data" color={colors.rose500} onPress={clearVault} />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: colors.slate800 },
  subtitle: { fontSize: 12, color: colors.rose500, fontWeight: '600', marginTop: 4 },
  backBtn: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.slate300 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  statusBox: { backgroundColor: colors.slate800, borderRadius: 12, padding: 14, marginBottom: 24, minHeight: 60 },
  statusText: { fontSize: 12, color: '#a5f3fc', fontFamily: 'monospace', lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400, marginTop: 20, marginBottom: 10 },
  btn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
