import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  error?: boolean;
  placeholder?: string;
}

export default function NumberField({ label, value, onChange, unit, error, placeholder }: NumberFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || "\u2014"}
          placeholderTextColor={colors.slate300}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2 },
  inputNormal: { borderColor: colors.slate200, backgroundColor: 'rgba(248,250,252,0.8)' },
  inputError: { borderColor: colors.rose200, backgroundColor: colors.rose50 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.slate800 },
  unit: { fontSize: 11, fontWeight: '600', color: colors.slate400, marginLeft: 4 },
});
