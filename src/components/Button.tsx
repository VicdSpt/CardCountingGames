import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, loading, style }: ButtonProps) {
  const configs = {
    primary:   { bg: colors.accent,   text: colors.white,  border: colors.accent },
    secondary: { bg: colors.card,     text: colors.text,   border: colors.border },
    danger:    { bg: colors.danger,   text: colors.white,  border: colors.danger },
    ghost:     { bg: 'transparent',   text: colors.accent, border: colors.border },
  }[variant];

  const padV = { sm: 8, md: 13, lg: 16 }[size];
  const padH = { sm: 12, md: 20, lg: 28 }[size];
  const fontSize = { sm: 13, md: 15, lg: 16 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: configs.bg,
          borderColor: configs.border,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: radius.md,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={configs.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: configs.text, fontSize }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disabled: { opacity: 0.4 },
  text: { fontWeight: '600' },
});
