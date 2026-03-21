import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

type AlertVariant = 'warning' | 'danger' | 'info' | 'success';

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string }> = {
  warning: { bg: colors.amber50, border: colors.amber400, text: '#92400E' },
  danger: { bg: colors.rose50, border: colors.rose400, text: '#9F1239' },
  info: { bg: colors.sky50, border: colors.sky400, text: '#0C4A6E' },
  success: { bg: colors.emerald50, border: colors.emerald400, text: '#064E3B' },
};

interface AlertProps {
  icon: string;
  title: string;
  msg: string;
  variant?: AlertVariant;
}

export default function Alrt({ icon, title, msg, variant = 'warning' }: AlertProps) {
  const v = variantStyles[variant] || variantStyles.warning;
  return (
    <View style={[styles.container, { backgroundColor: v.bg, borderLeftColor: v.border }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: v.text }]}>{title}</Text>
        <Text style={[styles.msg, { color: v.text }]}>{msg}</Text>
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
});
