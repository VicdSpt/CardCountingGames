import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export const PLAYER_COLORS = [
  '#2C3E6B', '#3D7A5C', '#B7621A', '#7B3F6E',
  '#1A6B6B', '#6B2C2C', '#4A6B2C', '#2C5A6B',
];

interface PlayerBadgeProps {
  name: string;
  index: number;
  score?: number;
  size?: 'sm' | 'md';
}

export function PlayerBadge({ name, index, score, size = 'md' }: PlayerBadgeProps) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  const dim = size === 'sm' ? 30 : 38;
  const fontSize = size === 'sm' ? 12 : 15;

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color + '18', borderColor: color + '40' }]}>
        <Text style={[styles.initial, { fontSize, color }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {score !== undefined && (
        <Text style={[styles.score, { color }]}>{score > 0 ? `+${score}` : score}</Text>
      )}
    </View>
  );
}

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initial: { fontWeight: '700' },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 60,
    textAlign: 'center',
  },
  score: { fontSize: 13, fontWeight: '700' },
});
