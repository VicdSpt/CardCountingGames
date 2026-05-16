import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { GameType, Player } from '../store/gameStore';
import { getPlayerColor } from '../components/PlayerBadge';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function SetupGameScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const gameType: GameType = route.params?.gameType;

  const [players, setPlayers] = useState<Player[]>([
    { id: generateId(), name: 'Joueur 1' },
    { id: generateId(), name: 'Joueur 2' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const addPlayer = () => {
    if (players.length >= 8) {
      Alert.alert('Maximum atteint', 'Vous pouvez avoir jusqu\'à 8 joueurs.');
      return;
    }
    const newPlayer = { id: generateId(), name: `Joueur ${players.length + 1}` };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 2) {
      Alert.alert('Minimum requis', 'Il faut au moins 2 joueurs.');
      return;
    }
    setPlayers(players.filter((p) => p.id !== id));
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setDraftName(player.name);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (trimmed) {
      setPlayers(players.map((p) => p.id === editingId ? { ...p, name: trimmed } : p));
    }
    setEditingId(null);
  };

  const startGame = () => {
    const gameId = generateId();
    navigation.replace(gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee', {
      gameId,
      players,
      isNew: true,
    });
  };

  const gameName = gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Nouvelle partie</Text>
            <Text style={styles.subtitle}>{gameName}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Joueurs ({players.length}/8)</Text>
        <Text style={styles.hint}>Appuyez sur un nom pour le modifier</Text>

        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item, index }) => {
            const color = getPlayerColor(index);
            return (
              <View style={[styles.playerRow, { borderLeftColor: color }]}>
                <View style={[styles.avatar, { backgroundColor: color }]}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>

                {editingId === item.id ? (
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                    autoFocus
                    selectTextOnFocus
                    maxLength={20}
                    returnKeyType="done"
                  />
                ) : (
                  <TouchableOpacity style={styles.nameBtn} onPress={() => startEdit(item)}>
                    <Text style={styles.playerName}>{item.name}</Text>
                    <Ionicons name="pencil-outline" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => removePlayer(item.id)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />

        <TouchableOpacity style={styles.addBtn} onPress={addPlayer} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={styles.addText}>Ajouter un joueur</Text>
        </TouchableOpacity>

        <Button
          label={`Commencer ${gameName}`}
          onPress={startGame}
          size="lg"
          style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backBtn: { padding: 4 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.small, color: colors.textSecondary },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  list: { flex: 1 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderLeftWidth: 4,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  nameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  playerName: { ...typography.bodyBold, color: colors.text },
  nameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  removeBtn: { padding: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addText: { ...typography.bodyBold, color: colors.accent },
});
