import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, Platform, Alert, Modal, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { useGameStore, SavedGame, GameType } from '../store/gameStore';

const GAMES: { type: GameType; name: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    type: 'rikiki',
    name: 'Rikiki',
    description: 'Annonces & plis · Montée et descente',
    icon: 'layers-outline',
  },
  {
    type: 'yahtzee',
    name: 'Yahtzee',
    description: 'Dés · Catégories · Bonus',
    icon: 'dice-outline',
  },
  {
    type: '5000',
    name: '5000',
    description: '5 dés · Brelans · Premier à 5 000 pts',
    icon: 'ellipse-outline',
  },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { savedGames, loadGames, deleteGame } = useGameStore();
  const [pendingDelete, setPendingDelete] = useState<SavedGame | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const resumeGame = (game: SavedGame) => {
    const screen = game.gameType === 'rikiki' ? 'Rikiki' : game.gameType === 'yahtzee' ? 'Yahtzee' : 'Game5000';
    navigation.navigate(screen, { gameId: game.id });
  };

  const confirmDelete = (game: SavedGame) => {
    if (Platform.OS === 'web') {
      setPendingDelete(game);
    } else {
      Alert.alert(
        'Supprimer la partie ?',
        `${game.gameType === 'rikiki' ? 'Rikiki' : game.gameType === 'yahtzee' ? 'Yahtzee' : '5000'} — ${game.players.map((p) => p.name).join(', ')}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => deleteGame(game.id) },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Confirm delete modal (web) */}
      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmSheet, shadow.md]}>
            <Text style={styles.confirmTitle}>Supprimer ?</Text>
            <Text style={styles.confirmBody}>
              {pendingDelete?.gameType === 'rikiki' ? 'Rikiki' : pendingDelete?.gameType === 'yahtzee' ? 'Yahtzee' : '5000'}
              {' · '}{pendingDelete?.players.map((p) => p.name).join(', ')}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setPendingDelete(null)}>
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() => { deleteGame(pendingDelete!.id); setPendingDelete(null); }}
              >
                <Text style={styles.confirmDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CardScore</Text>
          <Text style={styles.subtitle}>Comptage de points</Text>
        </View>

        {/* Games */}
        <Text style={styles.sectionLabel}>Jeux disponibles</Text>
        <View style={styles.gameList}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.type}
              style={[styles.gameCard, shadow.sm]}
              onPress={() => navigation.navigate('SetupGame', { gameType: game.type })}
              activeOpacity={0.7}
            >
              <View style={styles.gameIconWrap}>
                <Ionicons name={game.icon} size={22} color={colors.accent} />
              </View>
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDesc}>{game.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Saved games */}
        {savedGames.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Parties en cours</Text>
            <View style={styles.savedList}>
              {savedGames.map((item) => (
                <View key={item.id} style={[styles.savedCard, shadow.sm]}>
                  <TouchableOpacity style={styles.savedMain} onPress={() => resumeGame(item)} activeOpacity={0.7}>
                    <View style={styles.savedDot} />
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedName}>
                        {item.gameType === 'rikiki' ? 'Rikiki' : item.gameType === 'yahtzee' ? 'Yahtzee' : '5000'}
                      </Text>
                      <Text style={styles.savedPlayers} numberOfLines={1}>
                        {item.players.map((p) => p.name).join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.savedDate}>
                      {new Date(item.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.savedDivider} />
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  gameList: { gap: spacing.xs },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameIconWrap: {
    width: 40, height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: { flex: 1 },
  gameName: { ...typography.bodyBold, color: colors.text },
  gameDesc: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  savedList: { gap: spacing.xs },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  savedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  savedDot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  savedInfo: { flex: 1 },
  savedName: { ...typography.bodyBold, color: colors.text },
  savedPlayers: { ...typography.small, color: colors.textSecondary, marginTop: 1 },
  savedDate: { ...typography.tiny, color: colors.textMuted },
  savedDivider: { width: 1, height: 32, backgroundColor: colors.border },
  deleteBtn: { padding: spacing.md },
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(26,25,23,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  confirmSheet: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, width: 300, borderWidth: 1, borderColor: colors.border,
  },
  confirmTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  confirmBody: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.lg },
  confirmButtons: { flexDirection: 'row', gap: spacing.sm },
  confirmCancel: {
    flex: 1, padding: spacing.sm + 2, borderRadius: radius.md,
    backgroundColor: colors.card, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  confirmCancelText: { ...typography.smallBold, color: colors.text },
  confirmDelete: {
    flex: 1, padding: spacing.sm + 2, borderRadius: radius.md,
    backgroundColor: colors.danger, alignItems: 'center',
  },
  confirmDeleteText: { ...typography.smallBold, color: colors.white },
});
