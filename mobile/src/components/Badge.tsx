import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'temp' | 'potassium' | 'phosphorus' | 'sodium' | 'pink' | 'yellow';

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: { bg: colors.emerald50, text: colors.emerald700, border: colors.emerald200 },
  warning: { bg: colors.amber50, text: colors.amber700, border: colors.amber200 },
  danger: { bg: colors.rose50, text: colors.rose700, border: colors.rose200 },
  info: { bg: colors.sky50, text: colors.sky700, border: colors.sky400 },
  muted: { bg: colors.slate100, text: colors.slate500, border: colors.slate200 },
  temp: { bg: colors.cyan50, text: colors.cyan700, border: colors.cyan100 },
  potassium: { bg: colors.orange50, text: colors.orange700, border: colors.orange50 },
  phosphorus: { bg: colors.purple50, text: colors.purple700, border: colors.purple50 },
  sodium: { bg: colors.blue50, text: colors.blue700, border: colors.blue50 },
  pink: { bg: colors.pink50, text: colors.pink700, border: colors.pink50 },
  yellow: { bg: colors.yellow50, text: colors.yellow700, border: colors.yellow50 },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

export default function Badge({ label, variant = 'muted', icon }: BadgeProps) {
  const v = variantStyles[variant] || variantStyles.muted;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }]}>
      {icon ? <Text style={[styles.icon, { color: v.text }]}>{icon}</Text> : null}
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  icon: { fontSize: 10 },
  label: { fontSize: 11, fontWeight: '600' },
});
