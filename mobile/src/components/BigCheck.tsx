import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

interface BigCheckProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function BigCheck({ checked, onPress, disabled }: BigCheckProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.box,
        checked ? styles.checked : styles.unchecked,
        disabled ? styles.disabled : undefined,
      ]}
    >
      {checked ? <Text style={styles.mark}>{"\u2713"}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.indigo500, borderColor: colors.indigo500 },
  unchecked: { borderColor: colors.slate200, backgroundColor: 'transparent' },
  disabled: { opacity: 0.3 },
  mark: { fontSize: 18, fontWeight: '700', color: colors.white },
});
