import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import { toId, addD } from '@/utils/dates';

// Fixed storage keys to include in export
const EXPORT_KEYS = [
  'medications',
  'profile',
  'appointments',
  'pharmacies',
  'insurance_plans',
  'clinical_notes',
  'rejection_episodes',
  'vaccination_records',
  'complication_events',
  'lab_imports',
  'onboarding_complete',
];

interface DataSummary {
  medications: number;
  appointments: number;
  daysLogged: number;
  labImports: number;
}

async function exportBackup(): Promise<string> {
  const exportData: Record<string, unknown> = {
    _schema_version: 1,
    _exported_at: new Date().toISOString(),
  };

  // Export fixed keys
  for (const key of EXPORT_KEYS) {
    const value = await S.get(key);
    if (value !== null) {
      exportData[key] = value;
    }
  }

  // Export last 30 days of logs + dose logs
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = addD(today, -i);
    const logKey = `log_${toId(d)}`;
    const dosesKey = `doses_${toId(d)}`;
    const log = await S.get(logKey);
    const doses = await S.get(dosesKey);
    if (log !== null) exportData[logKey] = log;
    if (doses !== null) exportData[dosesKey] = doses;
  }

  return JSON.stringify(exportData, null, 2);
}

async function importBackup(jsonString: string): Promise<{ keysRestored: number }> {
  const parsed = JSON.parse(jsonString) as Record<string, unknown>;
  if (!parsed._schema_version) {
    throw new Error('Invalid backup file — missing _schema_version. This file may not be a valid TransplantTracker backup.');
  }
  const metaKeys = new Set(['_schema_version', '_exported_at']);
  const entries = Object.entries(parsed).filter(([k]) => !metaKeys.has(k));
  for (const [key, value] of entries) {
    await S.set(key, value);
  }
  return { keysRestored: entries.length };
}

export default function BackupRestoreScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<DataSummary>({ medications: 0, appointments: 0, daysLogged: 0, labImports: 0 });
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [pendingExportedAt, setPendingExportedAt] = useState<string>('Unknown');
  const [lastExportTime, setLastExportTime] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    const meds: unknown[] = (await S.get('medications')) ?? [];
    const appts: unknown[] = (await S.get('appointments')) ?? [];
    const labImports: unknown[] = (await S.get('lab_imports')) ?? [];

    let daysLogged = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = addD(today, -i);
      const log = await S.get(`log_${toId(d)}`);
      if (log) daysLogged++;
    }

    setSummary({
      medications: Array.isArray(meds) ? meds.length : 0,
      appointments: Array.isArray(appts) ? appts.length : 0,
      daysLogged,
      labImports: Array.isArray(labImports) ? labImports.length : 0,
    });
  }

  async function handleExport() {
    try {
      setExporting(true);
      setStatusMsg(null);
      const json = await exportBackup();
      const today = new Date();
      const filename = `transplant-backup-${toId(today)}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save TransplantTracker Backup',
          UTI: 'public.json',
        });
        const timeStr = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        setLastExportTime(timeStr);
        Burnt.toast({ title: 'Backup exported successfully', preset: 'done' });
      } else {
        Burnt.toast({ title: 'Sharing is not available on this device', preset: 'error' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred during export.';
      Burnt.toast({ title: msg, preset: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    try {
      setImporting(true);
      setStatusMsg(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) {
        setImporting(false);
        return;
      }
      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Validate before showing confirm
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonString) as Record<string, unknown>;
      } catch {
        Burnt.toast({ title: 'Could not read backup file — invalid JSON', preset: 'error' });
        setImporting(false);
        return;
      }

      if (!parsed._schema_version) {
        Burnt.toast({ title: 'Invalid backup file — missing schema version', preset: 'error' });
        setImporting(false);
        return;
      }

      const exportedAt = parsed._exported_at as string | undefined;
      const displayDate = exportedAt
        ? new Date(exportedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Unknown date';
      setPendingJson(jsonString);
      setPendingExportedAt(displayDate);
      setShowConfirmModal(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'An error occurred.';
      Burnt.toast({ title: msg, preset: 'error' });
    } finally {
      setImporting(false);
    }
  }

  async function confirmRestore() {
    if (!pendingJson) return;
    setShowConfirmModal(false);
    try {
      const { keysRestored } = await importBackup(pendingJson);
      setPendingJson(null);
      await loadSummary();
      setStatusMsg(`Restored ${keysRestored} data entries successfully.`);
      Burnt.toast({ title: 'Data restored successfully', preset: 'done' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not parse backup file.';
      Burnt.toast({ title: msg, preset: 'error' });
    }
  }

  function cancelRestore() {
    setPendingJson(null);
    setShowConfirmModal(false);
  }

  async function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL your health data, medications, and settings. This cannot be undone.\n\nConsider exporting a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setStatusMsg('All data cleared. The app will restart from setup.');
              Burnt.toast({ title: 'All data cleared', preset: 'done' });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : '';
              Burnt.toast({ title: 'Failed to clear data: ' + msg, preset: 'error' });
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Backup & Restore</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Warning card */}
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important</Text>
          <Text style={styles.warningBodyText}>
            Backup often. This app stores data <Text style={{ fontWeight: '700' }}>only on this device</Text>. If you lose your phone without a backup, your data cannot be recovered.
          </Text>
        </View>

        {/* Data Summary */}
        <Text style={styles.sectionLabel}>Your Data</Text>
        <View style={styles.section}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.medications}</Text>
              <Text style={styles.summaryLabel}>Medications</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.appointments}</Text>
              <Text style={styles.summaryLabel}>Appointments</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.daysLogged}</Text>
              <Text style={styles.summaryLabel}>Days Logged</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.labImports}</Text>
              <Text style={styles.summaryLabel}>Lab Imports</Text>
            </View>
          </View>
        </View>

        {/* Export */}
        <Text style={styles.sectionLabel}>Export</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Export All Data</Text>
          <Text style={styles.sectionDesc}>
            Creates a complete backup of all your health data — vitals, medications, labs, appointments, and settings — as a single JSON file.
          </Text>
          {lastExportTime ? (
            <Text style={styles.lastExportText}>Last exported this session: {lastExportTime}</Text>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, exporting && styles.btnDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>📦 Export All Data</Text>
            }
          </Pressable>
        </View>

        {/* Import */}
        <Text style={styles.sectionLabel}>Restore</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Import from File</Text>
          <Text style={styles.sectionDesc}>
            Select a previously exported backup file to restore your data.
          </Text>
          <View style={styles.importWarningBox}>
            <Text style={styles.warningText}>⚠️ This will overwrite your current data. Continue?</Text>
          </View>
          <Pressable
            style={[styles.secondaryBtn, importing && styles.btnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator color={colors.indigo600} />
              : <Text style={styles.secondaryBtnText}>📥 Import from File</Text>
            }
          </Pressable>
        </View>

        {/* Status message */}
        {statusMsg !== null ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>✅ {statusMsg}</Text>
          </View>
        ) : null}

        {/* Danger zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.sectionDesc}>
            Permanently deletes all app data. Export a backup first.
          </Text>
          <Pressable style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>🗑️ Clear All Data</Text>
          </Pressable>
        </View>

        {/* Info about what is backed up */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>What's included in a backup?</Text>
          {[
            '• Profile & personal targets',
            '• Medication list & settings',
            '• Daily logs (vitals, labs, symptoms) — last 30 days',
            '• Dose history — last 30 days',
            '• Appointments',
            '• Rejection & complication events',
            '• Clinical notes',
            '• Vaccination records',
            '• Pharmacy & insurance info',
          ].map(item => (
            <Text key={item} style={styles.detailItem}>{item}</Text>
          ))}
        </View>

      </ScrollView>

      {/* Confirm Restore Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={cancelRestore}
        accessibilityViewIsModal
      >
        <View style={styles.confirmModal}>
          <Text style={styles.confirmTitle}>Restore from Backup?</Text>
          <Text style={styles.confirmDesc}>
            This backup was created on{'\n'}
            <Text style={{ fontWeight: '700', color: colors.slate800 }}>{pendingExportedAt}</Text>
          </Text>
          <View style={styles.confirmWarningBox}>
            <Text style={styles.confirmWarningText}>
              ⚠️ This will overwrite all your current data with the contents of this backup. This cannot be undone.
            </Text>
          </View>
          <Pressable style={styles.confirmRestoreBtn} onPress={confirmRestore}>
            <Text style={styles.confirmRestoreBtnText}>Yes, Restore Data</Text>
          </Pressable>
          <Pressable style={styles.confirmCancelBtn} onPress={cancelRestore}>
            <Text style={styles.confirmCancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 15, color: colors.indigo600, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.slate800 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.slate500,
    marginBottom: 4,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: colors.amber50,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.amber200,
  },
  warningTitle: { fontSize: 14, fontWeight: '700', color: colors.amber700, marginBottom: 6 },
  warningBodyText: { fontSize: 13, color: colors.amber700, lineHeight: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: {
    width: '45%',
    backgroundColor: colors.slate50,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 28, fontWeight: '800', color: colors.indigo600 },
  summaryLabel: { fontSize: 11, color: colors.slate500, marginTop: 2, fontWeight: '600' },
  lastExportText: { fontSize: 11, color: colors.emerald700, fontWeight: '500' },
  importWarningBox: {
    backgroundColor: colors.rose50,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.rose200,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  sectionDesc: { fontSize: 13, color: colors.slate500, lineHeight: 20 },
  warningText: { color: colors.rose700, fontWeight: '600', fontSize: 12 },
  primaryBtn: {
    backgroundColor: colors.indigo600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.indigo400,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.indigo600 },
  btnDisabled: { opacity: 0.5 },
  statusCard: {
    backgroundColor: colors.emerald50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.emerald200,
  },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.emerald700, lineHeight: 20 },
  dangerSection: { borderWidth: 1.5, borderColor: colors.rose200 },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: colors.rose600 },
  dangerBtn: {
    backgroundColor: colors.rose50,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.rose200,
  },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: colors.rose600 },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  detailTitle: { fontSize: 14, fontWeight: '700', color: colors.slate700, marginBottom: 4 },
  detailItem: { fontSize: 13, color: colors.slate500, lineHeight: 20 },
  // Confirm modal
  confirmModal: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 28,
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: colors.slate800, marginBottom: 10 },
  confirmDesc: { fontSize: 14, color: colors.slate600, lineHeight: 22, marginBottom: 16 },
  confirmWarningBox: {
    backgroundColor: colors.rose50,
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: colors.rose200,
  },
  confirmWarningText: { fontSize: 13, color: colors.rose700, lineHeight: 20, fontWeight: '500' },
  confirmRestoreBtn: {
    backgroundColor: colors.rose500,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmRestoreBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  confirmCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.slate200,
  },
  confirmCancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.slate600 },
});
