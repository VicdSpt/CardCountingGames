import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

const PLAYER_COLORS = [
  '#e94560', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#e91e63',
];

interface PlayerBadgeProps {
  name: string;
  index: number;
  score?: number;
  size?: 'sm' | 'md';
}

export function PlayerBadge({ name, index, score, size = 'md' }: PlayerBadgeProps) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  const dim = size === 'sm' ? 32 : 40;
  const fontSize = size === 'sm' ? 13 : 16;

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: color, width: dim, height: dim, borderRadius: dim / 2 }]}>
        <Text style={[styles.initial, { fontSize }]}>{name.charAt(0).toUpperCase()}</Text>
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
  container: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.white,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 60,
    textAlign: 'center',
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
  },
});
