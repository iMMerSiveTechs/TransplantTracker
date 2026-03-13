import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../data/colors';

interface SectionLabelProps {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

export default function SectionLabel({ title, sub, right }: SectionLabelProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: colors.slate400 },
  sub: { fontSize: 11, color: colors.slate400, marginTop: 2 },
});
