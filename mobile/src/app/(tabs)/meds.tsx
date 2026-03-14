import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import { INIT_MEDS } from '@/data/restrictions';
import { CL_LIMITS } from '@/data/clinicalLimits';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import Alrt from '@/components/Alert';
import { requestNotificationPermission, scheduleMedReminder, cancelMedReminder } from '@/lib/notifications';
import { EMPTY_LOG, type Medication, type MedDose } from '@/data/types';
import { toId } from '@/utils/dates';

const MED_COLORS = ['#6366F1', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0284C7', '#DB2777'];

export default function MedsScreen() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [timePickerDate, setTimePickerDate] = useState<Date>(new Date());

  const [formName, setFormName] = useState<string>('');
  const [formDosage, setFormDosage] = useState<string>('');
  const [formInstr, setFormInstr] = useState<string>('');
  const [formInv, setFormInv] = useState<string>('30');
  const [formPpd, setFormPpd] = useState<string>('1');
  const [formCritical, setFormCritical] = useState<boolean>(false);
  const [formColor, setFormColor] = useState<string>('#6366F1');

  // Dose adherence state
  const [todayDoses, setTodayDoses] = useState<MedDose[]>([]);
  // Always compute the key at call time so midnight rollovers use the correct date
  const getTodayKey = () => `doses_${toId(new Date())}`;

  useEffect(() => {
    async function load() {
      const savedMeds = await S.get('medications');
      // Use saved meds if available; fall back to INIT_MEDS only for fresh installs
      // (when onboarding hasn't run yet and storage has never been written).
      setMeds(savedMeds ?? INIT_MEDS);
      const doses = await S.get(getTodayKey());
      if (doses) setTodayDoses(doses);
      else setTodayDoses([]);
      setLoaded(true);
    }
    load();
  }, []);

  // Reload today's doses when the tab comes into focus — handles midnight rollovers
  // and dose changes made via the Today tab's tacrolimus timer.
  useFocusEffect(useCallback(() => {
    async function refreshDoses() {
      const doses = await S.get(getTodayKey());
      setTodayDoses(doses ?? []);
    }
    refreshDoses();
  }, []));


  useEffect(() => {
    if (loaded) {
      S.set('medications', meds);
    }
  }, [meds, loaded]);

  const updateMedInv = (id: string, delta: number) => {
    setMeds(meds.map(m => m.id === id ? { ...m, inv: Math.max(0, m.inv + delta) } : m));
  };

  const dosesTodayForMed = (medId: string) => todayDoses.filter(d => d.medId === medId).length;

  const takeDose = async (med: Medication) => {
    const dose: MedDose = { medId: med.id, timestamp: Date.now() };
    const updated = [...todayDoses, dose];
    setTodayDoses(updated);
    await S.set(getTodayKey(), updated);
    // Auto-decrement inventory by 1
    setMeds(prev => prev.map(m => m.id === med.id ? { ...m, inv: Math.max(0, m.inv - 1) } : m));
    // Sync lastTacTime to daily log so TacTimer on Today tab stays accurate
    if (med.isTac) {
      const dayKey = toId(new Date());
      const dayLog = (await S.get(`log_${dayKey}`)) ?? { ...EMPTY_LOG };
      await S.set(`log_${dayKey}`, { ...dayLog, lastTacTime: dose.timestamp });
    }
  };

  const undoLastDose = async (medId: string) => {
    const idx = [...todayDoses].reverse().findIndex(d => d.medId === medId);
    if (idx === -1) return;
    const realIdx = todayDoses.length - 1 - idx;
    const updated = todayDoses.filter((_, i) => i !== realIdx);
    setTodayDoses(updated);
    await S.set(getTodayKey(), updated);
    // Restore 1 pill
    setMeds(prev => prev.map(m => m.id === medId ? { ...m, inv: m.inv + 1 } : m));
    // Revert lastTacTime in daily log if this was a tac dose
    const tacMed = meds.find(m => m.id === medId && m.isTac);
    if (tacMed) {
      const dayKey = toId(new Date());
      const dayLog = (await S.get(`log_${dayKey}`)) ?? { ...EMPTY_LOG };
      const remaining = updated.filter(d => d.medId === medId);
      const prevTime = remaining.length > 0 ? remaining[remaining.length - 1].timestamp : null;
      await S.set(`log_${dayKey}`, { ...dayLog, lastTacTime: prevTime });
    }
  };

  const toggleNotify = async (med: Medication) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      Burnt.toast({ title: 'Notification permission required', preset: 'error' });
      return;
    }
    const newEnabled = !med.notifyEnabled;
    const updated = meds.map(m =>
      m.id === med.id ? { ...m, notifyEnabled: newEnabled } : m
    );
    setMeds(updated);
    if (newEnabled && med.reminderTime) {
      await scheduleMedReminder({ ...med, notifyEnabled: true });
    } else {
      await cancelMedReminder(med.id);
    }
  };

  const setReminderTime = async (med: Medication, date: Date) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      Burnt.toast({ title: 'Notification permission required', preset: 'error' });
      return;
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const reminderTime = `${hours}:${minutes}`;
    const updated = meds.map(m =>
      m.id === med.id ? { ...m, reminderTime, notifyEnabled: true } : m
    );
    setMeds(updated);
    await scheduleMedReminder({ ...med, reminderTime, notifyEnabled: true });
  };

  const openTimePickerFor = (med: Medication) => {
    const now = new Date();
    if (med.reminderTime) {
      const [h, min] = med.reminderTime.split(':');
      now.setHours(parseInt(h, 10), parseInt(min, 10), 0, 0);
    }
    setTimePickerDate(now);
    setShowTimePicker(med.id);
  };

  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const openAddModal = () => {
    setEditingMed(null);
    setFormName(''); setFormDosage(''); setFormInstr('');
    setFormInv('30'); setFormPpd('1');
    setFormCritical(false); setFormColor('#6366F1');
    setShowAddModal(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setFormName(med.name); setFormDosage(med.dosage); setFormInstr(med.instr);
    setFormInv(String(med.inv)); setFormPpd(String(med.ppd));
    setFormCritical(med.critical); setFormColor(med.color);
    setShowAddModal(true);
  };

  const saveMed = async () => {
    if (!formName.trim()) return;
    if (editingMed) {
      const updatedMed: Medication = {
        ...editingMed,
        name: formName.trim(), dosage: formDosage.trim(), instr: formInstr.trim(),
        inv: parseInt(formInv) || 30, ppd: parseInt(formPpd) || 1,
        critical: formCritical, color: formColor,
      };
      setMeds(meds.map(m => m.id === editingMed.id ? updatedMed : m));
      // Reschedule notification if enabled — ensures name/time changes take effect
      if (updatedMed.notifyEnabled && updatedMed.reminderTime) {
        await cancelMedReminder(updatedMed.id);
        await scheduleMedReminder(updatedMed);
      }
    } else {
      const newMed: Medication = {
        id: `m_${Date.now()}`,
        name: formName.trim(), dosage: formDosage.trim(), instr: formInstr.trim(),
        inv: parseInt(formInv) || 30, ppd: parseInt(formPpd) || 1,
        critical: formCritical, color: formColor,
      };
      setMeds([...meds, newMed]);
    }
    setShowAddModal(false);
  };

  const deleteMed = async (id: string) => {
    await cancelMedReminder(id);
    setMeds(meds.filter(m => m.id !== id));
  };

  const getLowStockWarning = (med: Medication) => {
    const daysLeft = Math.floor(med.inv / med.ppd);
    return { show: daysLeft <= CL_LIMITS.lowMedDays, daysLeft };
  };

  const criticalMeds = meds.filter(m => m.critical);
  const otherMeds = meds.filter(m => !m.critical);

  const renderMedCard = (med: Medication) => {
    const warning = getLowStockWarning(med);
    const daysLeft = Math.floor(med.inv / med.ppd);
    const progressPct = (daysLeft / 30) * 100;
    const doseCount = dosesTodayForMed(med.id);
    const lastDose = todayDoses.filter(d => d.medId === med.id).slice(-1)[0];

    return (
      <Card key={med.id} accent={med.color}>
        <View style={styles.medHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medDosage}>{med.dosage}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {warning.show ? (
              <Badge label={`${warning.daysLeft}d left`} variant="warning" icon="⚠️" />
            ) : null}
            <Pressable onPress={() => openEditModal(med)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {med.instr ? (
          <Text style={styles.medInstr}>{med.instr}</Text>
        ) : null}

        {/* Dose Tracking */}
        <View style={styles.doseSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.doseStatus}>
              {doseCount >= med.ppd
                ? (med.ppd === 1 ? 'Dose logged today' : 'All required doses logged today')
                : doseCount === 0
                  ? (med.ppd === 1 ? 'No dose logged today' : 'No doses logged today')
                  : `${doseCount} of ${med.ppd} doses logged · ${med.ppd - doseCount} remaining`}
            </Text>
            {lastDose ? (
              <Text style={styles.lastDoseTime}>
                Taken at {new Date(lastDose.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {doseCount < med.ppd ? (
              <Pressable style={styles.takeDoseBtn} onPress={() => takeDose(med)} accessibilityLabel={`Log dose for ${med.name}`}>
                <Text style={styles.takeDoseBtnText}>Log Dose</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.takeDoseBtnDone} disabled>
                <Text style={styles.takeDoseBtnDoneText}>Done ✓</Text>
              </Pressable>
            )}
            {doseCount > 0 ? (
              <Pressable style={styles.undoBtn} onPress={() => undoLastDose(med.id)}>
                <Text style={styles.undoBtnText}>↩ Undo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.invSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invLabel}>Inventory</Text>
            <Text style={styles.invValue}>{med.inv} pills</Text>
            <Text style={styles.invDays}>{daysLeft} days remaining</Text>
          </View>
          <View style={styles.invControls}>
            <Pressable style={styles.invBtn} onPress={() => updateMedInv(med.id, -med.ppd)}>
              <Text style={styles.invBtnText}>-{med.ppd}</Text>
            </Pressable>
            <Pressable style={[styles.invBtn, { backgroundColor: colors.emerald500 }]} onPress={() => updateMedInv(med.id, 30)}>
              <Text style={styles.invBtnText}>+30</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressBar, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: progressPct > 30 ? colors.emerald500 : progressPct > 15 ? colors.amber500 : colors.rose500 }]} />
        </View>

        {/* Reminder Row */}
        <View style={styles.reminderRow}>
          <Pressable style={[styles.bellBtn, med.notifyEnabled ? styles.bellBtnActive : null]} onPress={() => toggleNotify(med)}>
            <Text style={styles.bellIcon}>{med.notifyEnabled ? '🔔' : '🔕'}</Text>
            <Text style={[styles.bellText, med.notifyEnabled ? styles.bellTextActive : null]}>
              {med.notifyEnabled ? 'Reminders On' : 'Reminders Off'}
            </Text>
          </Pressable>
          <Pressable style={styles.timeBtn} onPress={() => openTimePickerFor(med)}>
            <Text style={styles.timeBtnText}>{med.reminderTime ? `⏰ ${fmtTime(med.reminderTime)}` : '⏰ Set time'}</Text>
          </Pressable>
        </View>

        {showTimePicker === med.id && Platform.OS === 'ios' ? (
          <View>
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display="spinner"
              onChange={(_, d) => { if (d) setTimePickerDate(d); }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable style={[styles.invBtn, { flex: 1 }]} onPress={() => setShowTimePicker(null)}>
                <Text style={styles.invBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.invBtn, { flex: 1, backgroundColor: colors.emerald500 }]}
                onPress={async () => { await setReminderTime(med, timePickerDate); setShowTimePicker(null); }}
              >
                <Text style={styles.invBtnText}>Set Reminder</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showTimePicker === med.id && Platform.OS === 'android' ? (
          <DateTimePicker
            value={timePickerDate}
            mode="time"
            display="default"
            onChange={async (_, d) => { setShowTimePicker(null); if (d) await setReminderTime(med, d); }}
          />
        ) : null}

        {med.isTac ? (
          <View style={styles.tacNote}>
            <Text style={styles.tacNoteText}>
              ⏰ Take exactly 12 hours apart. On lab days, wait until after blood draw to take morning dose.
            </Text>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Medications</Text>
          <Text style={styles.subtitle}>Track doses, inventory & reminders</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Med</Text>
        </Pressable>
      </View>

      {meds.some(m => getLowStockWarning(m).show) ? (
        <Alrt
          icon="💊"
          title="Low Medication Stock"
          msg="You have medications running low. Contact your pharmacy to refill soon."
          variant="warning"
        />
      ) : null}

      {meds.length === 0 ? (
        <Card flat style={{ backgroundColor: colors.slate100 }}>
          <Text style={styles.emptyText}>No medications added yet. Tap "+ Add Med" to get started.</Text>
        </Card>
      ) : null}

      {meds.length > 0 ? <SectionLabel title="Critical Medications" sub="Never skip or run out" /> : null}
      {criticalMeds.map(renderMedCard)}

      {otherMeds.length > 0 ? (
        <>
          <SectionLabel title="Other Medications" />
          {otherMeds.map(renderMedCard)}
        </>
      ) : null}

      <Card flat style={{ backgroundColor: colors.sky50 }}>
        <Text style={styles.tipsTitle}>Medication Reminders</Text>
        <Text style={styles.tipsText}>
          • Tap 🔕 on any medication to enable daily reminders{'\n'}
          • Tap ⏰ to set the exact reminder time{'\n'}
          • Refill when you have 7-10 days remaining{'\n'}
          • Keep medications in original containers{'\n'}
          • Store in cool, dry place (not bathroom)
        </Text>
      </Card>

      <View style={{ height: 40 }} />

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)} accessibilityViewIsModal>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingMed ? 'Edit Medication' : 'Add Medication'}</Text>
            <Pressable onPress={() => setShowAddModal(false)} accessibilityLabel="Close medication form">
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>Medication Name *</Text>
          <TextInput value={formName} onChangeText={setFormName} placeholder="e.g. Tacrolimus (Prograf)" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Dosage</Text>
          <TextInput value={formDosage} onChangeText={setFormDosage} placeholder="e.g. 2mg twice daily" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Instructions</Text>
          <TextInput value={formInstr} onChangeText={setFormInstr} placeholder="e.g. Take with food" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <View style={styles.modalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Pills on Hand</Text>
              <TextInput value={formInv} onChangeText={setFormInv} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.slate300} style={styles.modalInput} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Pills per Day</Text>
              <TextInput value={formPpd} onChangeText={setFormPpd} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.slate300} style={styles.modalInput} />
            </View>
          </View>

          <Text style={styles.modalLabel}>Card Color</Text>
          <View style={styles.colorRow}>
            {MED_COLORS.map(c => (
              <Pressable key={c} style={[styles.colorDot, { backgroundColor: c }, formColor === c ? styles.colorDotActive : null]} onPress={() => setFormColor(c)} />
            ))}
          </View>

          <Pressable style={[styles.criticalToggle, formCritical ? styles.criticalToggleActive : null]} onPress={() => setFormCritical(!formCritical)}>
            <Text style={styles.criticalToggleText}>
              {formCritical ? 'Critical — do not skip or run out' : 'Mark as critical'}
            </Text>
          </Pressable>

          <Pressable style={[styles.saveBtn, !formName.trim() ? styles.btnDisabled : null]} disabled={!formName.trim()} onPress={saveMed}>
            <Text style={styles.saveBtnText}>{editingMed ? 'Save Changes' : 'Add Medication'}</Text>
          </Pressable>

          {editingMed ? (
            confirmDeleteId === editingMed.id ? (
              <View style={styles.confirmDeleteRow}>
                <Text style={styles.confirmDeleteText}>Remove {editingMed.name}? This cannot be undone.</Text>
                <View style={styles.confirmDeleteBtns}>
                  <Pressable style={styles.confirmCancelBtn} onPress={() => setConfirmDeleteId(null)}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.confirmDeleteBtn} onPress={() => { deleteMed(editingMed.id); setShowAddModal(false); setConfirmDeleteId(null); }}>
                    <Text style={styles.confirmDeleteBtnText}>Yes, Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.deleteBtn} onPress={() => setConfirmDeleteId(editingMed.id)}>
                <Text style={styles.deleteBtnText}>🗑 Remove Medication</Text>
              </Pressable>
            )
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  addBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  medName: { fontSize: 16, fontWeight: '700', color: colors.slate800 },
  medDosage: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  medInstr: { fontSize: 12, color: colors.slate600, lineHeight: 18, marginBottom: 12 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  invSection: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  invLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400 },
  invValue: { fontSize: 18, fontWeight: '700', color: colors.slate800, marginTop: 2 },
  invDays: { fontSize: 11, color: colors.slate500, marginTop: 2 },
  invControls: { flexDirection: 'row', gap: 8 },
  invBtn: { backgroundColor: colors.slate600, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  invBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  progressBg: { height: 6, backgroundColor: colors.slate200, borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  progressBar: { height: '100%', borderRadius: 999 },
  reminderRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  bellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300, backgroundColor: colors.white },
  bellBtnActive: { borderColor: colors.indigo400, backgroundColor: colors.indigo50 },
  bellIcon: { fontSize: 14 },
  bellText: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  bellTextActive: { color: colors.indigo600 },
  timeBtn: { flex: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white },
  timeBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  tacNote: { padding: 12, borderRadius: 10, backgroundColor: colors.indigo50, marginTop: 4 },
  tacNoteText: { fontSize: 11, color: colors.indigo600, lineHeight: 16, fontWeight: '500' },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.sky700, marginBottom: 8 },
  tipsText: { fontSize: 12, color: colors.sky700, lineHeight: 20 },
  modal: { flex: 1, backgroundColor: colors.slate50 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.slate800 },
  modalClose: { fontSize: 20, color: colors.slate500, padding: 4 },
  modalLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate600, marginBottom: 8, marginTop: 16 },
  modalInput: {
    height: 50, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2,
    borderColor: colors.slate200, backgroundColor: colors.white,
    fontSize: 16, fontWeight: '500', color: colors.slate800,
  },
  modalRow: { flexDirection: 'row' },
  colorRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.slate800 },
  criticalToggle: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  criticalToggleActive: { borderColor: colors.amber500, backgroundColor: colors.amber50 },
  criticalToggleText: { fontSize: 14, fontWeight: '600', color: colors.slate700, textAlign: 'center' },
  saveBtn: { marginTop: 20, backgroundColor: colors.indigo500, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  deleteBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.rose200 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: colors.rose500 },
  btnDisabled: { backgroundColor: colors.slate300 },
  emptyText: { fontSize: 14, color: colors.slate500, textAlign: 'center', paddingVertical: 20 },
  confirmDeleteRow: { marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.rose200, backgroundColor: colors.rose50 },
  confirmDeleteText: { fontSize: 14, fontWeight: '600', color: colors.rose700, textAlign: 'center', marginBottom: 12 },
  confirmDeleteBtns: { flexDirection: 'row', gap: 8 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.slate200, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: colors.slate700 },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.rose500, alignItems: 'center' },
  confirmDeleteBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  doseSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.slate50, padding: 12, borderRadius: 10, marginBottom: 12 },
  doseStatus: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  lastDoseTime: { fontSize: 11, color: colors.slate500, marginTop: 2 },
  takeDoseBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  takeDoseBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  takeDoseBtnDone: { backgroundColor: colors.emerald50, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  takeDoseBtnDoneText: { fontSize: 13, fontWeight: '700', color: colors.emerald700 },
  undoBtn: { paddingHorizontal: 6, paddingVertical: 10, justifyContent: 'center' },
  undoBtnText: { fontSize: 12, color: colors.slate400 },
});
