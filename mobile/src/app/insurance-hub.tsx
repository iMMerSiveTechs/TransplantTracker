import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, Clipboard } from 'react-native';
import { useRouter } from 'expo-router';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import S from '@/utils/storage';
import type { InsurancePlan, Medication } from '@/data/types';

const PRIOR_AUTH_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  not_needed: { label: 'No Auth Needed', color: colors.emerald700, bg: colors.emerald50 },
  pending:    { label: 'Pending',        color: colors.amber700,   bg: colors.amber50 },
  approved:   { label: 'Approved',       color: colors.emerald700, bg: colors.emerald50 },
  denied:     { label: 'Denied',         color: colors.rose700,    bg: colors.rose50 },
};

export default function InsuranceHubScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formPlanName, setFormPlanName] = useState('');
  const [formPayerName, setFormPayerName] = useState('');
  const [formMemberId, setFormMemberId] = useState('');
  const [formGroupNum, setFormGroupNum] = useState('');
  const [formBin, setFormBin] = useState('');
  const [formPcn, setFormPcn] = useState('');
  const [formRxGroup, setFormRxGroup] = useState('');
  const [formEffDate, setFormEffDate] = useState('');
  const [formPbmName, setFormPbmName] = useState('');
  const [formPbmPhone, setFormPbmPhone] = useState('');
  const [formDeductible, setFormDeductible] = useState('');
  const [formOopMax, setFormOopMax] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);

  useEffect(() => {
    Promise.all([S.get('insurance_plans'), S.get('medications')]).then(([plans, meds]) => {
      setPlans(Array.isArray(plans) ? plans : []);
      setMeds(Array.isArray(meds) ? meds : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      S.set('insurance_plans', plans).then(saved => {
        if (!saved) Burnt.toast({ title: 'Could not save insurance plans', preset: 'error' });
      });
    }
  }, [plans, loaded]);

  const openAdd = () => {
    setEditingId(null);
    setFormPlanName(''); setFormPayerName(''); setFormMemberId('');
    setFormGroupNum(''); setFormBin(''); setFormPcn(''); setFormRxGroup('');
    setFormEffDate(''); setFormPbmName(''); setFormPbmPhone('');
    setFormDeductible(''); setFormOopMax(''); setFormNotes('');
    setFormIsPrimary(false);
    setShowModal(true);
  };

  const openEdit = (plan: InsurancePlan) => {
    setEditingId(plan.id);
    setFormPlanName(plan.planName);
    setFormPayerName(plan.payerName);
    setFormMemberId(plan.memberId);
    setFormGroupNum(plan.groupNumber ?? '');
    setFormBin(plan.bin ?? '');
    setFormPcn(plan.pcn ?? '');
    setFormRxGroup(plan.rxGroup ?? '');
    setFormEffDate(plan.effectiveDate ?? '');
    setFormPbmName(plan.pbmName ?? '');
    setFormPbmPhone(plan.pbmPhone ?? '');
    setFormDeductible(plan.deductible ?? '');
    setFormOopMax(plan.oopMax ?? '');
    setFormNotes(plan.notes ?? '');
    setFormIsPrimary(plan.isPrimary ?? false);
    setShowModal(true);
  };

  const save = () => {
    if (!formPlanName.trim() || !formMemberId.trim()) {
      Burnt.toast({ title: 'Plan name and Member ID are required', preset: 'error' });
      return;
    }
    const planData: Omit<InsurancePlan, 'id'> = {
      planName: formPlanName.trim(),
      payerName: formPayerName.trim(),
      memberId: formMemberId.trim(),
      groupNumber: formGroupNum.trim() || undefined,
      bin: formBin.trim() || undefined,
      pcn: formPcn.trim() || undefined,
      rxGroup: formRxGroup.trim() || undefined,
      effectiveDate: formEffDate.trim() || undefined,
      pbmName: formPbmName.trim() || undefined,
      pbmPhone: formPbmPhone.trim() || undefined,
      deductible: formDeductible.trim() || undefined,
      oopMax: formOopMax.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isPrimary: formIsPrimary,
    };
    if (editingId) {
      setPlans(prev => prev.map(p => p.id === editingId ? { ...p, ...planData } : p));
    } else {
      setPlans(prev => [...prev, { id: `ins_${Date.now()}`, ...planData }]);
    }
    setShowModal(false);
  };

  const remove = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    setShowModal(false);
  };

  const copyMemberId = (id: string) => {
    Clipboard.setString(id);
    Burnt.toast({ title: 'Member ID copied', preset: 'done' });
  };

  const setPrimary = (id: string) => {
    setPlans(prev => prev.map(p => ({ ...p, isPrimary: p.id === id })));
  };

  // Meds that have prior auth status set
  const medsWithAuth = meds.filter(m => m.priorAuthStatus && m.priorAuthStatus !== 'not_needed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Insurance Hub</Text>
          <Text style={styles.subtitle}>Plans & prior authorizations</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {plans.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyText}>No insurance plans saved yet.</Text>
            <Text style={styles.emptyHint}>Tap "+ Add" to add your insurance plan.</Text>
          </View>
        ) : null}

        {plans.map(plan => {
          const isExpanded = expandedId === plan.id;
          return (
            <View key={plan.id} style={[styles.card, plan.isPrimary ? styles.cardPrimary : null]}>
              <Pressable onPress={() => setExpandedId(isExpanded ? null : plan.id)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.cardName}>{plan.planName}</Text>
                      {plan.isPrimary ? (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardPayer}>{plan.payerName}</Text>
                  </View>
                  <Pressable onPress={() => openEdit(plan)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {/* Member ID tap-to-copy */}
                <Pressable style={styles.memberIdRow} onPress={() => copyMemberId(plan.memberId)}>
                  <Text style={styles.memberIdLabel}>Member ID</Text>
                  <Text style={styles.memberId}>{plan.memberId}</Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </Pressable>
              </Pressable>

              {isExpanded ? (
                <View style={styles.expanded}>
                  {plan.groupNumber ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Group #</Text><Text style={styles.detailValue}>{plan.groupNumber}</Text></View> : null}
                  {plan.bin ? <View style={styles.detailRow}><Text style={styles.detailLabel}>BIN</Text><Text style={styles.detailValue}>{plan.bin}</Text></View> : null}
                  {plan.pcn ? <View style={styles.detailRow}><Text style={styles.detailLabel}>PCN</Text><Text style={styles.detailValue}>{plan.pcn}</Text></View> : null}
                  {plan.rxGroup ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Rx Group</Text><Text style={styles.detailValue}>{plan.rxGroup}</Text></View> : null}
                  {plan.effectiveDate ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Effective</Text><Text style={styles.detailValue}>{plan.effectiveDate}</Text></View> : null}
                  {plan.pbmName ? <View style={styles.detailRow}><Text style={styles.detailLabel}>PBM</Text><Text style={styles.detailValue}>{plan.pbmName}{plan.pbmPhone ? ` · ${plan.pbmPhone}` : ''}</Text></View> : null}
                  {plan.deductible ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Deductible</Text><Text style={styles.detailValue}>${plan.deductible}</Text></View> : null}
                  {plan.oopMax ? <View style={styles.detailRow}><Text style={styles.detailLabel}>OOP Max</Text><Text style={styles.detailValue}>${plan.oopMax}</Text></View> : null}
                  {plan.notes ? <Text style={styles.cardNotes}>{plan.notes}</Text> : null}

                  {!plan.isPrimary ? (
                    <Pressable style={styles.setPrimaryBtn} onPress={() => setPrimary(plan.id)}>
                      <Text style={styles.setPrimaryText}>Set as Primary Plan</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Prior Auth Tracker */}
        {medsWithAuth.length > 0 ? (
          <View style={styles.priorAuthSection}>
            <Text style={styles.priorAuthTitle}>Prior Authorization Status</Text>
            {medsWithAuth.map(med => {
              const cfg = PRIOR_AUTH_LABELS[med.priorAuthStatus ?? 'not_needed'];
              return (
                <View key={med.id} style={[styles.priorAuthCard, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.priorAuthMed}>{med.name}</Text>
                  <View style={[styles.priorAuthBadge, { backgroundColor: cfg.color }]}>
                    <Text style={styles.priorAuthBadgeText}>{cfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Plan' : 'Add Insurance Plan'}</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Plan Name *</Text>
          <TextInput value={formPlanName} onChangeText={setFormPlanName} placeholder="e.g. BCBS Gold Plan" placeholderTextColor={colors.slate300} maxLength={80} style={styles.input} />

          <Text style={styles.label}>Payer / Insurance Company</Text>
          <TextInput value={formPayerName} onChangeText={setFormPayerName} placeholder="e.g. Blue Cross Blue Shield" placeholderTextColor={colors.slate300} maxLength={80} style={styles.input} />

          <Text style={styles.label}>Member ID *</Text>
          <TextInput value={formMemberId} onChangeText={setFormMemberId} placeholder="Your member ID" placeholderTextColor={colors.slate300} maxLength={40} style={styles.input} autoCapitalize="none" />

          <Text style={styles.label}>Group Number</Text>
          <TextInput value={formGroupNum} onChangeText={setFormGroupNum} placeholder="Group #" placeholderTextColor={colors.slate300} maxLength={30} style={styles.input} autoCapitalize="none" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>BIN</Text>
              <TextInput value={formBin} onChangeText={setFormBin} placeholder="BIN" placeholderTextColor={colors.slate300} maxLength={10} style={styles.input} keyboardType="number-pad" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>PCN</Text>
              <TextInput value={formPcn} onChangeText={setFormPcn} placeholder="PCN" placeholderTextColor={colors.slate300} maxLength={20} style={styles.input} autoCapitalize="none" />
            </View>
          </View>

          <Text style={styles.label}>Rx Group</Text>
          <TextInput value={formRxGroup} onChangeText={setFormRxGroup} placeholder="Rx Group" placeholderTextColor={colors.slate300} maxLength={30} style={styles.input} autoCapitalize="none" />

          <Text style={styles.label}>Effective Date (YYYY-MM-DD)</Text>
          <TextInput value={formEffDate} onChangeText={setFormEffDate} placeholder="2025-01-01" placeholderTextColor={colors.slate300} maxLength={10} style={styles.input} keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>PBM (Pharmacy Benefit Manager)</Text>
          <TextInput value={formPbmName} onChangeText={setFormPbmName} placeholder="e.g. Express Scripts" placeholderTextColor={colors.slate300} maxLength={80} style={styles.input} />

          <Text style={styles.label}>PBM Phone</Text>
          <TextInput value={formPbmPhone} onChangeText={setFormPbmPhone} keyboardType="phone-pad" placeholder="1-800-000-0000" placeholderTextColor={colors.slate300} maxLength={20} style={styles.input} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Deductible ($)</Text>
              <TextInput value={formDeductible} onChangeText={setFormDeductible} keyboardType="decimal-pad" placeholder="1500" placeholderTextColor={colors.slate300} maxLength={8} style={styles.input} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>OOP Max ($)</Text>
              <TextInput value={formOopMax} onChangeText={setFormOopMax} keyboardType="decimal-pad" placeholder="5000" placeholderTextColor={colors.slate300} maxLength={8} style={styles.input} />
            </View>
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput value={formNotes} onChangeText={setFormNotes} placeholder="Coverage notes, copay details…" placeholderTextColor={colors.slate300} maxLength={400} style={styles.input} />

          <Pressable style={[styles.primaryToggle, formIsPrimary ? styles.primaryToggleActive : null]} onPress={() => setFormIsPrimary(!formIsPrimary)}>
            <Text style={[styles.primaryToggleText, formIsPrimary ? styles.primaryToggleTextActive : null]}>
              {formIsPrimary ? '★ Primary Plan' : 'Set as Primary Plan'}
            </Text>
          </Pressable>

          <Pressable style={[styles.saveBtn, (!formPlanName.trim() || !formMemberId.trim()) ? styles.btnDisabled : null]} disabled={!formPlanName.trim() || !formMemberId.trim()} onPress={save}>
            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Plan'}</Text>
          </Pressable>

          {editingId ? (
            <Pressable style={styles.deleteBtn} onPress={() => remove(editingId)}>
              <Text style={styles.deleteBtnText}>🗑 Remove Plan</Text>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  cardPayer: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  cardNotes: { fontSize: 12, color: colors.slate400, fontStyle: 'italic', marginTop: 8, lineHeight: 17 },
  primaryBadge: { backgroundColor: colors.indigo500, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  chevron: { fontSize: 10, color: colors.slate400 },
  memberIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.slate100, padding: 10, borderRadius: 10, marginBottom: 4 },
  memberIdLabel: { fontSize: 11, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberId: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.slate800 },
  copyHint: { fontSize: 10, color: colors.indigo500, fontWeight: '600' },
  expanded: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.slate200 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.slate800 },
  setPrimaryBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.indigo50, alignItems: 'center', borderWidth: 1, borderColor: colors.indigo200 },
  setPrimaryText: { fontSize: 13, fontWeight: '600', color: colors.indigo600 },
  priorAuthSection: { marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.slate200, backgroundColor: colors.white },
  priorAuthTitle: { fontSize: 13, fontWeight: '700', color: colors.slate700, marginBottom: 10 },
  priorAuthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 10, marginBottom: 6 },
  priorAuthMed: { fontSize: 13, fontWeight: '600', color: colors.slate800, flex: 1 },
  priorAuthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  priorAuthBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  modal: { flex: 1, backgroundColor: colors.slate50 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  modalClose: { fontSize: 20, color: colors.slate500, padding: 4 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 16 },
  input: { height: 50, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, fontSize: 16, fontWeight: '500', color: colors.slate800 },
  row: { flexDirection: 'row' },
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
