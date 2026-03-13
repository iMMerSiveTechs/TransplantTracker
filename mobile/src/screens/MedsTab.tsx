import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../data/colors';
import { CL_LIMITS } from '../data/clinicalLimits';
import { cl } from '../utils/dates';
import type { Medication } from '../data/types';
import Badge from '../components/Badge';
import Card from '../components/Card';
import Ring from '../components/Ring';
import Alrt from '../components/Alert';
import SectionLabel from '../components/SectionLabel';

interface MedsTabProps {
  meds: Medication[];
  setMeds: React.Dispatch<React.SetStateAction<Medication[]>>;
}

export default function MedsTab({ meds, setMeds }: MedsTabProps) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', dosage: '', instr: '', ppd: '1', inv: '30' });
  const low = meds.filter(m => m.ppd > 0 && m.inv / m.ppd <= CL_LIMITS.lowMedDays);

  const addMed = () => {
    if (!form.name.trim()) return;
    const medColors = ['#6366F1', '#059669', '#D97706', '#0284C7', '#7C3AED', '#E11D48'];
    setMeds(prev => [...prev, {
      id: Date.now().toString(),
      name: form.name.trim(),
      dosage: form.dosage || 'Per doctor',
      instr: form.instr,
      inv: parseInt(form.inv) || 30,
      ppd: parseInt(form.ppd) || 1,
      critical: false,
      color: medColors[meds.length % medColors.length],
    }]);
    setForm({ name: '', dosage: '', instr: '', ppd: '1', inv: '30' });
    setShow(false);
  };

  return (
    <View style={styles.container}>
      {low.length > 0 ? (
        <Alrt icon={"\u{1F4E6}"} title={`${low.length} Med${low.length > 1 ? 's' : ''} Below ${CL_LIMITS.lowMedDays}-Day Supply`} msg={low.map(m => m.name).join(', ') + '\n\nPharmacy Fax: 415-558-7051'} variant="danger" />
      ) : null}
      <Card flat>
        <Text style={styles.hint}>Maintain 1+ week supply. Reorder 3rd week of cycle.</Text>
      </Card>
      <SectionLabel title="My Medications" right={<Badge label={`${meds.length}`} variant="muted" />} />

      {meds.map(m => {
        const dl = m.ppd > 0 ? Math.floor(m.inv / m.ppd) : 999;
        const isLow = dl <= CL_LIMITS.lowMedDays;
        const sp = m.ppd > 0 ? cl(m.inv / (m.ppd * 30), 0, 1) : 1;

        return (
          <Card key={m.id} accent={isLow ? '#E11D48' : undefined}>
            <View style={styles.medHeader}>
              <View style={styles.medNameRow}>
                <View style={[styles.colorStripe, { backgroundColor: m.color }]} />
                <View style={styles.flex1}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medDosage}>{m.dosage} {"\u00B7"} {m.instr || 'As directed'}</Text>
                </View>
              </View>
              {m.critical ? <Badge label="Critical" variant="danger" /> : null}
            </View>

            <View style={styles.medBody}>
              <Ring progress={sp} size={46} color={isLow ? '#E11D48' : '#6366F1'}>
                <Text style={[styles.invCount, isLow ? { color: colors.rose600 } : undefined]}>{m.inv}</Text>
              </Ring>
              <View style={styles.flex1}>
                <Text style={styles.medInfo}>{m.inv} pills {"\u00B7"} {dl}d</Text>
                {isLow ? <Text style={styles.refillWarn}>{"\u26A0\uFE0F"} Order refill</Text> : null}
              </View>
              <Pressable onPress={() => setMeds(prev => prev.map(x => x.id === m.id ? { ...x, inv: Math.max(0, x.inv - 1) } : x))} style={styles.takeBtn}>
                <Text style={styles.takeBtnText}>{"\u{1F48A}"} Take</Text>
              </Pressable>
            </View>

            <View style={styles.medFooter}>
              <Pressable onPress={() => setMeds(prev => prev.filter(x => x.id !== m.id))}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}

      <Pressable onPress={() => setShow(true)} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ Add Medication</Text>
      </Pressable>

      {/* Add Medication Modal */}
      <Modal visible={show} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShow(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            {[
              { label: 'NAME *', key: 'name', placeholder: 'e.g. Tacrolimus' },
              { label: 'DOSAGE', key: 'dosage', placeholder: '5mg' },
              { label: 'INSTRUCTIONS', key: 'instr', placeholder: 'With food' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>{label}</Text>
                <TextInput
                  value={(form as any)[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={colors.slate300}
                  style={styles.modalInput}
                />
              </View>
            ))}
            <View style={styles.modalRow}>
              {[{ label: 'PILLS/DAY', key: 'ppd' }, { label: 'SUPPLY', key: 'inv' }].map(({ label, key }) => (
                <View key={key} style={styles.flex1}>
                  <Text style={styles.modalFieldLabel}>{label}</Text>
                  <TextInput
                    value={(form as any)[key]}
                    onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                    keyboardType="number-pad"
                    style={styles.modalInput}
                  />
                </View>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setShow(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={addMed} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  hint: { fontSize: 12, color: colors.slate400, fontStyle: 'italic' },
  medHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  medNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  colorStripe: { width: 4, height: 20, borderRadius: 999 },
  flex1: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  medDosage: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  medBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invCount: { fontSize: 12, fontWeight: '700', color: colors.slate700 },
  medInfo: { fontSize: 14, color: colors.slate600 },
  refillWarn: { fontSize: 12, fontWeight: '600', color: colors.rose600, marginTop: 2 },
  takeBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  takeBtnText: { fontSize: 12, fontWeight: '600', color: colors.white },
  medFooter: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate50 },
  removeText: { fontSize: 12, fontWeight: '600', color: colors.rose500 },
  addBtn: { paddingVertical: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.slate200, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.indigo500 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.slate800, marginBottom: 16 },
  modalField: { marginBottom: 12 },
  modalFieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.slate400, marginBottom: 4 },
  modalInput: { borderWidth: 2, borderColor: colors.slate200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: colors.slate50 },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: colors.slate100, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.slate600 },
  saveBtn: { flex: 1, paddingVertical: 12, backgroundColor: colors.indigo500, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
