import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { useGameStore, SavedGame, GameType } from '../store/gameStore';

const GAMES: { type: GameType; name: string; description: string; icon: string; color: string }[] = [
  {
    type: 'rikiki',
    name: 'Rikiki',
    description: 'Annonces + plis • Montée et descente',
    icon: 'layers-outline',
    color: '#e94560',
  },
  {
    type: 'yahtzee',
    name: 'Yahtzee',
    description: 'Dés • Catégories • Bonus',
    icon: 'dice-outline',
    color: '#3498db',
  },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { savedGames, loadGames, deleteGame } = useGameStore();

  useEffect(() => {
    loadGames();
  }, []);

  const resumeGame = (game: SavedGame) => {
    navigation.navigate(game.gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee', {
      gameId: game.id,
    });
  };

  const confirmDelete = (game: SavedGame) => {
    Alert.alert(
      'Supprimer la partie ?',
      `Partie de ${game.gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee'} avec ${game.players.map((p) => p.name).join(', ')}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteGame(game.id) },
      ]
    );
  };

  const startNewGame = (type: GameType) => {
    navigation.navigate('SetupGame', { gameType: type });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CardScore</Text>
          <Text style={styles.subtitle}>Fini les bouts de papier !</Text>
        </View>

        {/* Game list */}
        <Text style={styles.sectionTitle}>Choisir un jeu</Text>
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.type}
            style={[styles.gameCard, { borderLeftColor: game.color }]}
            onPress={() => startNewGame(game.type)}
            activeOpacity={0.75}
          >
            <View style={[styles.gameIcon, { backgroundColor: game.color + '22' }]}>
              <Ionicons name={game.icon as any} size={28} color={game.color} />
            </View>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDesc}>{game.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Saved games */}
        {savedGames.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Parties en cours</Text>
            <FlatList
              data={savedGames}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.savedCard}>
                  <TouchableOpacity style={styles.savedMain} onPress={() => resumeGame(item)} activeOpacity={0.75}>
                    <View>
                      <Text style={styles.savedName}>
                        {item.gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee'}
                      </Text>
                      <Text style={styles.savedPlayers}>
                        {item.players.map((p) => p.name).join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.savedDate}>
                      {new Date(item.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  header: { marginBottom: spacing.lg, marginTop: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  gameIcon: { padding: spacing.sm, borderRadius: radius.sm },
  gameInfo: { flex: 1 },
  gameName: { ...typography.h3, color: colors.text },
  gameDesc: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  savedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  savedName: { ...typography.bodyBold, color: colors.text },
  savedPlayers: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  savedDate: { ...typography.small, color: colors.textMuted },
  deleteBtn: { padding: spacing.md },
});
