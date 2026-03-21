import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../data/colors';
import { LAB_TESTS, LAB_CODES } from '../data/labTests';
import { fmtDate, fmtShort, fmtWd, fastTn, nxLab, getLabType, parseLocalDay, dBt, toId } from '../utils/dates';
import type { Appointment } from '../data/types';
import Badge from '../components/Badge';
import Card from '../components/Card';
import Alrt from '../components/Alert';
import SectionLabel from '../components/SectionLabel';
import MiniCal from '../components/MiniCal';

interface LabsTabProps {
  appts: Appointment[];
}

export default function LabsTab({ appts }: LabsTabProps) {
  const today = new Date();
  const [mo, setMo] = useState(today.getMonth());
  const [yr, setYr] = useState(today.getFullYear());
  const [rules, setRules] = useState(false);
  const [det, setDet] = useState<any>(null);
  const [showCC, setShowCC] = useState(false);

  const fast = fastTn();
  const nl = nxLab();
  const nlType = getLabType(nl);
  const up = (appts || []).filter(a => parseLocalDay(a.date) > today);

  const prevMonth = () => {
    if (mo === 0) { setMo(11); setYr(y => y - 1); }
    else setMo(m => m - 1);
  };
  const nextMonth = () => {
    if (mo === 11) { setMo(0); setYr(y => y + 1); }
    else setMo(m => m + 1);
  };

  return (
    <View style={styles.container}>
      {/* Fasting Alert or Next Lab */}
      {fast ? (
        <Alrt icon={"\u{1F319}"} title="Fasting Tonight" msg={`Lab draw tomorrow (${fmtWd(nl)}). Stop eating at midnight.\nWater & pain meds OK. Labs BEFORE morning meds.${nlType && nlType.includes('pink') ? '\n\n\u{1FAD9} REMINDER: Tomorrow is a MONTHLY lab \u2014 bring urine sample.' : ''}`} variant="warning" />
      ) : (
        <Card flat>
          <View style={styles.nextLabRow}>
            <Text style={styles.calIcon}>{"\u{1F5D3}\uFE0F"}</Text>
            <View style={styles.flex1}>
              <Text style={styles.nextLabTitle}>Next Lab Draw</Text>
              <Text style={styles.nextLabDate}>{fmtDate(nl)}</Text>
            </View>
            {nlType === 'yellow' && <Badge label="Twice/Wk" variant="yellow" />}
            {nlType?.includes('pink') ? <Badge label="Monthly" variant="pink" /> : null}
          </View>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable onPress={() => setRules(true)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>{"\u{1F4CB}"} Lab Rules</Text>
        </Pressable>
        <Pressable onPress={() => setShowCC(true)} style={[styles.actionBtn, styles.actionBtnSecondary]}>
          <Text style={styles.actionBtnTextSecondary}>{"\u{1FAD9}"} Urine Protocol</Text>
        </Pressable>
      </View>

      {/* Calendar */}
      <Card>
        <View style={styles.calNav}>
          <Pressable onPress={prevMonth} style={styles.calNavBtn}><Text style={styles.calNavArrow}>{"\u2039"}</Text></Pressable>
          <Text style={styles.calNavTitle}>{new Date(yr, mo).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <Pressable onPress={nextMonth} style={styles.calNavBtn}><Text style={styles.calNavArrow}>{"\u203A"}</Text></Pressable>
        </View>
        <MiniCal year={yr} month={mo} appts={appts} onDay={(d, info) => {
          if (info.lt) setDet({ t: 'lab', lt: info.lt, d });
          else if (info.ap) setDet({ t: 'ap', data: info.ap });
          else setDet(null);
        }} />
        <View style={styles.legendRow}>
          {[['#EAB308', 'Twice/Wk'], ['#EC4899', 'Monthly'], ['#4ADE80', 'Protocol'], ['#3B82F6', 'Appt'], ['#EF4444', 'Deadline']].map(([c, l]) => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c }]} />
              <Text style={styles.legendText}>{l}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Detail Panel */}
      {det ? (
        <Card accent={det.t === 'lab' ? (det.lt.includes('pink') ? '#EC4899' : det.lt === 'green' ? '#4ADE80' : '#EAB308') : '#3B82F6'}>
          {det.t === 'lab' && (
            <View>
              <Text style={styles.detTitle}>
                {det.lt === 'yellow' ? '\u{1F7E8} Twice-a-Week Labs' : det.lt === 'pink' ? '\u{1F7EA} Monthly Labs' : det.lt === 'pink-green' ? '\u{1F7EA}\u{1F7E9} Monthly + Protocol Labs' : '\u{1F7E9} Protocol Labs'}
              </Text>
              <Text style={styles.detDate}>{fmtDate(det.d)}</Text>
              {det.lt === 'yellow' && (
                <View>
                  <Text style={styles.testHeader}>TESTS</Text>
                  {LAB_TESTS.yellow.map(t => (
                    <View key={t} style={styles.testRow}>
                      <Text style={styles.testName}>{t}</Text>
                      <Text style={styles.testCode}>{LAB_CODES.yellow[t]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {det.lt.includes('pink') && (
                <View>
                  <Text style={[styles.testHeader, { color: colors.pink700 }]}>MONTHLY TESTS</Text>
                  {LAB_TESTS.pink.map(t => (
                    <View key={t} style={styles.testRow}>
                      <Text style={styles.testName}>{t}</Text>
                      <Text style={styles.testCode}>{LAB_CODES.pink[t]}</Text>
                    </View>
                  ))}
                  <View style={styles.urineReminder}>
                    <Text style={styles.urineText}>{"\u{1FAD9}"} This day requires a urine sample. Review Clean Catch protocol.</Text>
                  </View>
                </View>
              )}
              {det.lt.includes('green') && (
                <View style={styles.protocolBox}>
                  <Text style={styles.protocolHeader}>ONE-TIME PROTOCOL (UNOS)</Text>
                  {LAB_TESTS.green.map(t => (
                    <View key={t} style={styles.testRow}>
                      <Text style={[styles.testName, { color: colors.emerald700 }]}>{t}</Text>
                      <Text style={[styles.testCode, { color: colors.emerald500 }]}>{LAB_CODES.green[t]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          {det.t === 'ap' && (
            <View>
              <Text style={styles.apDocName}>{det.data.type === 'virtual' ? '\u{1F4F9}' : '\u{1F3E5}'} {det.data.doc}</Text>
              <Text style={styles.apDesc}>{det.data.time} \u2014 {det.data.desc}</Text>
              {det.data.labBy ? <Text style={styles.apLabBy}>{"\u26A0\uFE0F"} Labs by {det.data.labBy}</Text> : null}
            </View>
          )}
          <Pressable onPress={() => setDet(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Card>
      ) : null}

      {/* Upcoming Appointments */}
      <SectionLabel title="Upcoming" right={<Badge label={`${up.length}`} variant="info" />} />
      {up.map(a => {
        const d = parseLocalDay(a.date);
        const days = dBt(today, d);
        return (
          <Card key={a.id} accent="#3B82F6">
            <View style={styles.apptRow}>
              <View style={styles.flex1}>
                <Text style={styles.apptDoc}>{a.doc}</Text>
                <Text style={styles.apptDesc}>{a.desc}</Text>
                <Text style={styles.apptDate}>{fmtShort(d)} at {a.time} {"\u00B7"} {a.type === 'virtual' ? '\u{1F4F9}' : '\u{1F3E5}'}</Text>
              </View>
              <Badge label={days === 0 ? 'Today' : `${days}d`} variant={days <= 2 ? 'danger' : days <= 7 ? 'warning' : 'info'} />
            </View>
            {a.labBy ? (
              <View style={styles.labByBox}>
                <Text style={styles.labByText}>{"\u26A0\uFE0F"} Labs by {a.labBy}</Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      {/* Clean Catch Modal */}
      <Modal visible={showCC} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCC(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>{"\u{1FAD9}"}</Text>
              <Text style={styles.modalTitle}>Clean Catch Urine Protocol</Text>
            </View>
            <Text style={styles.modalSubtitle}>MALES</Text>
            {[
              'Wash hands with soap and water.',
              'Remove cap from urine container.',
              'Pull back foreskin, if present.',
              'Begin urinating into the toilet.',
              'During urination, insert container into stream to catch sample. Before bladder is empty, withdraw container.',
              'Finish urinating into the toilet.',
              'Screw lid tightly onto container.',
              'Wash hands with soap and water.',
            ].map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}.</Text>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
            <Pressable onPress={() => setShowCC(false)} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Got It</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Lab Rules Modal */}
      <Modal visible={rules} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setRules(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Lab Day Rules</Text>
            {[
              ['\u{1F4C5}', 'Draw labs every Monday & Thursday'],
              ['\u{1F6AB}', 'Never 2 days in a row. Avoid Fridays.'],
              ['\u{1F319}', 'Fast from midnight. Water and pain meds OK.'],
              ['\u{1F48A}', 'Draw BEFORE morning medications.'],
              ['\u{1F4CB}', 'Bring your color-coded lab slip.'],
              ['\u{1FAD9}', 'Monthly labs require urine sample \u2014 review clean catch.'],
              ['\u23F0', 'Twice weekly until function improves.'],
            ].map(([e, t], i) => (
              <View key={i} style={styles.ruleRow}>
                <Text style={styles.ruleEmoji}>{e}</Text>
                <Text style={styles.ruleText}>{t}</Text>
              </View>
            ))}
            <Pressable onPress={() => setRules(false)} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Got It</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  nextLabRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calIcon: { fontSize: 28 },
  flex1: { flex: 1 },
  nextLabTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  nextLabDate: { fontSize: 14, color: colors.slate500 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: colors.slate100, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionBtnSecondary: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate100 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  actionBtnTextSecondary: { fontSize: 12, fontWeight: '600', color: colors.slate500 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.slate50, alignItems: 'center', justifyContent: 'center' },
  calNavArrow: { fontSize: 18, color: colors.slate500 },
  calNavTitle: { fontSize: 14, fontWeight: '700', color: colors.slate700 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate100 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.slate400, fontWeight: '500' },
  detTitle: { fontSize: 16, fontWeight: '700', color: colors.slate800, marginBottom: 4 },
  detDate: { fontSize: 12, color: colors.slate400, marginBottom: 12 },
  testHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.slate400, marginBottom: 4 },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  testName: { fontSize: 14, color: colors.slate600 },
  testCode: { fontSize: 10, fontFamily: 'monospace', color: colors.slate400 },
  urineReminder: { marginTop: 12, backgroundColor: colors.pink50, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(236,72,153,0.1)' },
  urineText: { fontSize: 12, fontWeight: '600', color: colors.pink700 },
  protocolBox: { marginTop: 12, backgroundColor: colors.emerald50, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(52,211,153,0.1)' },
  protocolHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.emerald700, marginBottom: 4 },
  apDocName: { fontSize: 14, fontWeight: '600' },
  apDesc: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  apLabBy: { fontSize: 12, fontWeight: '600', color: colors.rose600, marginTop: 8 },
  closeBtn: { marginTop: 16, paddingVertical: 8, backgroundColor: colors.slate100, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { fontSize: 12, fontWeight: '700', color: colors.slate400 },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  apptDoc: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  apptDesc: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  apptDate: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  labByBox: { backgroundColor: colors.rose50, padding: 10, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(254,205,211,0.5)' },
  labByText: { fontSize: 12, fontWeight: '600', color: colors.rose700 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalEmoji: { fontSize: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.slate800, marginBottom: 16 },
  modalSubtitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.slate400, marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  stepNum: { fontSize: 14, fontWeight: '700', color: colors.indigo500, width: 24, textAlign: 'right' },
  stepText: { fontSize: 14, color: colors.slate600, flex: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  ruleEmoji: { fontSize: 20 },
  ruleText: { fontSize: 14, color: colors.slate600, flex: 1 },
  modalDoneBtn: { marginTop: 16, paddingVertical: 12, backgroundColor: colors.indigo500, borderRadius: 12, alignItems: 'center' },
  modalDoneBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
