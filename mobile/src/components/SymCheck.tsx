import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

interface SymCheckProps {
  label: string;
  checked: boolean;
  onPress: () => void;
  color?: 'rose' | 'amber';
}

export default function SymCheck({ label, checked, onPress, color = 'rose' }: SymCheckProps) {
  const onBg = color === 'rose' ? colors.rose500 : colors.amber500;
  const onBorder = color === 'rose' ? colors.rose500 : colors.amber500;
  const textColor = color === 'rose' ? colors.rose700 : colors.amber700;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.box, checked ? { backgroundColor: onBg, borderColor: onBorder } : styles.unchecked]}>
        {checked ? <Text style={styles.mark}>{"\u2713"}</Text> : null}
      </View>
      <Text style={[styles.label, checked ? { color: textColor, fontWeight: '500' } : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  unchecked: { borderColor: colors.slate200, backgroundColor: 'transparent' },
  mark: { fontSize: 10, fontWeight: '700', color: colors.white },
  label: { fontSize: 13, color: colors.slate600 },
});
