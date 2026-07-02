import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/data/colors';
import { RESTS, INIT_APPTS } from '@/data/restrictions';
import { dBt, wBt, fmtDate, SURG_DEFAULT } from '@/utils/dates';
import S from '@/utils/storage';
import Card from '@/components/Card';
import SectionLabel from '@/components/SectionLabel';
import Badge from '@/components/Badge';
import MiniCal from '@/components/MiniCal';
import { signOut } from '@/lib/auth';
import type { Profile, Appointment } from '@/data/types';

export default function MeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appts, setAppts] = useState<Appointment[]>(INIT_APPTS);
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const today = new Date();
  const daysSince = dBt(SURG_DEFAULT, today);
  const weeksSince = wBt(SURG_DEFAULT, today);

  useEffect(() => {
    async function load() {
      const savedProfile = await S.get('profile');
      const savedAppts = await S.get('appointments');
      const loggedIn = await S.get('auth_logged_in');
      if (savedProfile) setProfile(savedProfile);
      if (savedAppts) setAppts(savedAppts);
      setIsLoggedIn(!!loggedIn);
    }
    load();
  }, []);

  const activeRestrictions = RESTS.filter(r => weeksSince < r.w);
  const liftedRestrictions = RESTS.filter(r => weeksSince >= r.w);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{profile?.name || 'Your Profile'}</Text>
          <Text style={styles.subtitle}>
            {profile?.type || 'Kidney Transplant'} • Day {daysSince}
          </Text>
        </View>
      </View>

      {/* Surgery Info */}
      <Card accent={colors.indigo500}>
        <Text style={styles.surgLabel}>Transplant Date</Text>
        <Text style={styles.surgDate}>{fmtDate(SURG_DEFAULT)}</Text>
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
      <SectionLabel title="Upcoming Appointments" />
      {appts.slice(0, 3).map(apt => (
        <Card key={apt.id}>
          <View style={styles.aptHeader}>
            <Text style={styles.aptDate}>{apt.date}</Text>
            <Badge label={apt.time} variant="info" />
          </View>
          <Text style={styles.aptDoc}>{apt.doc}</Text>
          <Text style={styles.aptDesc}>{apt.desc}</Text>
          {apt.labBy ? (
            <Text style={styles.aptLab}>Lab work by: {apt.labBy}</Text>
          ) : null}
        </Card>
      ))}

      {/* Active Restrictions */}
      <SectionLabel
        title="Active Restrictions"
        sub={`${activeRestrictions.length} restrictions`}
      />
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
                  <Badge
                    label={weeksLeft === 1 ? '1 wk' : `${weeksLeft} wks`}
                    variant="warning"
                  />
                </View>
              </View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <Text style={styles.noRestText}>All early restrictions lifted!</Text>
        </Card>
      )}

      {/* Lifted Restrictions */}
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
      <SectionLabel title="Emergency Contacts" />
      <Card accent={colors.rose500}>
        <Pressable onPress={() => handleCall('911')} style={styles.emergBtn}>
          <Text style={styles.emergIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergTitle}>Emergency: Call 911</Text>
            <Text style={styles.emergSub}>Severe symptoms, chest pain, difficulty breathing</Text>
          </View>
        </Pressable>
      </Card>

      {profile?.contacts?.map((contact) => (
        <Card key={contact.phone}>
          <Pressable onPress={() => handleCall(contact.phone)} style={styles.contactRow}>
            <Text style={styles.contactIcon}>{contact.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>{contact.label}</Text>
              <Text style={styles.contactSub}>{contact.sub}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            {contact.urgent ? <Badge label="24/7" variant="danger" /> : null}
          </Pressable>
        </Card>
      ))}

      {/* Quick Actions */}
      <SectionLabel title="Tools" />
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push('/foods')}
        >
          <Text style={styles.actionIcon}>🍎</Text>
          <Text style={styles.actionLabel}>Food Guide</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push('/export')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>Export Data</Text>
        </Pressable>
      </View>

      {/* Account */}
      <SectionLabel title="Account" />
      {isLoggedIn ? (
        <Card>
          <View style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountLabel}>Cloud Sync Active</Text>
              <Text style={styles.accountSub}>Your data is being synced to the cloud</Text>
            </View>
            <Badge label="Synced" variant="success" />
          </View>
          <View style={styles.divider} />
          <Pressable
            style={styles.signOutBtn}
            onPress={async () => {
              try { await signOut(); } catch (_) {}
              await S.del('auth_logged_in');
              await S.del('auth_skipped');
              router.replace('/login');
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <View style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountLabel}>Local Only</Text>
              <Text style={styles.accountSub}>Sign in to sync data across devices</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable
            style={styles.signInBtn}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.signInText}>Sign In / Create Account</Text>
          </Pressable>
        </Card>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.slate800 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  surgLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginBottom: 4 },
  surgDate: { fontSize: 18, fontWeight: '700', color: colors.slate800, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: colors.indigo50, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.indigo600 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.indigo500, marginTop: 2 },
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
  emergBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emergIcon: { fontSize: 32 },
  emergTitle: { fontSize: 16, fontWeight: '700', color: colors.rose700 },
  emergSub: { fontSize: 12, color: colors.rose600, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon: { fontSize: 28 },
  contactLabel: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  contactSub: { fontSize: 12, color: colors.slate600, marginTop: 2 },
  contactPhone: { fontSize: 13, fontWeight: '600', color: colors.indigo500, marginTop: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  accountLabel: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  accountSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  signOutBtn: { paddingVertical: 12, alignItems: 'center' },
  signOutText: { fontSize: 14, fontWeight: '600', color: colors.rose500 },
  signInBtn: { backgroundColor: colors.indigo500, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  signInText: { fontSize: 14, fontWeight: '600', color: colors.white },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
});
