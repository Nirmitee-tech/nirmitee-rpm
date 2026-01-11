import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { brand, semantic } from '@/constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? brand.primary : '#FFFFFF'}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 8,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0,
  },
  primary: {
    backgroundColor: brand.primary,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  secondary: {
    backgroundColor: brand.secondary,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    elevation: 2,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: brand.primary,
  },
  danger: {
    backgroundColor: semantic.danger,
    shadowColor: semantic.danger,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: brand.primary,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_ghost: {
    color: brand.primary,
  },
  textSize_sm: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  textSize_md: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  textSize_lg: {
    fontSize: 17,
    letterSpacing: 0.4,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
