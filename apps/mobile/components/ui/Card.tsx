import React from 'react';
import { View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  gradientColors?: string[];
}

export function Card({
  children,
  style,
  padding = 'md',
  variant = 'default',
  gradientColors,
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const paddingValue = {
    none: 0,
    sm: 16,
    md: 20,
    lg: 28,
  }[padding];

  if (variant === 'gradient' && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          styles.gradient,
          { padding: paddingValue },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        },
        variant === 'elevated' && styles.elevated,
        variant === 'glass' && (isDark ? styles.glassDark : styles.glassLight),
        { padding: paddingValue },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#6B5DD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 0,
  },
  gradient: {
    borderWidth: 0,
    shadowColor: '#6B5DD3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  glassLight: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  glassDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
});

export default Card;
