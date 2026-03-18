import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import type { ClinicalNote, ClinicalNoteType } from '@/data/types';

const NOTE_TYPE_CONFIG: Record<ClinicalNoteType, { icon: string; label: string; color: string; bg: string }> = {
  appointment: { icon: '🏥', label: 'Appointment', color: colors.indigo600, bg: colors.indigo50 },
  phone_call: { icon: '📞', label: 'Phone Call', color: colors.sky700, bg: colors.sky50 },
  message: { icon: '💬', label: 'Message', color: colors.slate600, bg: colors.slate100 },
  instruction: { icon: '📋', label: 'Instruction', color: colors.amber700, bg: colors.amber50 },
  lab_result: { icon: '🧪', label: 'Lab Result', color: colors.emerald700, bg: colors.emerald50 },
  general: { icon: '📝', label: 'General', color: colors.slate500, bg: colors.slate50 },
};

const ALL_TYPES: ClinicalNoteType[] = ['appointment', 'phone_call', 'message', 'instruction', 'lab_result', 'general'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  date: todayStr(),
  type: 'general' as ClinicalNoteType,
  contact: '',
  title: '',
  note: '',
  actionRequired: false,
  followUpDate: '',
};

export default function ClinicalNotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    S.get('clinical_notes').then(data => {
      setNotes(Array.isArray(data) ? data : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      S.set('clinical_notes', notes).then(saved => {
        if (!saved) Burnt.toast({ title: 'Could not save notes', preset: 'error' });
      });
    }
  }, [notes, loaded]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setShowModal(true);
  };

  const openEdit = (note: ClinicalNote) => {
    setEditingId(note.id);
    setForm({
      date: note.date,
      type: note.type,
      contact: note.contact ?? '',
      title: note.title,
      note: note.note,
      actionRequired: note.actionRequired,
      followUpDate: note.followUpDate ?? '',
    });
    setShowModal(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      setNotes(prev => prev.map(n => n.id === editingId ? {
        ...n,
        date: form.date.trim(),
        type: form.type,
        contact: form.contact.trim() || undefined,
        title: form.title.trim(),
        note: form.note.trim(),
        actionRequired: form.actionRequired,
        followUpDate: form.followUpDate.trim() || undefined,
      } : n));
      Burnt.toast({ title: 'Note updated', preset: 'done' });
    } else {
      const newNote: ClinicalNote = {
        id: `cn_${Date.now()}`,
        date: form.date.trim(),
        type: form.type,
        contact: form.contact.trim() || undefined,
        title: form.title.trim(),
        note: form.note.trim(),
        actionRequired: form.actionRequired,
        followUpDate: form.followUpDate.trim() || undefined,
      };
      setNotes(prev => [newNote, ...prev]);
      Burnt.toast({ title: 'Note added', preset: 'done' });
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setShowDeleteConfirm(null);
    setShowModal(false);
    Burnt.toast({ title: 'Note deleted', preset: 'done' });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
    if (!q) return sorted;
    return sorted.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.note.toLowerCase().includes(q) ||
      (n.contact ?? '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  const actionItems = useMemo(() =>
    filtered.filter(n => n.actionRequired),
    [filtered]
  );

  const regularItems = useMemo(() =>
    filtered.filter(n => !n.actionRequired),
    [filtered]
  );

  const renderNote = (note: ClinicalNote, highlight = false) => {
    const tc = NOTE_TYPE_CONFIG[note.type];
    const expanded = expandedIds.has(note.id);
    const preview = note.note.length > 100 ? note.note.slice(0, 100) + '…' : note.note;
    return (
      <Pressable key={note.id} style={[styles.card, highlight ? styles.cardHighlight : null]} onPress={() => toggleExpand(note.id)}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
            <Text style={styles.typeBadgeIcon}>{tc.icon}</Text>
            <Text style={[styles.typeBadgeLabel, { color: tc.color }]}>{tc.label}</Text>
          </View>
          <Text style={styles.cardDate}>{note.date}</Text>
          <Pressable style={styles.editBtnSmall} onPress={() => openEdit(note)}>
            <Text style={styles.editBtnSmallText}>Edit</Text>
          </Pressable>
        </View>

        <Text style={styles.cardTitle}>{note.title}</Text>
        {note.contact ? <Text style={styles.cardContact}>With: {note.contact}</Text> : null}
        <Text style={styles.cardPreview}>{expanded ? note.note : preview}</Text>

        <View style={styles.cardMeta}>
          {note.actionRequired ? (
            <View style={styles.actionChip}>
              <Text style={styles.actionChipText}>⚡ Action Required</Text>
            </View>
          ) : null}
          {note.followUpDate ? (
            <View style={styles.followUpChip}>
              <Text style={styles.followUpChipText}>Follow-up: {note.followUpDate}</Text>
            </View>
          ) : null}
        </View>

        {note.note.length > 100 ? (
          <Text style={styles.expandHint}>{expanded ? 'Tap to collapse' : 'Tap to read more'}</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Clinical Notes</Text>
          <Text style={styles.subtitle}>Appointments, calls & instructions</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes, titles, contacts…"
          placeholderTextColor={colors.slate400}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {notes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No notes yet.</Text>
            <Text style={styles.emptyHint}>Tap + to add notes from appointments and calls.</Text>
          </View>
        ) : null}

        {/* Action Required section */}
        {actionItems.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>⚡ Action Required</Text>
            {actionItems.map(n => renderNote(n, true))}
          </>
        ) : null}

        {/* All notes */}
        {regularItems.length > 0 ? (
          <>
            {actionItems.length > 0 ? <Text style={styles.sectionLabel}>All Notes</Text> : null}
            {regularItems.map(n => renderNote(n, false))}
          </>
        ) : null}

        {filtered.length === 0 && notes.length > 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No results for "{search}"</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Confirm */}
      <Modal visible={showDeleteConfirm !== null} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Delete Note?</Text>
            <Text style={styles.confirmText}>This cannot be undone.</Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmDelete} onPress={() => showDeleteConfirm && remove(showDeleteConfirm)}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Note' : 'Add Note'}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
          <TextInput
            value={form.date}
            onChangeText={t => setForm(f => ({ ...f, date: t }))}
            placeholder="2024-11-01"
            placeholderTextColor={colors.slate300}
            maxLength={10}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {ALL_TYPES.map(t => {
              const tc = NOTE_TYPE_CONFIG[t];
              const active = form.type === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.typeChip, active ? { backgroundColor: tc.bg, borderColor: tc.color } : null]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={styles.typeChipIcon}>{tc.icon}</Text>
                  <Text style={[styles.typeChipLabel, active ? { color: tc.color, fontWeight: '700' } : null]}>{tc.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Contact Name (optional)</Text>
          <TextInput
            value={form.contact}
            onChangeText={t => setForm(f => ({ ...f, contact: t }))}
            placeholder="Dr. Smith, Nurse Line…"
            placeholderTextColor={colors.slate300}
            maxLength={80}
            style={styles.input}
          />

          <Text style={styles.label}>Title *</Text>
          <TextInput
            value={form.title}
            onChangeText={t => setForm(f => ({ ...f, title: t }))}
            placeholder="e.g. Post-op follow-up call"
            placeholderTextColor={colors.slate300}
            maxLength={120}
            style={styles.input}
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            value={form.note}
            onChangeText={t => setForm(f => ({ ...f, note: t }))}
            placeholder="What was discussed, instructions given, results shared…"
            placeholderTextColor={colors.slate300}
            maxLength={2000}
            style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 14 }]}
            multiline
          />

          <Pressable
            style={[styles.actionToggle, form.actionRequired ? styles.actionToggleActive : null]}
            onPress={() => setForm(f => ({ ...f, actionRequired: !f.actionRequired }))}
          >
            <Text style={[styles.actionToggleText, form.actionRequired ? styles.actionToggleTextActive : null]}>
              {form.actionRequired ? '⚡ Action Required — ON' : 'Mark as Action Required'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Follow-up Date (optional, YYYY-MM-DD)</Text>
          <TextInput
            value={form.followUpDate}
            onChangeText={t => setForm(f => ({ ...f, followUpDate: t }))}
            placeholder="2024-11-15"
            placeholderTextColor={colors.slate300}
            maxLength={10}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
          />

          <Pressable
            style={[styles.saveBtn, !form.title.trim() ? styles.btnDisabled : null]}
            disabled={!form.title.trim()}
            onPress={save}
          >
            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Note'}</Text>
          </Pressable>

          {editingId ? (
            <Pressable style={styles.deleteBtn} onPress={() => { setShowModal(false); setShowDeleteConfirm(editingId); }}>
              <Text style={styles.deleteBtnText}>🗑 Delete Note</Text>
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
  addBtn: { backgroundColor: colors.indigo500, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, fontWeight: '700', color: colors.white, marginTop: -2 },
  searchBar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  searchInput: { height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.slate100, fontSize: 15, color: colors.slate800 },
  list: { flex: 1 },
  listContent: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: colors.slate400, textAlign: 'center', paddingHorizontal: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate500, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.slate200, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHighlight: { backgroundColor: colors.amber50, borderColor: colors.amber400 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  typeBadgeIcon: { fontSize: 11 },
  typeBadgeLabel: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: colors.slate400, marginLeft: 4 },
  editBtnSmall: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editBtnSmallText: { fontSize: 11, fontWeight: '600', color: colors.slate600 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.slate800, marginBottom: 4 },
  cardContact: { fontSize: 12, color: colors.slate500, marginBottom: 4 },
  cardPreview: { fontSize: 13, color: colors.slate600, lineHeight: 19 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionChip: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  actionChipText: { fontSize: 11, fontWeight: '700', color: colors.rose600 },
  followUpChip: { backgroundColor: colors.indigo50, borderWidth: 1, borderColor: colors.indigo200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  followUpChipText: { fontSize: 11, fontWeight: '600', color: colors.indigo600 },
  expandHint: { fontSize: 11, color: colors.slate400, marginTop: 8 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmBox: { backgroundColor: colors.white, borderRadius: 16, padding: 24, width: 280 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: colors.slate800, marginBottom: 8 },
  confirmText: { fontSize: 14, color: colors.slate500, marginBottom: 20 },
  confirmRow: { flexDirection: 'row', gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.slate200, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  confirmDelete: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.rose500, alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: colors.white },
  modal: { flex: 1, backgroundColor: colors.slate50 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  modalClose: { fontSize: 20, color: colors.slate500, padding: 4 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 16 },
  input: { height: 50, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, fontSize: 16, fontWeight: '500', color: colors.slate800 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.slate100, borderWidth: 1.5, borderColor: colors.slate200 },
  typeChipIcon: { fontSize: 13 },
  typeChipLabel: { fontSize: 12, fontWeight: '500', color: colors.slate600 },
  actionToggle: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, alignItems: 'center' },
  actionToggleActive: { borderColor: colors.rose400, backgroundColor: colors.rose50 },
  actionToggleText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  actionToggleTextActive: { color: colors.rose600 },
  saveBtn: { marginTop: 24, backgroundColor: colors.indigo500, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  deleteBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.rose200 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: colors.rose500 },
  btnDisabled: { backgroundColor: colors.slate300 },
});
