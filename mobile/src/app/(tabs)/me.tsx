import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet, Modal, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Burnt from 'burnt';
import { colors } from '@/data/colors';
import { RESTS, TRANSPLANT_TYPES } from '@/data/restrictions';
import { dBt, wBt, fmtDate, getSurgDefault } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import MiniCal from '@/components/MiniCal';
import { generateAndShareReport } from '@/lib/sharing';
import type { Profile, Appointment, Contact } from '@/data/types';

const TRANSPLANT_TIPS: Record<string, string[]> = {
  Kidney: [
    'Stay well hydrated — aim for 2,500+ mL/day unless told otherwise',
    'Monitor urine output daily; call your team if it drops significantly',
    'Creatinine and GFR are your key kidney function markers',
    'Avoid NSAIDs (ibuprofen, naproxen) — they can damage the kidney',
    'Tacrolimus level should be checked regularly; take it 12 hrs apart',
  ],
  Liver: [
    'Watch for signs of rejection: fatigue, jaundice, right-side pain',
    'Liver enzymes (ALT, AST, bilirubin) show how the liver is working',
    'Avoid alcohol completely — it damages the transplanted liver',
    'Tacrolimus or cyclosporine keep your immune system from rejecting',
    'Report any unusual bruising or bleeding to your team',
  ],
  Heart: [
    'Weigh yourself daily — sudden gain can mean fluid retention',
    'Your transplanted heart has no nerve connections, so HR may feel different',
    'Monitor resting heart rate and report unusual changes',
    'Avoid extreme exercise without your doctor\'s clearance',
    'Annual heart biopsies check for rejection',
  ],
  Lung: [
    'Track your FEV1 (spirometry) if prescribed a home device',
    'Report any new cough, shortness of breath, or fever immediately',
    'Chronic lung rejection (BOS) can develop over years — stay vigilant',
    'Avoid smoke, dust, and strong fumes',
    'Flu and pneumonia vaccines are important (after clearance)',
  ],
  Pancreas: [
    'Monitor blood glucose — a functioning pancreas should normalize it',
    'Pancreas rejection can be silent, so keep all lab appointments',
    'Amylase and lipase levels indicate pancreas health',
    'Stay well hydrated and follow your dietary plan',
  ],
  Other: [
    'Never miss immunosuppressant doses — even one missed dose risks rejection',
    'Keep all follow-up appointments and blood draws',
    'Report fever >101°F, unusual pain, or sudden changes to your team',
    'Take your medications at the same time every day',
  ],
};

const CONTACT_ICONS = ['📞', '🏥', '👨‍⚕️', '💊', '🚑', '👩‍⚕️', '🏠', '👨‍👩‍👧'];

export default function MeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [sharing, setSharing] = useState<boolean>(false);

  // Contact modal state
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [editingContactIdx, setEditingContactIdx] = useState<number>(-1);
  const [cIcon, setCIcon] = useState<string>('📞');
  const [cLabel, setCLabel] = useState<string>('');
  const [cSub, setCSubText] = useState<string>('');
  const [cPhone, setCPhone] = useState<string>('');
  const [cUrgent, setCUrgent] = useState<boolean>(false);

  // Profile editing state
  const [showProfileEdit, setShowProfileEdit] = useState<boolean>(false);
  const [editType, setEditType] = useState<string>('Kidney');
  const [editSurgDate, setEditSurgDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Appointment modal state
  const [showApptModal, setShowApptModal] = useState<boolean>(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [aDate, setADate] = useState<string>('');
  const [aTime, setATime] = useState<string>('');
  const [aDoc, setADoc] = useState<string>('');
  const [aDesc, setADesc] = useState<string>('');

  const today = new Date();
  const surgDate = profile?.surgDate ? new Date(profile.surgDate) : getSurgDefault();
  const daysSince = dBt(surgDate, today);
  const weeksSince = wBt(surgDate, today);
  const transplantType = profile?.type || 'Kidney';

  const tipKey = Object.keys(TRANSPLANT_TIPS).find(k => transplantType.includes(k)) || 'Other';
  const tips = TRANSPLANT_TIPS[tipKey] || TRANSPLANT_TIPS['Other'];

  useEffect(() => {
    async function load() {
      const savedProfile = await S.get('profile');
      const savedAppts = await S.get('appointments');
      if (savedProfile) setProfile(savedProfile);
      if (savedAppts) setAppts(savedAppts);
    }
    load();
  }, []);

  const saveProfile = async (updated: Profile) => {
    setProfile(updated);
    await S.set('profile', updated);
  };

  const activeRestrictions = RESTS.filter(r => weeksSince < r.w);
  const liftedRestrictions = RESTS.filter(r => weeksSince >= r.w);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await generateAndShareReport();
    } catch {
      Burnt.toast({ title: 'Could not generate report', preset: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const goToPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const goToNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const openAddContact = () => {
    setEditingContactIdx(-1);
    setCIcon('📞'); setCLabel(''); setCSubText(''); setCPhone(''); setCUrgent(false);
    setShowContactModal(true);
  };

  const openEditContact = (idx: number) => {
    const c = profile?.contacts?.[idx];
    if (!c) return;
    setEditingContactIdx(idx);
    setCIcon(c.icon); setCLabel(c.label); setCSubText(c.sub); setCPhone(c.phone); setCUrgent(!!c.urgent);
    setShowContactModal(true);
  };

  const saveContact = async () => {
    if (!cLabel.trim() || !cPhone.trim()) return;
    if (!profile) {
      Burnt.toast({ title: 'Profile not loaded yet. Please try again.', preset: 'error' });
      return;
    }
    const newContact: Contact = { icon: cIcon, label: cLabel.trim(), sub: cSub.trim(), phone: cPhone.trim(), urgent: cUrgent };
    const contacts = [...(profile.contacts || [])];
    if (editingContactIdx >= 0) {
      contacts[editingContactIdx] = newContact;
    } else {
      contacts.push(newContact);
    }
    await saveProfile({ ...profile, contacts });
    setShowContactModal(false);
  };

  const deleteContact = async (idx: number) => {
    if (!profile) return;
    const contacts = profile.contacts.filter((_, i) => i !== idx);
    await saveProfile({ ...profile, contacts });
  };

  // Profile editing
  const openProfileEdit = () => {
    setEditType(profile?.type || 'Kidney');
    setEditSurgDate(profile?.surgDate ? new Date(profile.surgDate) : new Date());
    setShowProfileEdit(true);
  };

  const saveProfileEdit = async () => {
    if (!profile) {
      Burnt.toast({ title: 'Profile not loaded yet. Please try again.', preset: 'error' });
      return;
    }
    await saveProfile({ ...profile, type: editType, surgDate: editSurgDate });
    setShowProfileEdit(false);
    Burnt.toast({ title: 'Profile updated', preset: 'done' });
  };

  // Appointment CRUD
  const saveAppts = async (updated: Appointment[]) => {
    setAppts(updated);
    await S.set('appointments', updated);
  };

  const openAddAppt = () => {
    setEditingApptId(null);
    setADate(''); setATime(''); setADoc(''); setADesc('');
    setShowApptModal(true);
  };

  const openEditAppt = (apt: Appointment) => {
    setEditingApptId(apt.id);
    setADate(apt.date); setATime(apt.time); setADoc(apt.doc); setADesc(apt.desc);
    setShowApptModal(true);
  };

  const saveAppt = async () => {
    if (!aDate.trim() || !aTime.trim()) return;
    if (editingApptId) {
      await saveAppts(appts.map(a => a.id === editingApptId ? { ...a, date: aDate.trim(), time: aTime.trim(), doc: aDoc.trim(), desc: aDesc.trim() } : a));
    } else {
      const newAppt: Appointment = { id: `a_${Date.now()}`, date: aDate.trim(), time: aTime.trim(), doc: aDoc.trim(), desc: aDesc.trim() };
      await saveAppts([...appts, newAppt].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setShowApptModal(false);
  };

  const deleteAppt = async (id: string) => {
    await saveAppts(appts.filter(a => a.id !== id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{profile?.name || 'Your Profile'}</Text>
          <Text style={styles.subtitle}>{transplantType} Transplant • Day {daysSince}</Text>
        </View>
        <Pressable style={[styles.shareBtn, sharing ? styles.shareBtnBusy : null]} onPress={handleShare} disabled={sharing}>
          <Text style={styles.shareBtnText}>{sharing ? '⏳' : '📤'} Share</Text>
        </Pressable>
      </View>

      {/* Surgery Stats */}
      <Card accent={colors.indigo500}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.surgLabel}>Transplant Date</Text>
            <Text style={styles.surgDate}>{fmtDate(surgDate)}</Text>
          </View>
          <Pressable style={styles.editProfileBtn} onPress={openProfileEdit}>
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{daysSince}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeksSince}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.floor(weeksSince / 4.3)}</Text>
            <Text style={styles.statLabel}>Months</Text>
          </View>
        </View>
      </Card>

      {/* Transplant-Type Tips */}
      <SectionLabel title={`${tipKey} Transplant Tips`} />
      <Card flat style={{ backgroundColor: colors.indigo50 }}>
        {tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </Card>

      {/* Calendar */}
      <SectionLabel title="Appointment Calendar" />
      <Card>
        <View style={styles.calHeader}>
          <Pressable onPress={goToPrevMonth} style={styles.calBtn}>
            <Text style={styles.calBtnText}>←</Text>
          </Pressable>
          <Text style={styles.calTitle}>
            {new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={goToNextMonth} style={styles.calBtn}>
            <Text style={styles.calBtnText}>→</Text>
          </Pressable>
        </View>
        <MiniCal year={calYear} month={calMonth} appts={appts} />
        <View style={styles.calLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.yellow400 }]} />
            <Text style={styles.legendText}>Yellow Lab</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.pink400 }]} />
            <Text style={styles.legendText}>Pink Lab</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Appointment</Text>
          </View>
        </View>
      </Card>

      {/* Upcoming Appointments */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderText}>Appointments</Text>
        <Pressable style={styles.addContactBtn} onPress={openAddAppt}>
          <Text style={styles.addContactBtnText}>+ Add</Text>
        </Pressable>
      </View>
      {appts.length === 0 ? (
        <Card flat style={{ backgroundColor: colors.slate100 }}>
          <Text style={styles.noContactText}>No appointments yet. Tap "+ Add" to schedule one.</Text>
        </Card>
      ) : null}
      {appts.map(apt => (
        <Card key={apt.id}>
          <View style={styles.aptHeader}>
            <Text style={styles.aptDate}>{apt.date}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Badge label={apt.time} variant="info" />
              <Pressable onPress={() => openEditAppt(apt)} style={styles.editContactBtn}>
                <Text style={styles.editContactBtnText}>Edit</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.aptDoc}>{apt.doc}</Text>
          <Text style={styles.aptDesc}>{apt.desc}</Text>
          {apt.labBy ? (
            <Text style={styles.aptLab}>Lab work by: {apt.labBy}</Text>
          ) : null}
        </Card>
      ))}

      {/* Active Restrictions */}
      <SectionLabel title="Active Restrictions" sub={`${activeRestrictions.length} active`} />
      {activeRestrictions.length > 0 ? (
        <Card accent={colors.rose400}>
          {activeRestrictions.map((r, idx) => {
            const weeksLeft = r.w - weeksSince;
            return (
              <View key={r.id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.restRow}>
                  <Text style={styles.restIcon}>{r.i}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.restTitle}>{r.t}</Text>
                    <Text style={styles.restDesc}>{r.d}</Text>
                  </View>
                  <Badge label={weeksLeft === 1 ? '1 wk' : `${weeksLeft} wks`} variant="warning" />
                </View>
              </View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <Text style={styles.noRestText}>🎉 All early restrictions lifted!</Text>
        </Card>
      )}

      {liftedRestrictions.length > 0 ? (
        <>
          <SectionLabel title="Lifted Restrictions" />
          <Card>
            {liftedRestrictions.map((r, idx) => (
              <View key={r.id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.restRow}>
                  <Text style={styles.restIcon}>{r.i}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.restTitle, { color: colors.slate500 }]}>{r.t}</Text>
                  </View>
                  <Badge label="✓ OK" variant="success" />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Emergency Contacts */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderText}>Emergency Contacts</Text>
        <Pressable style={styles.addContactBtn} onPress={openAddContact}>
          <Text style={styles.addContactBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <Card accent={colors.rose500}>
        <Pressable onPress={() => handleCall('911')} style={styles.emergBtn}>
          <Text style={styles.emergIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergTitle}>Emergency: Call 911</Text>
            <Text style={styles.emergSub}>Severe symptoms, chest pain, difficulty breathing</Text>
          </View>
        </Pressable>
      </Card>

      {profile?.contacts?.map((contact, idx) => (
        <Card key={`${contact.phone}_${idx}`}>
          <View style={styles.contactRow}>
            <Pressable onPress={() => handleCall(contact.phone)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.contactIcon}>{contact.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{contact.label}</Text>
                <Text style={styles.contactSub}>{contact.sub}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              {contact.urgent ? <Badge label="24/7" variant="danger" /> : null}
            </Pressable>
            <Pressable onPress={() => openEditContact(idx)} style={styles.editContactBtn}>
              <Text style={styles.editContactBtnText}>Edit</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      {(!profile?.contacts || profile.contacts.length === 0) ? (
        <Card flat style={{ backgroundColor: colors.slate100 }}>
          <Text style={styles.noContactText}>No contacts added yet. Tap "+ Add" to add your transplant team.</Text>
        </Card>
      ) : null}

      {/* Share Info */}
      <Card flat style={{ backgroundColor: colors.emerald50 }}>
        <Text style={styles.shareInfoTitle}>📤 Share with Your Care Team</Text>
        <Text style={styles.shareInfoText}>
          Tap "Share" above to generate a PDF with your vitals, lab values, and medications. Share via email, messages, or print for your next appointment.
        </Text>
      </Card>

      <View style={{ height: 40 }} />

      {/* Contact Modal */}
      <Modal visible={showContactModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowContactModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingContactIdx >= 0 ? 'Edit Contact' : 'Add Contact'}</Text>
            <Pressable onPress={() => setShowContactModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>Icon</Text>
          <View style={styles.iconRow}>
            {CONTACT_ICONS.map(ico => (
              <Pressable key={ico} style={[styles.iconBtn, cIcon === ico ? styles.iconBtnActive : null]} onPress={() => setCIcon(ico)}>
                <Text style={{ fontSize: 22 }}>{ico}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Name / Label *</Text>
          <TextInput value={cLabel} onChangeText={setCLabel} placeholder="e.g. Transplant Coordinator" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput value={cSub} onChangeText={setCSubText} placeholder="e.g. Business Hours" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Phone Number *</Text>
          <TextInput value={cPhone} onChangeText={setCPhone} placeholder="e.g. (650) 723-6661" placeholderTextColor={colors.slate300} keyboardType="phone-pad" style={styles.modalInput} />

          <Pressable style={[styles.urgentToggle, cUrgent ? styles.urgentToggleActive : null]} onPress={() => setCUrgent(!cUrgent)}>
            <Text style={styles.urgentToggleText}>{cUrgent ? '🔴 24/7 Urgent Line' : '⚪ Mark as 24/7 Urgent'}</Text>
          </Pressable>

          <Pressable
            style={[styles.saveBtn, (!cLabel.trim() || !cPhone.trim()) ? styles.btnDisabled : null]}
            disabled={!cLabel.trim() || !cPhone.trim()}
            onPress={saveContact}
          >
            <Text style={styles.saveBtnText}>{editingContactIdx >= 0 ? 'Save Changes' : 'Add Contact'}</Text>
          </Pressable>

          {editingContactIdx >= 0 ? (
            <Pressable style={styles.deleteBtn} onPress={() => { deleteContact(editingContactIdx); setShowContactModal(false); }}>
              <Text style={styles.deleteBtnText}>🗑 Remove Contact</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal visible={showProfileEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProfileEdit(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={() => setShowProfileEdit(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>Transplant Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {TRANSPLANT_TYPES.map(t => (
              <Pressable
                key={t}
                style={[styles.typeChip, editType === t ? styles.typeChipActive : null]}
                onPress={() => setEditType(t)}
              >
                <Text style={[styles.typeChipText, editType === t ? styles.typeChipTextActive : null]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Surgery / Transplant Date</Text>
          <Pressable style={styles.modalInput} onPress={() => setShowDatePicker(true)}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.slate800, lineHeight: 50 }}>
              {editSurgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </Pressable>

          {showDatePicker && Platform.OS === 'ios' ? (
            <View>
              <DateTimePicker
                value={editSurgDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, d) => { if (d) setEditSurgDate(d); }}
              />
              <Pressable style={[styles.saveBtn, { marginTop: 8 }]} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.saveBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : null}
          {showDatePicker && Platform.OS === 'android' ? (
            <DateTimePicker
              value={editSurgDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setEditSurgDate(d); }}
            />
          ) : null}

          <Pressable style={[styles.saveBtn, { marginTop: 24 }]} onPress={saveProfileEdit}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Appointment Modal */}
      <Modal visible={showApptModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowApptModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingApptId ? 'Edit Appointment' : 'Add Appointment'}</Text>
            <Pressable onPress={() => setShowApptModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>Date (YYYY-MM-DD) *</Text>
          <TextInput value={aDate} onChangeText={setADate} placeholder="e.g. 2026-04-15" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Time *</Text>
          <TextInput value={aTime} onChangeText={setATime} placeholder="e.g. 9:30 AM" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Doctor / Provider</Text>
          <TextInput value={aDoc} onChangeText={setADoc} placeholder="e.g. Dr. Smith" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput value={aDesc} onChangeText={setADesc} placeholder="e.g. 4-week follow-up" placeholderTextColor={colors.slate300} style={styles.modalInput} />

          <Pressable
            style={[styles.saveBtn, (!aDate.trim() || !aTime.trim()) ? styles.btnDisabled : null]}
            disabled={!aDate.trim() || !aTime.trim()}
            onPress={saveAppt}
          >
            <Text style={styles.saveBtnText}>{editingApptId ? 'Save Changes' : 'Add Appointment'}</Text>
          </Pressable>

          {editingApptId ? (
            <Pressable style={styles.deleteBtn} onPress={() => { deleteAppt(editingApptId); setShowApptModal(false); }}>
              <Text style={styles.deleteBtnText}>🗑 Remove Appointment</Text>
            </Pressable>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  shareBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  shareBtnBusy: { backgroundColor: colors.slate400 },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  surgLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginBottom: 4 },
  surgDate: { fontSize: 18, fontWeight: '700', color: colors.slate800, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: colors.indigo50, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.indigo600 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginTop: 2 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  tipBullet: { fontSize: 14, color: colors.indigo500, fontWeight: '700', marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: colors.indigo600, lineHeight: 20 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calBtn: { padding: 8 },
  calBtnText: { fontSize: 20, color: colors.slate700 },
  calTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  calLegend: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.slate500 },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  aptDate: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  aptDoc: { fontSize: 13, fontWeight: '600', color: colors.slate700, marginBottom: 2 },
  aptDesc: { fontSize: 12, color: colors.slate600 },
  aptLab: { fontSize: 11, color: colors.amber700, marginTop: 6, fontWeight: '500' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  restIcon: { fontSize: 24 },
  restTitle: { fontSize: 14, fontWeight: '600', color: colors.slate800 },
  restDesc: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.slate200, marginVertical: 8 },
  noRestText: { fontSize: 14, color: colors.emerald500, textAlign: 'center', paddingVertical: 12, fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 20 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.slate500 },
  addContactBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.indigo500 },
  addContactBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  emergBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergIcon: { fontSize: 32 },
  emergTitle: { fontSize: 16, fontWeight: '700', color: colors.rose700 },
  emergSub: { fontSize: 12, color: colors.rose600, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactIcon: { fontSize: 28 },
  contactLabel: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  contactSub: { fontSize: 12, color: colors.slate600, marginTop: 2 },
  contactPhone: { fontSize: 13, fontWeight: '600', color: colors.indigo500, marginTop: 4 },
  editContactBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.slate300 },
  editContactBtnText: { fontSize: 12, fontWeight: '600', color: colors.slate600 },
  noContactText: { fontSize: 13, color: colors.slate500, textAlign: 'center', paddingVertical: 8 },
  shareInfoTitle: { fontSize: 14, fontWeight: '700', color: colors.emerald700, marginBottom: 6 },
  shareInfoText: { fontSize: 13, color: colors.emerald700, lineHeight: 20 },
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
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  iconBtn: { padding: 8, borderRadius: 10, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  iconBtnActive: { borderColor: colors.indigo500, backgroundColor: colors.indigo50 },
  urgentToggle: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  urgentToggleActive: { borderColor: colors.rose500, backgroundColor: colors.rose50 },
  urgentToggleText: { fontSize: 14, fontWeight: '600', color: colors.slate700, textAlign: 'center' },
  saveBtn: { marginTop: 20, backgroundColor: colors.indigo500, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  deleteBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.rose200 },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: colors.rose500 },
  btnDisabled: { backgroundColor: colors.slate300 },
  editProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.indigo200, backgroundColor: colors.indigo50 },
  editProfileBtnText: { fontSize: 12, fontWeight: '600', color: colors.indigo600 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white },
  typeChipActive: { borderColor: colors.indigo500, backgroundColor: colors.indigo50 },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.slate600 },
  typeChipTextActive: { color: colors.indigo600 },
});
