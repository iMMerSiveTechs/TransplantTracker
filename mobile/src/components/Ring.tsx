import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface RingProps {
  progress: number;
  size?: number;
  color?: string;
  children?: React.ReactNode;
}

export default function Ring({ progress, size = 56, color = '#6366F1', children }: RingProps) {
  const strokeWidth = 5;
  const r = (size - strokeWidth - 1) / 2;
  const ci = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${ci}`}
          strokeDashoffset={ci * (1 - p)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.children}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute' },
  children: { alignItems: 'center', justifyContent: 'center' },
});
