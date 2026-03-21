import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../data/colors';
import Card from './Card';
import Ring from './Ring';
import { cl } from '../utils/dates';

interface TacTimerProps {
  lastTacTime: number | null;
  onTake: () => void;
}

export default function TacTimer({ lastTacTime, onTake }: TacTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!lastTacTime) {
    return (
      <Card accent="#6366F1">
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.titleIndigo}>{"\u23F1\uFE0F"} Tacrolimus Timer</Text>
            <Text style={styles.sub}>Tap when you take your dose</Text>
          </View>
          <Pressable onPress={onTake} style={styles.logBtn}>
            <Text style={styles.logBtnText}>Log Dose</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  const elapsed = now - lastTacTime;
  const target = 12 * 3600000;
  const remaining = Math.max(target - elapsed, 0);
  const pct = cl(elapsed / target, 0, 1);
  const overdue = remaining === 0;
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgC = overdue ? "#E11D48" : remaining < 3600000 ? "#D97706" : "#6366F1";
  const takenStr = new Date(lastTacTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <Card accent={urgC}>
      <View style={styles.row}>
        <Ring progress={pct} size={64} color={urgC}>
          <Text style={[styles.ringText, { color: urgC }]}>{overdue ? "NOW" : `${hrs}h`}</Text>
        </Ring>
        <View style={styles.flex1}>
          <Text style={[styles.titleText, { color: overdue ? "#E11D48" : colors.slate800 }]}>
            {overdue ? "\u{1F6A8} Tacrolimus Due NOW" : "\u23F1\uFE0F Next Tacrolimus"}
          </Text>
          {overdue ? (
            <Text style={styles.overdueText}>12 hours have passed. Take now.</Text>
          ) : (
            <Text style={styles.timeText}>{hrs}h {String(mins).padStart(2, "0")}m {String(secs).padStart(2, "0")}s</Text>
          )}
          <Text style={styles.lastText}>Last: {takenStr}</Text>
        </View>
        <Pressable onPress={onTake} style={[styles.takeBtn, overdue ? styles.takeBtnOverdue : styles.takeBtnNormal]}>
          <Text style={[styles.takeBtnText, overdue ? { color: colors.white } : { color: colors.slate600 }]}>
            {overdue ? "Take Now" : "Re-log"}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex1: { flex: 1 },
  titleIndigo: { fontSize: 14, fontWeight: '600', color: colors.indigo500 },
  sub: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  logBtn: { backgroundColor: colors.indigo500, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  logBtnText: { fontSize: 12, fontWeight: '600', color: colors.white },
  ringText: { fontSize: 10, fontWeight: '700' },
  titleText: { fontSize: 14, fontWeight: '600' },
  overdueText: { fontSize: 12, fontWeight: '600', color: colors.rose600, marginTop: 2 },
  timeText: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  lastText: { fontSize: 10, color: colors.slate400, marginTop: 4 },
  takeBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  takeBtnOverdue: { backgroundColor: colors.rose500 },
  takeBtnNormal: { backgroundColor: colors.slate100 },
  takeBtnText: { fontSize: 12, fontWeight: '600' },
});
