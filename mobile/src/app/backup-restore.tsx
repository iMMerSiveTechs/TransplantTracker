import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/data/colors';

// All storage keys used by the app
const ALL_KEYS = [
  'profile',
  'medications',
  'onboarding_complete',
  'pharmacies',
  'insurance_plans',
  'rejection_episodes',
  'complication_events',
  'vaccination_records',
  'clinical_notes',
  'lab_imports',
  'appointments',
  'contacts',
];

// Plus dynamic keys: log_YYYY-MM-DD, doses_YYYY-MM-DD
async function getAllStorageKeys(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys as string[];
  } catch {
    return [];
  }
}

async function exportBackup(): Promise<string> {
  const allKeys = await getAllStorageKeys();
  const pairs = await AsyncStorage.multiGet(allKeys);
  const data: Record<string, any> = {};
  for (const [key, value] of pairs) {
    if (value !== null) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  }
  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    data,
  }, null, 2);
}

async function importBackup(jsonString: string): Promise<{ keysRestored: number }> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid backup file format.');
  }
  const entries = Object.entries(parsed.data) as [string, any][];
  const pairs: [string, string][] = entries.map(([k, v]) => [k, JSON.stringify(v)]);
  await AsyncStorage.multiSet(pairs);
  return { keysRestored: pairs.length };
}

export default function BackupRestoreScreen() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleExport() {
    try {
      setExporting(true);
      setStatusMsg(null);
      const json = await exportBackup();
      const filename = `transplanttracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save TransplantTracker Backup',
          UTI: 'public.json',
        });
        setStatusMsg('Backup exported successfully.');
      } else {
        setStatusMsg('Sharing is not available on this device.');
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'An error occurred during export.');
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
      if (result.canceled) {
        setImporting(false);
        return;
      }
      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Confirm before overwriting
      Alert.alert(
        'Restore Backup?',
        'This will replace ALL current app data with the backup. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setImporting(false) },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                const { keysRestored } = await importBackup(jsonString);
                setStatusMsg(`Restored ${keysRestored} data entries. Please restart the app.`);
              } catch (e: any) {
                Alert.alert('Restore Failed', e?.message ?? 'Could not parse backup file.');
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message ?? 'An error occurred.');
      setImporting(false);
    }
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
            } catch (e: any) {
              Alert.alert('Error', 'Failed to clear data: ' + (e?.message ?? ''));
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

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Your data is stored <Text style={{ fontWeight: '700' }}>only on this device</Text>.
            Export a backup before switching phones or reinstalling the app.
            Backups are saved as a JSON file you can store anywhere.
          </Text>
        </View>

        {/* Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Backup</Text>
          <Text style={styles.sectionDesc}>
            Creates a complete backup of all your health data — vitals, medications, labs, appointments, and settings — as a single file.
          </Text>
          <Pressable
            style={[styles.primaryBtn, exporting && styles.btnDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>📤 Export Backup</Text>
            }
          </Pressable>
        </View>

        {/* Import */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore from Backup</Text>
          <Text style={styles.sectionDesc}>
            Select a previously exported backup file to restore your data.
            {'\n'}
            <Text style={styles.warningText}>⚠️ This replaces all current data.</Text>
          </Text>
          <Pressable
            style={[styles.secondaryBtn, importing && styles.btnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator color={colors.indigo600} />
              : <Text style={styles.secondaryBtnText}>📥 Restore from File</Text>
            }
          </Pressable>
        </View>

        {/* Status message */}
        {statusMsg !== null && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>✅ {statusMsg}</Text>
          </View>
        )}

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
            '• Daily logs (vitals, labs, symptoms)',
            '• Dose history',
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
  infoCard: {
    backgroundColor: colors.indigo50,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 22 },
  infoText: { flex: 1, fontSize: 14, color: colors.indigo600, lineHeight: 21 },
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
  warningText: { color: colors.amber700, fontWeight: '600' },
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
});
