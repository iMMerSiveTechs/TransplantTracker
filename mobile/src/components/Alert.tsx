import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

type AlertVariant = 'warning' | 'danger' | 'info' | 'success';

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; color: string }> = {
  warning: { bg: colors.amber50, border: colors.amber400, text: '#92400E', color: colors.amber500 },
  danger: { bg: colors.rose50, border: colors.rose400, text: '#9F1239', color: colors.rose500 },
  info: { bg: colors.sky50, border: colors.sky400, text: '#0C4A6E', color: colors.sky700 },
  success: { bg: colors.emerald50, border: colors.emerald400, text: '#064E3B', color: colors.emerald500 },
};

interface AlertProps {
  icon: string;
  title: string;
  msg: string;
  variant?: AlertVariant;
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
}

export default function Alrt({ icon, title, msg, variant = 'warning', onDismiss, action }: AlertProps) {
  const cfg = variantStyles[variant] || variantStyles.warning;
  return (
    <View style={[styles.container, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismissBtn} accessibilityLabel="Dismiss alert">
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      ) : null}
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: cfg.text }]}>{title}</Text>
        <Text style={[styles.msg, { color: cfg.text }]}>{msg}</Text>
        {action ? (
          <Pressable onPress={action.onPress} style={[styles.actionBtn, { backgroundColor: cfg.color }]}>
            <Text style={styles.actionBtnText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  icon: { fontSize: 20, marginTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  msg: { fontSize: 12, marginTop: 4, opacity: 0.8, lineHeight: 18 },
  dismissBtn: { position: 'absolute', top: 8, right: 8, padding: 4 },
  dismissText: { fontSize: 12, color: colors.slate400, fontWeight: '700' },
  actionBtn: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
});
