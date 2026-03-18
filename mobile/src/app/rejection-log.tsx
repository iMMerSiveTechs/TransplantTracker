import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import type { RejectionEpisode, ComplicationEvent } from '@/data/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const REJECTION_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  acute:            { label: 'Acute',            color: colors.rose700,    bg: colors.rose50 },
  chronic:          { label: 'Chronic',           color: colors.amber700,   bg: colors.amber50 },
  suspected:        { label: 'Suspected',         color: colors.slate600,   bg: colors.slate100 },
  borderline:       { label: 'Borderline',        color: colors.orange700,  bg: colors.orange50 },
  antibody_mediated:{ label: 'Antibody-Mediated', color: colors.rose700,    bg: colors.rose50 },
};

const COMPLICATION_TYPE_LABELS: Record<string, string> = {
  infection:       'Infection',
  rejection:       'Rejection',
  toxicity:        'Drug Toxicity',
  hospitalization: 'Hospitalization',
  procedure:       'Procedure',
  other:           'Other',
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  mild:     { color: colors.emerald700, bg: colors.emerald50 },
  moderate: { color: colors.amber700,   bg: colors.amber50 },
  severe:   { color: colors.rose700,    bg: colors.rose50 },
};

const REJECTION_WARNING_SIGNS = [
  'Rising creatinine or falling GFR',
  'Decreased urine output',
  'Tenderness over the transplant site',
  'Fever or flu-like symptoms',
  'Sudden weight gain (fluid retention)',
  'Elevated tacrolimus trough or supratherapeutic levels',
];

// ── Toggle Button ─────────────────────────────────────────────────────────────

function Toggle({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable style={styles.toggleRow} onPress={onToggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

// ── Picker Row ────────────────────────────────────────────────────────────────

function PickerRow<T extends string>({
  label, value, options, onSelect,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.pickerBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={styles.pickerRow}>
          {options.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.chip, value === opt.value && styles.chipSelected]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[styles.chipText, value === opt.value && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RejectionLogScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'episodes' | 'complications'>('episodes');
  const [episodes, setEpisodes] = useState<RejectionEpisode[]>([]);
  const [complications, setComplications] = useState<ComplicationEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Episode modal state
  const [showEpModal, setShowEpModal] = useState(false);
  const [epDate, setEpDate] = useState('');
  const [epType, setEpType] = useState<RejectionEpisode['type']>('suspected');
  const [epBiopsyGrade, setEpBiopsyGrade] = useState('');
  const [epTreatment, setEpTreatment] = useState('');
  const [epResolved, setEpResolved] = useState(false);
  const [epResolvedDate, setEpResolvedDate] = useState('');
  const [epHospitalStay, setEpHospitalStay] = useState(false);
  const [epNotes, setEpNotes] = useState('');

  // Complication modal state
  const [showCompModal, setShowCompModal] = useState(false);
  const [compDate, setCompDate] = useState('');
  const [compType, setCompType] = useState<ComplicationEvent['type']>('infection');
  const [compTitle, setCompTitle] = useState('');
  const [compSeverity, setCompSeverity] = useState<ComplicationEvent['severity']>('mild');
  const [compOutcome, setCompOutcome] = useState('');
  const [compResolved, setCompResolved] = useState(false);
  const [compNotes, setCompNotes] = useState('');

  // Load
  useEffect(() => {
    Promise.all([
      S.get('rejection_episodes'),
      S.get('complication_events'),
    ]).then(([eps, comps]) => {
      setEpisodes(Array.isArray(eps) ? eps : []);
      setComplications(Array.isArray(comps) ? comps : []);
      setLoaded(true);
    });
  }, []);

  // Persist episodes
  useEffect(() => {
    if (!loaded) return;
    S.set('rejection_episodes', episodes).then(ok => {
      if (!ok) Burnt.toast({ title: 'Could not save episodes', preset: 'error' });
    });
  }, [episodes, loaded]);

  // Persist complications
  useEffect(() => {
    if (!loaded) return;
    S.set('complication_events', complications).then(ok => {
      if (!ok) Burnt.toast({ title: 'Could not save complications', preset: 'error' });
    });
  }, [complications, loaded]);

  // Episode actions
  const openAddEpisode = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEpDate(today);
    setEpType('suspected');
    setEpBiopsyGrade('');
    setEpTreatment('');
    setEpResolved(false);
    setEpResolvedDate('');
    setEpHospitalStay(false);
    setEpNotes('');
    setShowEpModal(true);
  };

  const saveEpisode = () => {
    if (!epDate.trim()) {
      Burnt.toast({ title: 'Date is required', preset: 'error' });
      return;
    }
    const ep: RejectionEpisode = {
      id: uid(),
      date: epDate.trim(),
      type: epType,
      biopsyGrade: epBiopsyGrade.trim() || undefined,
      treatment: epTreatment.trim() || undefined,
      resolved: epResolved,
      resolvedDate: epResolved && epResolvedDate.trim() ? epResolvedDate.trim() : undefined,
      hospitalStay: epHospitalStay,
      notes: epNotes.trim(),
    };
    setEpisodes(prev => [ep, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setShowEpModal(false);
    Burnt.toast({ title: 'Episode logged', preset: 'done' });
  };

  const deleteEpisode = (id: string) => {
    Alert.alert('Delete Episode', 'Are you sure you want to delete this rejection episode?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          setEpisodes(prev => prev.filter(e => e.id !== id));
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  // Complication actions
  const openAddComplication = () => {
    const today = new Date().toISOString().slice(0, 10);
    setCompDate(today);
    setCompType('infection');
    setCompTitle('');
    setCompSeverity('mild');
    setCompOutcome('');
    setCompResolved(false);
    setCompNotes('');
    setShowCompModal(true);
  };

  const saveComplication = () => {
    if (!compDate.trim() || !compTitle.trim()) {
      Burnt.toast({ title: 'Date and title are required', preset: 'error' });
      return;
    }
    const comp: ComplicationEvent = {
      id: uid(),
      date: compDate.trim(),
      type: compType,
      title: compTitle.trim(),
      severity: compSeverity,
      outcome: compOutcome.trim(),
      resolved: compResolved,
      notes: compNotes.trim(),
    };
    setComplications(prev => [comp, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setShowCompModal(false);
    Burnt.toast({ title: 'Complication logged', preset: 'done' });
  };

  const deleteComplication = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this complication event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          setComplications(prev => prev.filter(c => c.id !== id));
          if (expandedId === id) setExpandedId(null);
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Rejection Log</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'episodes' && styles.tabBtnActive]}
          onPress={() => setTab('episodes')}
        >
          <Text style={[styles.tabText, tab === 'episodes' && styles.tabTextActive]}>
            Episodes ({episodes.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'complications' && styles.tabBtnActive]}
          onPress={() => setTab('complications')}
        >
          <Text style={[styles.tabText, tab === 'complications' && styles.tabTextActive]}>
            Complications ({complications.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === 'episodes' ? (
          <>
            {/* Warning signs card */}
            <View style={styles.warnCard}>
              <Text style={styles.warnTitle}>Rejection Warning Signs</Text>
              <Text style={styles.warnSub}>Contact your transplant team if you notice:</Text>
              {REJECTION_WARNING_SIGNS.map((s, i) => (
                <View key={i} style={styles.warnRow}>
                  <View style={styles.warnDot} />
                  <Text style={styles.warnItem}>{s}</Text>
                </View>
              ))}
            </View>

            {/* Add button */}
            <Pressable style={styles.addBtn} onPress={openAddEpisode}>
              <Text style={styles.addBtnText}>+ Log Rejection Episode</Text>
            </Pressable>

            {episodes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No episodes logged</Text>
                <Text style={styles.emptyText}>
                  Log any suspected or confirmed rejection episodes here to track your history over time.
                </Text>
              </View>
            ) : (
              episodes.map(ep => {
                const badge = REJECTION_TYPE_LABELS[ep.type] ?? REJECTION_TYPE_LABELS.suspected;
                const isOpen = expandedId === ep.id;
                return (
                  <View key={ep.id} style={styles.card}>
                    <Pressable onPress={() => setExpandedId(isOpen ? null : ep.id)}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardMeta}>
                          <Text style={styles.cardDate}>{ep.date}</Text>
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                          {ep.resolved ? (
                            <View style={[styles.badge, { backgroundColor: colors.emerald50 }]}>
                              <Text style={[styles.badgeText, { color: colors.emerald700 }]}>Resolved</Text>
                            </View>
                          ) : (
                            <View style={[styles.badge, { backgroundColor: colors.rose50 }]}>
                              <Text style={[styles.badgeText, { color: colors.rose700 }]}>Active</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                      </View>
                      {ep.treatment ? (
                        <Text style={styles.cardSnippet} numberOfLines={isOpen ? undefined : 1}>
                          Tx: {ep.treatment}
                        </Text>
                      ) : null}
                    </Pressable>

                    {isOpen && (
                      <View style={styles.cardExpanded}>
                        {ep.biopsyGrade ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Biopsy Grade: </Text>{ep.biopsyGrade}</Text>
                        ) : null}
                        {ep.hospitalStay ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Hospital Stay: </Text>Yes</Text>
                        ) : null}
                        {ep.resolvedDate ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Resolved Date: </Text>{ep.resolvedDate}</Text>
                        ) : null}
                        {ep.notes ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Notes: </Text>{ep.notes}</Text>
                        ) : null}
                        <Pressable style={styles.deleteBtn} onPress={() => deleteEpisode(ep.id)}>
                          <Text style={styles.deleteBtnText}>Delete Episode</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            {/* Add button */}
            <Pressable style={styles.addBtn} onPress={openAddComplication}>
              <Text style={styles.addBtnText}>+ Log Complication</Text>
            </Pressable>

            {complications.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No complications logged</Text>
                <Text style={styles.emptyText}>
                  Track infections, hospitalizations, drug toxicities, and other significant events.
                </Text>
              </View>
            ) : (
              complications.map(comp => {
                const sev = SEVERITY_STYLES[comp.severity] ?? SEVERITY_STYLES.mild;
                const isOpen = expandedId === comp.id;
                return (
                  <View key={comp.id} style={styles.card}>
                    <Pressable onPress={() => setExpandedId(isOpen ? null : comp.id)}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardMeta}>
                          <Text style={styles.cardDate}>{comp.date}</Text>
                          <View style={[styles.badge, { backgroundColor: colors.slate100 }]}>
                            <Text style={[styles.badgeText, { color: colors.slate700 }]}>
                              {COMPLICATION_TYPE_LABELS[comp.type] ?? comp.type}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: sev.bg }]}>
                            <Text style={[styles.badgeText, { color: sev.color }]}>
                              {comp.severity.charAt(0).toUpperCase() + comp.severity.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                      </View>
                      <Text style={styles.cardSnippet} numberOfLines={isOpen ? undefined : 1}>
                        {comp.title}
                      </Text>
                      {comp.resolved ? (
                        <View style={[styles.badge, { backgroundColor: colors.emerald50, alignSelf: 'flex-start', marginTop: 4 }]}>
                          <Text style={[styles.badgeText, { color: colors.emerald700 }]}>Resolved</Text>
                        </View>
                      ) : null}
                    </Pressable>

                    {isOpen && (
                      <View style={styles.cardExpanded}>
                        {comp.outcome ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Outcome: </Text>{comp.outcome}</Text>
                        ) : null}
                        {comp.notes ? (
                          <Text style={styles.expandRow}><Text style={styles.expandLabel}>Notes: </Text>{comp.notes}</Text>
                        ) : null}
                        <Pressable style={styles.deleteBtn} onPress={() => deleteComplication(comp.id)}>
                          <Text style={styles.deleteBtnText}>Delete Entry</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Episode Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showEpModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowEpModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Log Episode</Text>
            <Pressable onPress={saveEpisode}>
              <Text style={styles.modalSave}>Save</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} keyboardDismissMode="on-drag">
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={epDate}
              onChangeText={setEpDate}
              placeholder="2025-03-15"
              placeholderTextColor={colors.slate400}
              keyboardType="numbers-and-punctuation"
            />

            <PickerRow
              label="Type"
              value={epType}
              options={[
                { value: 'suspected',         label: 'Suspected' },
                { value: 'borderline',        label: 'Borderline' },
                { value: 'acute',             label: 'Acute' },
                { value: 'chronic',           label: 'Chronic' },
                { value: 'antibody_mediated', label: 'Antibody-Mediated' },
              ]}
              onSelect={setEpType}
            />

            <Text style={styles.fieldLabel}>Biopsy Grade (optional, e.g. Banff 1A)</Text>
            <TextInput
              style={styles.input}
              value={epBiopsyGrade}
              onChangeText={setEpBiopsyGrade}
              placeholder="Banff 1A"
              placeholderTextColor={colors.slate400}
            />

            <Text style={styles.fieldLabel}>Treatment (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={epTreatment}
              onChangeText={setEpTreatment}
              placeholder="e.g. Pulse steroids 500mg × 3 days"
              placeholderTextColor={colors.slate400}
              multiline
            />

            <Toggle value={epResolved} onToggle={() => setEpResolved(v => !v)} label="Resolved" />

            {epResolved && (
              <>
                <Text style={styles.fieldLabel}>Resolved Date (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={epResolvedDate}
                  onChangeText={setEpResolvedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.slate400}
                  keyboardType="numbers-and-punctuation"
                />
              </>
            )}

            <Toggle value={epHospitalStay} onToggle={() => setEpHospitalStay(v => !v)} label="Required Hospital Stay" />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={epNotes}
              onChangeText={setEpNotes}
              placeholder="Additional details..."
              placeholderTextColor={colors.slate400}
              multiline
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Complication Modal ─────────────────────────────────────────────── */}
      <Modal visible={showCompModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCompModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Log Complication</Text>
            <Pressable onPress={saveComplication}>
              <Text style={styles.modalSave}>Save</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} keyboardDismissMode="on-drag">
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={compDate}
              onChangeText={setCompDate}
              placeholder="2025-03-15"
              placeholderTextColor={colors.slate400}
              keyboardType="numbers-and-punctuation"
            />

            <PickerRow
              label="Type"
              value={compType}
              options={[
                { value: 'infection',       label: 'Infection' },
                { value: 'rejection',       label: 'Rejection' },
                { value: 'toxicity',        label: 'Drug Toxicity' },
                { value: 'hospitalization', label: 'Hospitalization' },
                { value: 'procedure',       label: 'Procedure' },
                { value: 'other',           label: 'Other' },
              ]}
              onSelect={setCompType}
            />

            <Text style={styles.fieldLabel}>Title / Description</Text>
            <TextInput
              style={styles.input}
              value={compTitle}
              onChangeText={setCompTitle}
              placeholder="e.g. CMV infection, UTI, BK nephropathy"
              placeholderTextColor={colors.slate400}
            />

            <PickerRow
              label="Severity"
              value={compSeverity}
              options={[
                { value: 'mild',     label: 'Mild' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'severe',   label: 'Severe' },
              ]}
              onSelect={setCompSeverity}
            />

            <Text style={styles.fieldLabel}>Outcome (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={compOutcome}
              onChangeText={setCompOutcome}
              placeholder="e.g. Treated with IV ganciclovir, resolved in 2 weeks"
              placeholderTextColor={colors.slate400}
              multiline
            />

            <Toggle value={compResolved} onToggle={() => setCompResolved(v => !v)} label="Resolved" />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={compNotes}
              onChangeText={setCompNotes}
              placeholder="Additional details..."
              placeholderTextColor={colors.slate400}
              multiline
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backArrow: {
    fontSize: 26,
    color: colors.indigo500,
    marginRight: 2,
    lineHeight: 28,
  },
  backText: {
    fontSize: 16,
    color: colors.indigo500,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate800,
  },
  headerSpacer: { width: 80 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.indigo500,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate500,
  },
  tabTextActive: {
    color: colors.indigo500,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Warning card
  warnCard: {
    backgroundColor: colors.rose50,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.rose200,
    marginBottom: 4,
  },
  warnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.rose700,
    marginBottom: 4,
  },
  warnSub: {
    fontSize: 13,
    color: colors.rose700,
    marginBottom: 10,
    opacity: 0.8,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  warnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.rose500,
    marginTop: 5,
  },
  warnItem: {
    flex: 1,
    fontSize: 13,
    color: colors.rose700,
    lineHeight: 19,
  },

  // Add button
  addBtn: {
    backgroundColor: colors.indigo500,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate600,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate800,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 11,
    color: colors.slate400,
    marginLeft: 8,
  },
  cardSnippet: {
    fontSize: 13,
    color: colors.slate600,
    marginTop: 2,
    lineHeight: 18,
  },
  cardExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    gap: 6,
  },
  expandRow: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 19,
  },
  expandLabel: {
    fontWeight: '600',
    color: colors.slate800,
  },
  deleteBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.rose200,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.rose600,
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.slate800,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.slate500,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.indigo500,
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },

  // Form elements
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate600,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.slate800,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 15,
    color: colors.slate700,
    fontWeight: '500',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate300,
    justifyContent: 'center',
    padding: 3,
  },
  toggleTrackOn: {
    backgroundColor: colors.indigo500,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  pickerBlock: {
    marginTop: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.indigo500,
    borderColor: colors.indigo500,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate600,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
