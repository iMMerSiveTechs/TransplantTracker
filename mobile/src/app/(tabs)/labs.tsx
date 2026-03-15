import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import { LAB_R, labClr } from '@/data/labTests';
import { toId } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import NumberField from '@/components/NumberField';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import type { DailyLog, LabImport } from '@/data/types';
import { EMPTY_LOG } from '@/data/types';

export default function LabsScreen() {
  const [log, setLog] = useState<DailyLog>(EMPTY_LOG);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [logFromStorage, setLogFromStorage] = useState<boolean>(false);
  // Track which date key was loaded to detect midnight rollovers
  const [loadedDateKey, setLoadedDateKey] = useState<string>('');
  const [imports, setImports] = useState<LabImport[]>([]);

  const loadDayLog = useCallback(async () => {
    const currentId = toId(new Date());
    const savedLog = await S.get(`log_${currentId}`);
    if (savedLog) {
      // Merge with EMPTY_LOG so any fields added in later versions have safe defaults
      // for users upgrading from older app builds with missing fields in storage.
      setLog({ ...EMPTY_LOG, ...savedLog });
      setLogFromStorage(true);
    } else {
      setLog(EMPTY_LOG);
      setLogFromStorage(false);
    }
    setLoadedDateKey(currentId);
    setLoaded(true);
  }, []);

  useEffect(() => {
    async function load() {
      const savedImports = await S.get('lab_imports');
      if (Array.isArray(savedImports)) setImports(savedImports);
      await loadDayLog();
    }
    load();
  }, []);

  // Always reload on focus to catch midnight rollovers and writes from other tabs
  useFocusEffect(useCallback(() => {
    loadDayLog();
  }, [loadDayLog]));

  const LAB_DIR = `${FileSystem.documentDirectory}lab_attachments/`;
  const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
  const MAX_ATTACHMENTS = 100; // total count limit

  const pickLabFile = async () => {
    if (imports.length >= MAX_ATTACHMENTS) {
      Burnt.toast({ title: 'Too many attachments (max 100). Remove old files first.', preset: 'error' });
      return;
    }
    const currentId = toId(new Date());
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    // File size guard: reject anything over 20 MB to prevent storage bloat.
    if (asset.size !== undefined && asset.size !== null && asset.size > MAX_SINGLE_FILE_BYTES) {
      Burnt.toast({ title: 'File too large (max 20 MB)', preset: 'error' });
      return;
    }
    // Sanitize filename: strip unsafe characters, cap length, ensure non-empty result.
    const sanitized = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'attachment';
    // Copy from ephemeral cache to durable document directory so the file
    // survives app restarts and OS cache eviction.
    await FileSystem.makeDirectoryAsync(LAB_DIR, { intermediates: true });
    const destUri = `${LAB_DIR}lab_${Date.now()}_${sanitized}`;
    await FileSystem.copyAsync({ from: asset.uri, to: destUri });
    const newImport: LabImport = {
      id: `lab_${Date.now()}`,
      date: currentId,
      filename: asset.name,
      uri: destUri,
      parsed: false,
    };
    const updated = [...imports, newImport];
    setImports(updated);
    await S.set('lab_imports', updated);
  };

  const removeImport = async (id: string) => {
    const toRemove = imports.find(i => i.id === id);
    // Delete the durable file to avoid storage accumulation
    if (toRemove?.uri?.includes('lab_attachments')) {
      try { await FileSystem.deleteAsync(toRemove.uri, { idempotent: true }); } catch {}
    }
    const updated = imports.filter(i => i.id !== id);
    setImports(updated);
    await S.set('lab_imports', updated);
  };

  useEffect(() => {
    if (!loaded) return;
    const currentId = toId(new Date());
    // Do not write stale data to a new day's key after a midnight rollover.
    if (loadedDateKey && loadedDateKey !== currentId) return;
    const isEmpty = JSON.stringify(log) === JSON.stringify(EMPTY_LOG);
    if (!logFromStorage && isEmpty) return;
    S.set(`log_${currentId}`, log);
  }, [log, loaded]);

  const upd = (k: keyof DailyLog, v: any) => setLog({ ...log, [k]: v });

  const getVariant = (color: string) => {
    if (color === 'success') return 'success';
    if (color === 'warning') return 'warning';
    if (color === 'danger') return 'danger';
    return 'muted';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lab Results</Text>
          <Text style={styles.subtitle}>Enter today's lab values</Text>
        </View>
        <Pressable style={styles.importBtn} onPress={pickLabFile}>
          <Text style={styles.importBtnText}>📎 Attach</Text>
        </Pressable>
      </View>

      {/* Imported Files */}
      {imports.length > 0 ? (
        <>
          <SectionLabel title="Attached Lab Files" sub="Reference only — enter values manually" />
          <Card>
            {imports.map(imp => {
              const isPdf = imp.filename.toLowerCase().endsWith('.pdf');
              const importedDate = imp.date
                ? new Date(imp.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';
              return (
                <View key={imp.id} style={styles.importRow}>
                  <Text style={styles.importIcon}>{isPdf ? '📄' : '🖼️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.importName} numberOfLines={1}>{imp.filename}</Text>
                    <Text style={styles.importDate}>Attached {importedDate} · reference only</Text>
                  </View>
                  <Badge label="Saved" variant="muted" />
                  <Pressable style={styles.importRemove} onPress={() => removeImport(imp.id)}>
                    <Text style={styles.importRemoveText}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
            <Text style={styles.importNote}>Files are saved for reference. Enter lab values manually above.</Text>
          </Card>
        </>
      ) : null}

      {/* Kidney Function */}
      <SectionLabel title="Kidney Function" />
      <Card>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.cr.label}
            value={log.labCr}
            onChange={(v) => upd('labCr', v)}
            unit={LAB_R.cr.unit}
            error={labClr('cr', log.labCr) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labCr ? (
              <Badge
                label={labClr('cr', log.labCr).toUpperCase()}
                variant={getVariant(labClr('cr', log.labCr))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.cr.note}</Text>

        <View style={{ height: 16 }} />

        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.gfr.label}
            value={log.labGfr}
            onChange={(v) => upd('labGfr', v)}
            unit={LAB_R.gfr.unit}
            error={labClr('gfr', log.labGfr) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labGfr ? (
              <Badge
                label={labClr('gfr', log.labGfr).toUpperCase()}
                variant={getVariant(labClr('gfr', log.labGfr))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.gfr.note}</Text>
      </Card>

      {/* Immunosuppression */}
      <SectionLabel title="Immunosuppression" />
      <Card accent={colors.indigo500}>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.tac.label}
            value={log.labTac}
            onChange={(v) => upd('labTac', v)}
            unit={LAB_R.tac.unit}
            error={labClr('tac', log.labTac) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labTac ? (
              <Badge
                label={labClr('tac', log.labTac).toUpperCase()}
                variant={getVariant(labClr('tac', log.labTac))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.tac.note}</Text>
        <Text style={styles.importantNote}>
          Critical: Take Tacrolimus exactly 12 hours apart. Do not take dose on lab morning until after blood draw.
        </Text>
      </Card>

      {/* Electrolytes */}
      <SectionLabel title="Electrolytes" />
      <Card>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.k.label}
            value={log.labK}
            onChange={(v) => upd('labK', v)}
            unit={LAB_R.k.unit}
            error={labClr('k', log.labK) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labK ? (
              <Badge
                label={labClr('k', log.labK).toUpperCase()}
                variant={getVariant(labClr('k', log.labK))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.k.note}</Text>

        <View style={{ height: 16 }} />

        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.phos.label}
            value={log.labPhos}
            onChange={(v) => upd('labPhos', v)}
            unit={LAB_R.phos.unit}
            error={labClr('phos', log.labPhos) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labPhos ? (
              <Badge
                label={labClr('phos', log.labPhos).toUpperCase()}
                variant={getVariant(labClr('phos', log.labPhos))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.phos.note}</Text>
      </Card>

      {/* Blood Sugar */}
      <SectionLabel title="Blood Sugar" />
      <Card>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.glu.label}
            value={log.labGlu}
            onChange={(v) => upd('labGlu', v)}
            unit={LAB_R.glu.unit}
            error={labClr('glu', log.labGlu) === 'danger'}
          />
          <View style={{ width: 12 }} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {log.labGlu ? (
              <Badge
                label={labClr('glu', log.labGlu).toUpperCase()}
                variant={getVariant(labClr('glu', log.labGlu))}
              />
            ) : null}
          </View>
        </View>
        <Text style={styles.note}>{LAB_R.glu.note}</Text>
      </Card>

      {/* Info Card */}
      <Card flat style={{ backgroundColor: colors.sky50 }}>
        <Text style={styles.infoTitle}>Lab Schedule</Text>
        <Text style={styles.infoText}>
          Yellow labs: Monday & Thursday{'\n'}
          Pink labs: Monthly (check calendar){'\n'}
          Green labs: Special tests (check with team)
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  labRow: { flexDirection: 'row', alignItems: 'flex-end' },
  note: { fontSize: 10, color: colors.slate400, marginTop: 4, fontWeight: '500' },
  importantNote: { fontSize: 11, color: colors.indigo600, marginTop: 8, fontWeight: '600', lineHeight: 16 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.sky700, marginBottom: 6 },
  infoText: { fontSize: 12, color: colors.sky700, lineHeight: 18 },
  importBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  importBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  importName: { fontSize: 14, fontWeight: '600', color: colors.slate700 },
  importDate: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  importRemove: { padding: 6 },
  importRemoveText: { fontSize: 14, color: colors.slate400 },
  importIcon: { fontSize: 20, marginRight: 8 },
  importNote: { fontSize: 11, color: colors.slate400, marginTop: 10, fontStyle: 'italic' },
});
