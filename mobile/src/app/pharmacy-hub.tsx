import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import type { Pharmacy } from '@/data/types';

const COMMON_PHARMACIES = [
  { name: 'Walgreens', phone: '1-800-925-4733', website: 'https://www.walgreens.com/pharmacy' },
  { name: 'CVS Pharmacy', phone: '1-800-746-7287', website: 'https://www.cvs.com/pharmacy' },
  { name: 'Walmart Pharmacy', phone: '1-800-925-6278', website: 'https://www.walmart.com/cp/pharmacy' },
  { name: 'Safeway Pharmacy', phone: '1-877-723-3929', website: 'https://www.safeway.com/pharmacy' },
  { name: 'Rite Aid', phone: '1-800-748-3243', website: 'https://www.riteaid.com/pharmacy' },
  { name: 'Costco Pharmacy', phone: '1-800-955-2292', website: 'https://www.costco.com/pharmacy' },
];

export default function PharmacyHubScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);

  useEffect(() => {
    S.get('pharmacies').then(data => {
      setPharmacies(Array.isArray(data) ? data : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      S.set('pharmacies', pharmacies).then(saved => {
        if (!saved) Burnt.toast({ title: 'Could not save pharmacies', preset: 'error' });
      });
    }
  }, [pharmacies, loaded]);

  const openAdd = () => {
    setEditingId(null);
    setFormName(''); setFormPhone(''); setFormWebsite('');
    setFormAddress(''); setFormNotes(''); setFormIsPrimary(false);
    setShowModal(true);
  };

  const openEdit = (ph: Pharmacy) => {
    setEditingId(ph.id);
    setFormName(ph.name);
    setFormPhone(ph.phone ?? '');
    setFormWebsite(ph.website ?? '');
    setFormAddress(ph.address ?? '');
    setFormNotes(ph.notes ?? '');
    setFormIsPrimary(ph.isPrimary ?? false);
    setShowModal(true);
  };

  const seedCommon = (ph: typeof COMMON_PHARMACIES[number]) => {
    setFormName(ph.name);
    setFormPhone(ph.phone);
    setFormWebsite(ph.website);
  };

  const save = () => {
    if (!formName.trim()) return;
    if (editingId) {
      setPharmacies(prev => prev.map(p => p.id === editingId ? {
        ...p,
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isPrimary: formIsPrimary,
      } : p));
    } else {
      const newPh: Pharmacy = {
        id: `ph_${Date.now()}`,
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isPrimary: formIsPrimary,
      };
      setPharmacies(prev => [...prev, newPh]);
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setPharmacies(prev => prev.filter(p => p.id !== id));
    setShowModal(false);
  };

  const setPrimary = (id: string) => {
    setPharmacies(prev => prev.map(p => ({ ...p, isPrimary: p.id === id })));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pharmacy Hub</Text>
          <Text style={styles.subtitle}>Your saved pharmacies</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {pharmacies.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyText}>No pharmacies saved yet.</Text>
            <Text style={styles.emptyHint}>Tap "+ Add" to add your pharmacy.</Text>
          </View>
        ) : null}

        {pharmacies.map(ph => (
          <View key={ph.id} style={[styles.card, ph.isPrimary ? styles.cardPrimary : null]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardName}>{ph.name}</Text>
                  {ph.isPrimary ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                {ph.address ? <Text style={styles.cardAddr}>{ph.address}</Text> : null}
                {ph.notes ? <Text style={styles.cardNotes}>{ph.notes}</Text> : null}
              </View>
              <Pressable onPress={() => openEdit(ph)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              {ph.phone ? (
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${ph.phone}`)}>
                  <Text style={styles.actionBtnText}>📞 Call</Text>
                </Pressable>
              ) : null}
              {ph.address ? (
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`maps://?q=${encodeURIComponent(ph.address ?? '')}`)}>
                  <Text style={styles.actionBtnText}>🗺️ Directions</Text>
                </Pressable>
              ) : null}
              {ph.website ? (
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(ph.website ?? '')}>
                  <Text style={styles.actionBtnText}>🌐 Website</Text>
                </Pressable>
              ) : null}
              {!ph.isPrimary ? (
                <Pressable style={[styles.actionBtn, { marginLeft: 'auto' }]} onPress={() => setPrimary(ph.id)}>
                  <Text style={styles.actionBtnText}>Set Primary</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>Manual / Web Assisted — no live pharmacy sync. Call your pharmacy for real-time refill status.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Pharmacy' : 'Add Pharmacy'}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          {/* Quick-seed common pharmacies */}
          {!editingId ? (
            <View style={styles.seedSection}>
              <Text style={styles.seedLabel}>Quick Add</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                {COMMON_PHARMACIES.map(ph => (
                  <Pressable key={ph.name} style={styles.seedChip} onPress={() => seedCommon(ph)}>
                    <Text style={styles.seedChipText}>{ph.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.label}>Pharmacy Name *</Text>
          <TextInput value={formName} onChangeText={setFormName} placeholder="e.g. CVS Pharmacy" placeholderTextColor={colors.slate300} maxLength={80} style={styles.input} />

          <Text style={styles.label}>Phone</Text>
          <TextInput value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" placeholder="(555) 123-4567" placeholderTextColor={colors.slate300} maxLength={20} style={styles.input} />

          <Text style={styles.label}>Website</Text>
          <TextInput value={formWebsite} onChangeText={setFormWebsite} keyboardType="url" placeholder="https://..." placeholderTextColor={colors.slate300} maxLength={200} style={styles.input} autoCapitalize="none" />

          <Text style={styles.label}>Address</Text>
          <TextInput value={formAddress} onChangeText={setFormAddress} placeholder="123 Main St, City, State" placeholderTextColor={colors.slate300} maxLength={200} style={styles.input} />

          <Text style={styles.label}>Notes</Text>
          <TextInput value={formNotes} onChangeText={setFormNotes} placeholder="Hours, specialist, notes…" placeholderTextColor={colors.slate300} maxLength={300} style={styles.input} />

          <Pressable style={[styles.primaryToggle, formIsPrimary ? styles.primaryToggleActive : null]} onPress={() => setFormIsPrimary(!formIsPrimary)}>
            <Text style={[styles.primaryToggleText, formIsPrimary ? styles.primaryToggleTextActive : null]}>
              {formIsPrimary ? '★ Primary Pharmacy' : 'Set as Primary Pharmacy'}
            </Text>
          </Pressable>

          <Pressable style={[styles.saveBtn, !formName.trim() ? styles.btnDisabled : null]} disabled={!formName.trim()} onPress={save}>
            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Pharmacy'}</Text>
          </Pressable>

          {editingId ? (
            <Pressable style={styles.deleteBtn} onPress={() => remove(editingId)}>
              <Text style={styles.deleteBtnText}>🗑 Remove Pharmacy</Text>
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
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.slate600, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: colors.slate400 },
  card: { borderWidth: 1.5, borderColor: colors.slate200, borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  cardPrimary: { borderColor: colors.indigo400, backgroundColor: colors.indigo50 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  cardAddr: { fontSize: 12, color: colors.slate500, marginTop: 3 },
  cardNotes: { fontSize: 12, color: colors.slate400, marginTop: 3, fontStyle: 'italic' },
  primaryBadge: { backgroundColor: colors.indigo500, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  disclaimer: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: colors.slate100 },
  disclaimerText: { fontSize: 11, color: colors.slate500, lineHeight: 17, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: colors.slate50 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  modalClose: { fontSize: 20, color: colors.slate500, padding: 4 },
  seedSection: { marginBottom: 16 },
  seedLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.slate500, marginBottom: 8 },
  seedChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 },
  seedChipText: { fontSize: 12, fontWeight: '600', color: colors.slate700 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 16 },
  input: { height: 50, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, fontSize: 16, fontWeight: '500', color: colors.slate800 },
  primaryToggle: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, alignItems: 'center' },
  primaryToggleActive: { borderColor: colors.indigo500, backgroundColor: colors.indigo50 },
  primaryToggleText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  primaryToggleTextActive: { color: colors.indigo600 },
  saveBtn: { marginTop: 20, backgroundColor: colors.indigo500, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  deleteBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.rose200 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: colors.rose500 },
  btnDisabled: { backgroundColor: colors.slate300 },
});
