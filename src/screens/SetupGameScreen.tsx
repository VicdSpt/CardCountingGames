import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';
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
    if (players.length >= 8) return;
    setPlayers([...players, { id: generateId(), name: `Joueur ${players.length + 1}` }]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setDraftName(player.name);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (trimmed) setPlayers(players.map((p) => p.id === editingId ? { ...p, name: trimmed } : p));
    setEditingId(null);
  };

  const startGame = () => {
    navigation.replace(gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee', {
      gameId: generateId(),
      players,
      isNew: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{gameType === 'rikiki' ? 'Rikiki' : 'Yahtzee'}</Text>
            <Text style={styles.subtitle}>Configuration de la partie</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Section label */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Joueurs</Text>
            <Text style={styles.playerCount}>{players.length} / 8</Text>
          </View>

          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
            renderItem={({ item, index }) => {
              const color = getPlayerColor(index);
              return (
                <View style={[styles.playerRow, shadow.sm]}>
                  <View style={[styles.avatar, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                    <Text style={[styles.avatarText, { color }]}>{item.name.charAt(0).toUpperCase()}</Text>
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
                    <TouchableOpacity style={styles.nameBtn} onPress={() => startEdit(item)} activeOpacity={0.7}>
                      <Text style={styles.playerName}>{item.name}</Text>
                      <Ionicons name="pencil-outline" size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => removePlayer(item.id)}
                    style={[styles.removeBtn, players.length <= 2 && { opacity: 0.2 }]}
                    disabled={players.length <= 2}
                  >
                    <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {players.length < 8 && (
            <TouchableOpacity style={styles.addBtn} onPress={addPlayer} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color={colors.accent} />
              <Text style={styles.addText}>Ajouter un joueur</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Button label="Commencer la partie" onPress={startGame} size="lg" style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, padding: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.text },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: 1 },
  content: { flex: 1, padding: spacing.md },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  sectionLabel: { ...typography.label, color: colors.textMuted },
  playerCount: { ...typography.small, color: colors.textMuted },
  list: { flexGrow: 0 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md, marginBottom: spacing.xs,
    padding: spacing.sm, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontWeight: '700', fontSize: 14 },
  nameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  playerName: { ...typography.bodyBold, color: colors.text },
  nameInput: {
    flex: 1, color: colors.text, fontSize: 15, fontWeight: '600',
    backgroundColor: colors.card, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.accent,
  },
  removeBtn: { padding: 4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  addText: { ...typography.smallBold, color: colors.accent },
  footer: {
    padding: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    flexDirection: 'row',
  },
});
