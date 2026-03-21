import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

export default function TextField({ label, value, onChange, placeholder, keyboardType }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor={colors.slate300}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400, marginBottom: 6 },
  input: { height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.slate200, backgroundColor: 'rgba(248,250,252,0.8)', fontSize: 14, fontWeight: '500', color: colors.slate800 },
});
