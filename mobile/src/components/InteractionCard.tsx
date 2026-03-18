import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { colors } from '@/data/colors';
import type { InteractionResult } from '@/lib/interactionEngine';

interface InteractionCardProps {
  result: InteractionResult;
  coordinatorPhone?: string; // transplant coordinator phone for "Call" button
}

const SEVERITY_CONFIG = {
  informational: { bg: colors.slate50, border: colors.slate200, badge: colors.slate400, label: 'Info', icon: 'ℹ️' },
  caution:        { bg: colors.amber50,  border: colors.amber200, badge: colors.amber500, label: 'Caution', icon: '⚠️' },
  urgent_review:  { bg: '#FFF7ED',        border: '#FDBA74',       badge: '#F97316',       label: 'Review', icon: '🔶' },
  call_care_team: { bg: colors.rose50,   border: colors.rose200,  badge: colors.rose500,  label: 'Call Team', icon: '🚨' },
};

export default function InteractionCard({ result, coordinatorPhone }: InteractionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[result.rule.severity];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
      onPress={() => setExpanded(!expanded)}
      accessibilityRole="button"
      accessibilityLabel={`${result.rule.severity} interaction: ${result.medication.name} with ${result.rule.drugBLabel}`}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.medName} numberOfLines={1}>{result.medication.name}</Text>
            <Text style={styles.arrow}> ↔ </Text>
            <Text style={styles.drugBName} numberOfLines={1}>{result.rule.drugBLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.badge }]}>
            <Text style={styles.badgeText}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={[styles.chevron, expanded && styles.chevronOpen]}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded ? (
        <View style={styles.detail}>
          <Text style={styles.description}>{result.rule.description}</Text>

          <View style={styles.effectRow}>
            <Text style={styles.effectLabel}>What can happen</Text>
            <Text style={styles.effectText}>{result.rule.clinicalEffect}</Text>
          </View>

          <View style={[styles.actionRow, { borderColor: cfg.border }]}>
            <Text style={styles.actionLabel}>What to do</Text>
            <Text style={styles.actionText}>{result.rule.whatToDo}</Text>
          </View>

          {result.rule.severity === 'call_care_team' && coordinatorPhone ? (
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${coordinatorPhone}`)}
              accessibilityLabel="Call your transplant coordinator"
            >
              <Text style={styles.callBtnText}>📞 Call Your Coordinator</Text>
            </Pressable>
          ) : null}

          <Text style={styles.source}>Source: {result.rule.source} · Verified {result.rule.lastVerified}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { fontSize: 20, marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  medName: { fontSize: 14, fontWeight: '700', color: colors.slate800, flexShrink: 1 },
  arrow: { fontSize: 12, color: colors.slate500 },
  drugBName: { fontSize: 14, fontWeight: '600', color: colors.slate700, flexShrink: 1 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  chevron: { fontSize: 10, color: colors.slate400, marginTop: 4 },
  chevronOpen: { color: colors.slate600 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.slate200 },
  description: { fontSize: 13, color: colors.slate700, lineHeight: 19, marginBottom: 10 },
  effectRow: { marginBottom: 10 },
  effectLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate500, marginBottom: 4 },
  effectText: { fontSize: 13, color: colors.slate700, lineHeight: 19 },
  actionRow: { borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 10 },
  actionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate500, marginBottom: 4 },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.slate800, lineHeight: 19 },
  callBtn: {
    backgroundColor: colors.rose500, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginBottom: 10,
  },
  callBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  source: { fontSize: 10, color: colors.slate400, fontStyle: 'italic' },
});
