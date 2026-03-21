import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../data/colors';
import { toId, getLabType } from '../utils/dates';
import type { Appointment } from '../data/types';

interface MiniCalProps {
  year: number;
  month: number;
  onDay?: (d: Date, info: { lt: string | null; ap?: Appointment; dl?: Appointment }) => void;
  appts?: Appointment[];
}

export default function MiniCal({ year, month, onDay, appts = [] }: MiniCalProps) {
  const padCount = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tid = toId(new Date());
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const cells: (number | null)[] = [
    ...Array(padCount).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.headerRow}>
        {dayNames.map(d => (
          <View key={d} style={styles.headerCell}>
            <Text style={styles.headerText}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const dt = new Date(year, month, d);
          const id = toId(dt);
          const isToday = id === tid;
          const lt = getLabType(dt);
          const ap = appts.find(a => a.date === id);
          const dl = appts.find(a => a.labBy === id);

          return (
            <Pressable
              key={i}
              style={[styles.cell, isToday ? styles.todayCell : undefined]}
              onPress={() => onDay?.(dt, { lt, ap, dl })}
            >
              <Text style={[styles.dayText, isToday ? styles.todayText : undefined]}>{d}</Text>
              <View style={styles.dotsRow}>
                {lt === 'yellow' && <View style={[styles.dot, { backgroundColor: colors.yellow400 }]} />}
                {(lt === 'pink' || lt === 'pink-green') && <View style={[styles.dot, { backgroundColor: colors.pink400 }]} />}
                {(lt === 'green' || lt === 'pink-green') && <View style={[styles.dot, { backgroundColor: colors.emerald400 }]} />}
                {ap ? <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} /> : null}
                {dl ? <View style={[styles.dot, { backgroundColor: '#EF4444' }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', marginBottom: 4 },
  headerCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  headerText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%' as any, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  todayCell: { backgroundColor: colors.indigo50 },
  dayText: { fontSize: 14, fontWeight: '500', color: colors.slate700 },
  todayText: { color: colors.indigo500, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
