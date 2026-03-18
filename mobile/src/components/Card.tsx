import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../data/colors';

interface CardProps {
  children: React.ReactNode;
  flat?: boolean;
  accent?: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function Card({ children, flat, accent, onPress, style, disabled }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => [
          styles.card,
          flat ? styles.flat : styles.shadow,
          accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined,
          style,
          disabled && { opacity: 0.5 },
          pressed && !disabled && { opacity: 0.92 },
        ]}
        android_ripple={!disabled ? { color: 'rgba(0,0,0,0.06)' } : undefined}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        flat ? styles.flat : styles.shadow,
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined,
        style,
        disabled && { opacity: 0.5 },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(241,245,249,0.4)',
  },
  flat: {
    borderWidth: 1,
    borderColor: 'rgba(241,245,249,0.8)',
  },
  shadow: {
    shadowColor: colors.slate200,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
});
