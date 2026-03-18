import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import type { VaccinationRecord, VaccineStatus } from '@/data/types';

const RECOMMENDED_VACCINES = [
  { vaccine: 'Influenza (Inactivated)', isLive: false, notes: 'Annual. Inactivated only — NOT the nasal spray (FluMist).' },
  { vaccine: 'Pneumococcal (PCV15/PPSV23)', isLive: false, notes: 'One-time series + booster per team guidance.' },
  { vaccine: 'COVID-19 Booster', isLive: false, notes: 'Per current CDC schedule for immunocompromised.' },
  { vaccine: 'Hepatitis B', isLive: false, notes: 'Check antibody titer; revaccinate if not immune.' },
  { vaccine: 'Tetanus/Tdap', isLive: false, notes: 'Booster every 10 years.' },
  { vaccine: 'MMR (Measles/Mumps/Rubella)', isLive: true, notes: 'LIVE VACCINE — contraindicated after transplant.' },
  { vaccine: 'Varicella (Chickenpox)', isLive: true, notes: 'LIVE VACCINE — contraindicated after transplant.' },
  { vaccine: 'Shingles (Zostavax)', isLive: true, notes: 'LIVE VACCINE — contraindicated. Shingrix (recombinant) may be OK — ask team.' },
  { vaccine: 'Yellow Fever', isLive: true, notes: 'LIVE VACCINE — contraindicated unless life-threatening exposure risk.' },
  { vaccine: 'Live Flu (FluMist)', isLive: true, notes: 'LIVE VACCINE — use inactivated flu shot only.' },
];

const STATUS_CONFIG: Record<VaccineStatus, { label: string; bg: string; color: string }> = {
  up_to_date: { label: 'Up to Date', bg: colors.emerald50, color: colors.emerald700 },
  due_soon: { label: 'Due Soon', bg: colors.amber50, color: colors.amber700 },
  overdue: { label: 'Overdue', bg: colors.rose50, color: colors.rose600 },
  contraindicated: { label: 'Contraindicated', bg: colors.rose600, color: colors.white },
  not_applicable: { label: 'Not Set', bg: colors.slate100, color: colors.slate600 },
  deferred: { label: 'Deferred', bg: colors.slate200, color: colors.slate600 },
};

const ALL_STATUSES: VaccineStatus[] = ['up_to_date', 'due_soon', 'overdue', 'contraindicated', 'not_applicable', 'deferred'];

const EMPTY_FORM = {
  vaccine: '',
  isLive: false,
  status: 'not_applicable' as VaccineStatus,
  date: '',
  nextDue: '',
  administeredBy: '',
  lotNumber: '',
  notes: '',
};

export default function VaccinationRecordScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    S.get('vaccination_records').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setRecords(data);
      } else {
        const seeded: VaccinationRecord[] = RECOMMENDED_VACCINES.map((v, i) => ({
          id: `vax_${Date.now()}_${i}`,
          vaccine: v.vaccine,
          isLive: v.isLive,
          status: v.isLive ? 'contraindicated' : 'not_applicable',
          notes: v.notes,
        }));
        setRecords(seeded);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      S.set('vaccination_records', records).then(saved => {
        if (!saved) Burnt.toast({ title: 'Could not save records', preset: 'error' });
      });
    }
  }, [records, loaded]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (rec: VaccinationRecord) => {
    setEditingId(rec.id);
    setForm({
      vaccine: rec.vaccine,
      isLive: rec.isLive,
      status: rec.status,
      date: rec.date ?? '',
      nextDue: rec.nextDue ?? '',
      administeredBy: rec.administeredBy ?? '',
      lotNumber: rec.lotNumber ?? '',
      notes: rec.notes ?? '',
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.vaccine.trim()) return;
    if (editingId) {
      setRecords(prev => prev.map(r => r.id === editingId ? {
        ...r,
        vaccine: form.vaccine.trim(),
        isLive: form.isLive,
        status: form.status,
        date: form.date.trim() || undefined,
        nextDue: form.nextDue.trim() || undefined,
        administeredBy: form.administeredBy.trim() || undefined,
        lotNumber: form.lotNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      } : r));
      Burnt.toast({ title: 'Record updated', preset: 'done' });
    } else {
      const newRec: VaccinationRecord = {
        id: `vax_${Date.now()}`,
        vaccine: form.vaccine.trim(),
        isLive: form.isLive,
        status: form.status,
        date: form.date.trim() || undefined,
        nextDue: form.nextDue.trim() || undefined,
        administeredBy: form.administeredBy.trim() || undefined,
        lotNumber: form.lotNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      setRecords(prev => [...prev, newRec]);
      Burnt.toast({ title: 'Vaccine added', preset: 'done' });
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setShowModal(false);
    Burnt.toast({ title: 'Removed', preset: 'done' });
  };

  const safeVaccines = records.filter(r => !r.isLive);
  const liveVaccines = records.filter(r => r.isLive);

  const renderCard = (rec: VaccinationRecord) => {
    const sc = STATUS_CONFIG[rec.status];
    const isLiveCard = rec.isLive;
    return (
      <View key={rec.id} style={[styles.card, isLiveCard ? styles.cardLive : null]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, isLiveCard ? styles.cardNameLive : null]}>{rec.vaccine}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>
        {(rec.date || rec.nextDue) ? (
          <View style={styles.datesRow}>
            {rec.date ? <Text style={styles.dateText}>Given: {rec.date}</Text> : null}
            {rec.nextDue ? <Text style={styles.dateText}>Next due: {rec.nextDue}</Text> : null}
          </View>
        ) : null}
        {rec.notes ? <Text style={styles.cardNotes}>{rec.notes}</Text> : null}
        <Pressable style={styles.editBtn} onPress={() => openEdit(rec)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Vaccination Record</Text>
          <Text style={styles.subtitle}>Transplant immunization tracker</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {/* Warning Banner */}
        <View style={styles.warnBanner}>
          <Text style={styles.warnTitle}>⚠️ Live Vaccine Warning</Text>
          <Text style={styles.warnText}>
            Live attenuated vaccines are generally contraindicated after transplant due to immunosuppression. Always consult your transplant team before any vaccination.
          </Text>
        </View>

        {/* Safe Vaccines */}
        <Text style={styles.sectionLabel}>Safe Vaccines (Inactivated)</Text>
        {safeVaccines.length === 0 ? (
          <Text style={styles.emptySection}>No safe vaccines recorded.</Text>
        ) : (
          safeVaccines.map(renderCard)
        )}

        {/* Live / Contraindicated */}
        <Text style={[styles.sectionLabel, styles.sectionLabelDanger]}>Contraindicated (Live Vaccines)</Text>
        <View style={styles.liveBanner}>
          <Text style={styles.liveBannerText}>The vaccines below are live and should NOT be administered after transplant without explicit team approval.</Text>
        </View>
        {liveVaccines.length === 0 ? (
          <Text style={styles.emptySection}>No live vaccines recorded.</Text>
        ) : (
          liveVaccines.map(renderCard)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Vaccine' : 'Add Vaccine'}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Vaccine Name *</Text>
          <TextInput
            value={form.vaccine}
            onChangeText={t => setForm(f => ({ ...f, vaccine: t }))}
            placeholder="e.g. Hepatitis B"
            placeholderTextColor={colors.slate300}
            maxLength={100}
            style={styles.input}
          />

          <Text style={styles.label}>Live Vaccine</Text>
          <Pressable
            style={[styles.toggle, form.isLive ? styles.toggleDanger : styles.toggleOff]}
            onPress={() => setForm(f => ({ ...f, isLive: !f.isLive }))}
          >
            <Text style={[styles.toggleText, form.isLive ? styles.toggleTextDanger : null]}>
              {form.isLive ? '⚠️ Live Vaccine (Contraindicated)' : 'Inactivated / Safe'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusGrid}>
            {ALL_STATUSES.map(s => {
              const sc = STATUS_CONFIG[s];
              const active = form.status === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.statusChip, active ? { backgroundColor: sc.bg, borderColor: sc.color } : null]}
                  onPress={() => setForm(f => ({ ...f, status: s }))}
                >
                  <Text style={[styles.statusChipText, active ? { color: sc.color, fontWeight: '700' } : null]}>{sc.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Date Given (YYYY-MM-DD)</Text>
          <TextInput
            value={form.date}
            onChangeText={t => setForm(f => ({ ...f, date: t }))}
            placeholder="2024-10-15"
            placeholderTextColor={colors.slate300}
            maxLength={10}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Next Due Date (YYYY-MM-DD)</Text>
          <TextInput
            value={form.nextDue}
            onChangeText={t => setForm(f => ({ ...f, nextDue: t }))}
            placeholder="2025-10-15"
            placeholderTextColor={colors.slate300}
            maxLength={10}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Administered By</Text>
          <TextInput
            value={form.administeredBy}
            onChangeText={t => setForm(f => ({ ...f, administeredBy: t }))}
            placeholder="Doctor or clinic name"
            placeholderTextColor={colors.slate300}
            maxLength={100}
            style={styles.input}
          />

          <Text style={styles.label}>Lot Number</Text>
          <TextInput
            value={form.lotNumber}
            onChangeText={t => setForm(f => ({ ...f, lotNumber: t }))}
            placeholder="e.g. AB1234"
            placeholderTextColor={colors.slate300}
            maxLength={50}
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={t => setForm(f => ({ ...f, notes: t }))}
            placeholder="Reactions, reminders, team guidance…"
            placeholderTextColor={colors.slate300}
            maxLength={400}
            style={[styles.input, styles.inputMulti]}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.saveBtn, !form.vaccine.trim() ? styles.btnDisabled : null]}
            disabled={!form.vaccine.trim()}
            onPress={save}
          >
            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Vaccine'}</Text>
          </Pressable>

          {editingId ? (
            <Pressable style={styles.deleteBtn} onPress={() => remove(editingId)}>
              <Text style={styles.deleteBtnText}>🗑 Remove Record</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { fontSize: 15, color: colors.indigo500, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  addBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  list: { flex: 1 },
  listContent: { padding: 16 },
  warnBanner: { backgroundColor: colors.amber50, borderWidth: 1.5, borderColor: colors.amber400, borderRadius: 12, padding: 14, marginBottom: 20 },
  warnTitle: { fontSize: 14, fontWeight: '700', color: colors.amber700, marginBottom: 6 },
  warnText: { fontSize: 13, color: colors.amber700, lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate500, marginBottom: 10, marginTop: 4 },
  sectionLabelDanger: { color: colors.rose600, marginTop: 24 },
  emptySection: { fontSize: 13, color: colors.slate400, marginBottom: 16 },
  liveBanner: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: 10, padding: 10, marginBottom: 12 },
  liveBannerText: { fontSize: 12, color: colors.rose700, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.slate200, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardLive: { backgroundColor: colors.rose50, borderColor: colors.rose200 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.slate800 },
  cardNameLive: { color: colors.rose700 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  datesRow: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  dateText: { fontSize: 12, color: colors.slate500 },
  cardNotes: { fontSize: 12, color: colors.slate500, lineHeight: 17, fontStyle: 'italic', marginTop: 4 },
  editBtn: { marginTop: 10, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  modal: { flex: 1, backgroundColor: colors.slate50 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  modalClose: { fontSize: 20, color: colors.slate500, padding: 4 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 16 },
  input: { height: 50, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, fontSize: 16, fontWeight: '500', color: colors.slate800 },
  inputMulti: { height: 90, paddingTop: 14 },
  toggle: { padding: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  toggleOff: { borderColor: colors.slate200, backgroundColor: colors.white },
  toggleDanger: { borderColor: colors.rose400, backgroundColor: colors.rose50 },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  toggleTextDanger: { color: colors.rose600 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.slate100, borderWidth: 1.5, borderColor: colors.slate200 },
  statusChipText: { fontSize: 12, fontWeight: '500', color: colors.slate600 },
  saveBtn: { marginTop: 24, backgroundColor: colors.indigo500, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  deleteBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.rose200 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: colors.rose500 },
  btnDisabled: { backgroundColor: colors.slate300 },
});
