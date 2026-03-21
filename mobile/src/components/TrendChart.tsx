import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon, Polyline, Circle as SvgCircle } from 'react-native-svg';
import { fmtShort } from '../utils/dates';
import { colors } from '../data/colors';

interface DataPoint {
  date: Date;
  log: any;
}

interface TrendChartProps {
  data: DataPoint[];
  dataKey: string;
  color?: string;
  label: string;
  unit: string;
  dangerAbove?: number;
  dangerBelow?: number;
}

export default function TrendChart({ data, dataKey, color = '#6366F1', label, unit, dangerAbove, dangerBelow }: TrendChartProps) {
  const valid = [...data].reverse().filter(d => d.log && d.log[dataKey] && !isNaN(parseFloat(d.log[dataKey])));

  if (valid.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Not enough data for {label}.</Text>
      </View>
    );
  }

  const vals = valid.map(d => parseFloat(d.log[dataKey]));
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const W = 300;
  const H = 64;
  const pad = 10;

  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * (W - pad * 2) + pad,
    y: H - pad - ((v - mn) / rng) * (H - pad * 2),
    v,
  }));

  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ');
  const polyStr = `${pts[0].x},${H - pad} ${lineStr} ${pts[pts.length - 1].x},${H - pad}`;
  const latest = vals[vals.length - 1];
  const isDanger = (dangerAbove !== undefined && latest > dangerAbove) || (dangerBelow !== undefined && latest < dangerBelow);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{label}</Text>
        <Text style={[styles.headerValue, isDanger ? { color: colors.rose500 } : { color }]}>
          {latest}
          <Text style={styles.headerUnit}> {unit}</Text>
        </Text>
      </View>
      <Svg width="100%" height={64} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id={`g${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points={polyStr} fill={`url(#g${dataKey})`} />
        <Polyline
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={lineStr}
        />
        {pts.map((p, i) => (
          <SvgCircle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 4 : 3}
            fill="#fff"
            stroke={isDanger && i === pts.length - 1 ? '#E11D48' : color}
            strokeWidth={i === pts.length - 1 ? 2.5 : 2}
          />
        ))}
      </Svg>
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{fmtShort(valid[0].date)}</Text>
        <Text style={styles.dateText}>{fmtShort(valid[valid.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  empty: { paddingVertical: 12, backgroundColor: colors.slate50, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.slate200, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 12, fontWeight: '600', color: colors.slate400 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  headerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.slate400 },
  headerValue: { fontSize: 14, fontWeight: '700' },
  headerUnit: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dateText: { fontSize: 9, color: colors.slate400, fontWeight: '500' },
});
