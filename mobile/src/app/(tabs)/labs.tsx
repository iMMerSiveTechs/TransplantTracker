import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import { LAB_R, labClr } from '@/data/labTests';
import { LAB_R as LAB_R_LIMITS } from '@/data/clinicalLimits';
import type { LabKey } from '@/data/clinicalLimits';
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
  const [showMoreLabs, setShowMoreLabs] = useState<boolean>(false);
  const [labDate, setLabDate] = useState<string>('');

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
    // Use a generated filename — never trust user-supplied names for filesystem writes.
    // The original display name is stored in the LabImport record for UI purposes only.
    const ext = (asset.name.split('.').pop() ?? 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    await FileSystem.makeDirectoryAsync(LAB_DIR, { intermediates: true });
    const destUri = `${LAB_DIR}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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
    S.set(`log_${currentId}`, log).then(saved => {
      if (!saved) Burnt.toast({ title: 'Could not save lab values', preset: 'error' });
    });
  }, [log, loaded]);

  const upd = (k: keyof DailyLog, v: any) => setLog({ ...log, [k]: v });

  // Physiologically sane upper bounds for each lab field.
  // Values above these are almost certainly data-entry errors.
  const LAB_MAX: Partial<Record<keyof DailyLog, number>> = {
    labCr: 30, labTac: 100, labGfr: 250, labPhos: 20, labK: 15, labGlu: 2000,
    labAlt: 2000, labAst: 2000, labMg: 10, labHgb: 25, labWbc: 100, labBun: 200,
  };
  const updLab = (k: keyof DailyLog, v: string) => {
    const n = parseFloat(v);
    const max = LAB_MAX[k];
    if (v !== '' && !isNaN(n) && max !== undefined && n > max) {
      Burnt.toast({ title: `Value too high — check entry`, preset: 'error' });
      return;
    }
    upd(k, v);
  };

  const getVariant = (color: string) => {
    if (color === 'success') return 'success';
    if (color === 'warning') return 'warning';
    if (color === 'danger') return 'danger';
    return 'muted';
  };

  // Helper: get reference range text for a lab key from clinicalLimits
  const getRangeText = (labKey: LabKey): string => {
    const range = LAB_R_LIMITS[labKey];
    if (!range) return '';
    return `Normal: ${range.green[0]}–${range.green[1]} ${range.unit}`;
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

      {/* Lab Date Entry */}
      <SectionLabel title="Lab Date" sub="Optional — track when these labs were drawn" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={labDate}
            onChangeText={setLabDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.slate400}
            style={[styles.dateInput, { flex: 1 }]}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Pressable style={styles.todayBtn} onPress={() => setLabDate(toId(new Date()))}>
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        </View>
      </Card>

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
            onChange={(v) => updLab('labCr', v)}
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
        {log.labCr ? (
          <Text style={styles.rangeText}>{getRangeText('labCr')}</Text>
        ) : null}
        <Text style={styles.note}>{LAB_R.cr.note}</Text>

        <View style={{ height: 16 }} />

        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.gfr.label}
            value={log.labGfr}
            onChange={(v) => updLab('labGfr', v)}
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
        {log.labGfr ? (
          <Text style={styles.rangeText}>{getRangeText('labGfr')}</Text>
        ) : null}
        <Text style={styles.note}>{LAB_R.gfr.note}</Text>
      </Card>

      {/* Immunosuppression */}
      <SectionLabel title="Immunosuppression" />
      <Card accent={colors.indigo500}>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.tac.label}
            value={log.labTac}
            onChange={(v) => updLab('labTac', v)}
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
        {log.labTac ? (
          <Text style={styles.rangeText}>{getRangeText('labTac')}</Text>
        ) : null}
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
            onChange={(v) => updLab('labK', v)}
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
        {log.labK ? (
          <Text style={styles.rangeText}>{getRangeText('labK')}</Text>
        ) : null}
        <Text style={styles.note}>{LAB_R.k.note}</Text>

        <View style={{ height: 16 }} />

        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.phos.label}
            value={log.labPhos}
            onChange={(v) => updLab('labPhos', v)}
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
        {log.labPhos ? (
          <Text style={styles.rangeText}>{getRangeText('labPhos')}</Text>
        ) : null}
        <Text style={styles.note}>{LAB_R.phos.note}</Text>
      </Card>

      {/* Blood Sugar */}
      <SectionLabel title="Blood Sugar" />
      <Card>
        <View style={styles.labRow}>
          <NumberField
            label={LAB_R.glu.label}
            value={log.labGlu}
            onChange={(v) => updLab('labGlu', v)}
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
        {log.labGlu ? (
          <Text style={styles.rangeText}>{getRangeText('labGlu')}</Text>
        ) : null}
        <Text style={styles.note}>{LAB_R.glu.note}</Text>
      </Card>

      {/* Extended Labs Toggle */}
      <SectionLabel title="Extended Lab Panel" sub="ALT, AST, Magnesium, Hemoglobin, WBC, BUN" />
      <Card>
        <Pressable style={{ paddingVertical: 8, alignItems: 'center' }} onPress={() => setShowMoreLabs(!showMoreLabs)}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.indigo500 }}>{showMoreLabs ? '▲ Hide Extended Labs' : '▼ More Labs (ALT, AST, Mg, Hgb, WBC, BUN)'}</Text>
        </Pressable>
        {showMoreLabs ? (
          <View>
            <View style={styles.labRow}>
              <NumberField label="ALT" value={log.labAlt} onChange={v => updLab('labAlt', v)} unit="U/L" />
              <View style={{ width: 12 }} />
              <NumberField label="AST" value={log.labAst} onChange={v => updLab('labAst', v)} unit="U/L" />
            </View>
            {(log.labAlt || log.labAst) ? (
              <Text style={styles.rangeText}>ALT Normal: 0–56 U/L · AST Normal: 0–40 U/L</Text>
            ) : null}
            <View style={[styles.labRow, { marginTop: 12 }]}>
              <NumberField label="Magnesium" value={log.labMg} onChange={v => updLab('labMg', v)} unit="mg/dL" />
              <View style={{ width: 12 }} />
              <NumberField label="Hemoglobin" value={log.labHgb} onChange={v => updLab('labHgb', v)} unit="g/dL" />
            </View>
            {(log.labMg || log.labHgb) ? (
              <Text style={styles.rangeText}>Mg Normal: 1.7–2.5 mg/dL · Hgb Normal: 12–18 g/dL</Text>
            ) : null}
            <View style={[styles.labRow, { marginTop: 12 }]}>
              <NumberField label="WBC" value={log.labWbc} onChange={v => updLab('labWbc', v)} unit="K/µL" />
              <View style={{ width: 12 }} />
              <NumberField label="BUN" value={log.labBun} onChange={v => updLab('labBun', v)} unit="mg/dL" />
            </View>
            {(log.labWbc || log.labBun) ? (
              <Text style={styles.rangeText}>WBC Normal: 4.0–11.0 K/µL · BUN Normal: 7–25 mg/dL</Text>
            ) : null}
          </View>
        ) : null}
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
  rangeText: { fontSize: 10, color: colors.slate500, marginTop: 3, fontStyle: 'italic' },
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
  dateInput: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate800,
    backgroundColor: colors.white,
  },
  todayBtn: {
    backgroundColor: colors.indigo500,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});
