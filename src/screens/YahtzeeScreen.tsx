import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { Button } from '../components/Button';
import { useGameStore, Player } from '../store/gameStore';
import {
  YahtzeeState, YahtzeeScores, YahtzeeCategory,
  UPPER_CATEGORIES, LOWER_CATEGORIES, CATEGORY_LABELS, FIXED_SCORES,
  UPPER_BONUS_THRESHOLD, UPPER_BONUS,
  calcYahtzeeUpperTotal, calcYahtzeeBonus, calcYahtzeeLowerTotal, calcYahtzeeTotal,
} from '../games/yahtzee/types';
import { getPlayerColor } from '../components/PlayerBadge';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initState(players: Player[]): YahtzeeState {
  return {
    players,
    scores: Object.fromEntries(players.map((p) => [p.id, {}])),
    history: [],
  };
}

export function YahtzeeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId, players: initPlayers, isNew } = route.params ?? {};
  const { savedGames, saveGame } = useGameStore();

  const [state, setState] = useState<YahtzeeState | null>(null);
  const [editCell, setEditCell] = useState<{ playerId: string; cat: YahtzeeCategory } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    if (isNew && initPlayers) {
      setState(initState(initPlayers));
    } else {
      const saved = savedGames.find((g) => g.id === gameId);
      if (saved) setState(saved.state as YahtzeeState);
    }
  }, []);

  const persist = useCallback(async (newState: YahtzeeState) => {
    await saveGame({
      id: gameId,
      gameType: 'yahtzee',
      players: newState.players,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: newState,
    });
  }, [gameId, saveGame]);

  const updateState = useCallback((updater: (s: YahtzeeState) => YahtzeeState) => {
    setState((prev) => {
      if (!prev) return prev;
      const snapshot: YahtzeeState = JSON.parse(JSON.stringify(prev));
      const next = updater(snapshot);
      next.history = [...(prev.history ?? []), { ...prev, history: [] }].slice(-30);
      persist(next);
      return next;
    });
  }, [persist]);

  const undo = () => {
    setState((prev) => {
      if (!prev || !prev.history || prev.history.length === 0) return prev;
      const history = [...prev.history];
      const last = history.pop()!;
      last.history = history;
      persist(last);
      return last;
    });
  };

  const openEdit = (playerId: string, cat: YahtzeeCategory) => {
    if (!state) return;
    const current = state.scores[playerId][cat];
    setEditValue(current !== undefined ? String(current) : '');
    setEditCell({ playerId, cat });
  };

  const commitEdit = () => {
    if (!editCell) return;
    const { playerId, cat } = editCell;
    const numStr = editValue.trim();
    if (numStr === '') {
      // clear the cell
      updateState((s) => {
        delete s.scores[playerId][cat];
        return s;
      });
    } else {
      const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 0) {
        Alert.alert('Valeur invalide', 'Entrez un nombre positif ou laissez vide pour effacer.');
        return;
      }
      updateState((s) => {
        s.scores[playerId][cat] = num;
        return s;
      });
    }
    setEditCell(null);
  };

  const isFinished = (scores: YahtzeeScores): boolean => {
    const all = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];
    return all.every((cat) => scores[cat] !== undefined);
  };

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.text, padding: spacing.md }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  const allFinished = state.players.every((p) => isFinished(state.scores[p.id]));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yahtzee</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={undo}
            style={[styles.iconBtn, { opacity: state.history?.length ? 1 : 0.3 }]}
            disabled={!state.history?.length}
          >
            <Ionicons name="arrow-undo" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowScoreboard(true)} style={styles.iconBtn}>
            <Ionicons name="trophy-outline" size={22} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Player columns header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.catLabel, styles.catLabelHeader]}>Catégorie</Text>
          {state.players.map((p, idx) => (
            <View key={p.id} style={styles.playerCol}>
              <Text style={[styles.playerColName, { color: getPlayerColor(idx) }]} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Upper section */}
        <SectionHeader title="Section haute" subtitle={`Bonus +${UPPER_BONUS} si ≥ ${UPPER_BONUS_THRESHOLD}`} color={colors.gold} />
        {UPPER_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat}
            cat={cat}
            players={state.players}
            scores={state.scores}
            onPress={openEdit}
          />
        ))}
        {/* Upper subtotal + bonus */}
        <SubtotalRow label="Sous-total haut" players={state.players} getValue={(p) => calcYahtzeeUpperTotal(state.scores[p.id])} />
        <SubtotalRow
          label={`Bonus (≥${UPPER_BONUS_THRESHOLD})`}
          players={state.players}
          getValue={(p) => calcYahtzeeBonus(state.scores[p.id])}
          color={colors.gold}
        />

        {/* Lower section */}
        <SectionHeader title="Section basse" color={colors.accentSoft} />
        {LOWER_CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat}
            cat={cat}
            players={state.players}
            scores={state.scores}
            onPress={openEdit}
            fixedScore={FIXED_SCORES[cat]}
          />
        ))}

        {/* Grand total */}
        <SubtotalRow
          label="TOTAL"
          players={state.players}
          getValue={(p) => calcYahtzeeTotal(state.scores[p.id])}
          bold
          color={colors.accent}
        />

        {allFinished && (
          <View style={styles.finishedBanner}>
            <Text style={styles.finishedText}>Partie terminée ! 🎉</Text>
            <Button label="Retour à l'accueil" onPress={() => navigation.navigate('Home')} variant="ghost" size="sm" style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editCell !== null} transparent animationType="fade" onRequestClose={() => setEditCell(null)}>
        <View style={styles.editOverlay}>
          <View style={styles.editSheet}>
            {editCell && (
              <>
                <Text style={styles.editTitle}>
                  {CATEGORY_LABELS[editCell.cat]}
                </Text>
                <Text style={styles.editSubtitle}>
                  {state.players.find((p) => p.id === editCell.playerId)?.name}
                </Text>
                {FIXED_SCORES[editCell.cat] !== undefined && (
                  <Text style={styles.editHint}>Score fixe si réussi: {FIXED_SCORES[editCell.cat]} pts</Text>
                )}
                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="number-pad"
                  autoFocus
                  placeholder="Score (vide pour effacer)"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={commitEdit}
                  returnKeyType="done"
                />
                <View style={styles.editButtons}>
                  <Button label="Annuler" onPress={() => setEditCell(null)} variant="ghost" style={{ flex: 1 }} />
                  <Button label="Valider" onPress={commitEdit} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Scoreboard modal */}
      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        state={state}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
      {subtitle && <Text style={styles.sectionHeaderSub}>{subtitle}</Text>}
    </View>
  );
}

function CategoryRow({ cat, players, scores, onPress, fixedScore }: {
  cat: YahtzeeCategory;
  players: { id: string; name: string }[];
  scores: Record<string, YahtzeeScores>;
  onPress: (playerId: string, cat: YahtzeeCategory) => void;
  fixedScore?: number;
}) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.catLabelContainer}>
        <Text style={styles.catLabel}>{CATEGORY_LABELS[cat]}</Text>
        {fixedScore !== undefined && <Text style={styles.catHint}>{fixedScore}pts</Text>}
      </View>
      {players.map((p, idx) => {
        const val = scores[p.id][cat];
        const color = getPlayerColor(idx);
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.scoreCell, val !== undefined && { backgroundColor: color + '22' }]}
            onPress={() => onPress(p.id, cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.scoreCellText, val !== undefined && { color }]}>
              {val !== undefined ? String(val) : '—'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SubtotalRow({ label, players, getValue, bold, color }: {
  label: string;
  players: { id: string; name: string }[];
  getValue: (p: { id: string; name: string }) => number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={[styles.categoryRow, styles.subtotalRow]}>
      <Text style={[styles.catLabel, bold && styles.catLabelBold, color ? { color } : {}]}>{label}</Text>
      {players.map((p, idx) => {
        const val = getValue(p);
        const c = color ?? getPlayerColor(idx);
        return (
          <View key={p.id} style={styles.scoreCell}>
            <Text style={[styles.scoreCellText, { color: c }, bold && styles.scoreBold]}>
              {val}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ScoreboardModal({ visible, onClose, state }: {
  visible: boolean;
  onClose: () => void;
  state: YahtzeeState;
}) {
  const sorted = [...state.players].sort(
    (a, b) => calcYahtzeeTotal(state.scores[b.id]) - calcYahtzeeTotal(state.scores[a.id])
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Classement</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {sorted.map((p, i) => {
            const idx = state.players.findIndex((sp) => sp.id === p.id);
            const color = getPlayerColor(idx);
            return (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankNum}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                <Text style={[styles.rankName, { color }]}>{p.name}</Text>
                <Text style={styles.rankScore}>{calcYahtzeeTotal(state.scores[p.id])} pts</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  playerCol: { flex: 1, alignItems: 'center' },
  playerColName: { fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    backgroundColor: colors.surface,
    padding: spacing.sm, paddingHorizontal: spacing.md,
    marginTop: spacing.xs, borderLeftWidth: 3,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionHeaderText: { ...typography.bodyBold },
  sectionHeaderSub: { ...typography.tiny, color: colors.textMuted },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    minHeight: 44,
  },
  subtotalRow: { backgroundColor: colors.surface },
  catLabelContainer: { flex: 2, paddingHorizontal: spacing.md },
  catLabel: { ...typography.small, color: colors.text, flex: 2, paddingHorizontal: spacing.md },
  catLabelHeader: { color: colors.textMuted },
  catLabelBold: { fontWeight: '700' },
  catHint: { ...typography.tiny, color: colors.textMuted },
  scoreCell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, borderLeftWidth: 1, borderLeftColor: colors.border,
  },
  scoreCellText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  scoreBold: { fontWeight: '700', fontSize: 16 },
  finishedBanner: {
    margin: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.lg, alignItems: 'center',
  },
  finishedText: { ...typography.h2, color: colors.gold },
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  editSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg,
    width: 300,
  },
  editTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  editSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: 4 },
  editHint: { ...typography.small, color: colors.gold, marginBottom: spacing.md },
  editInput: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, color: colors.text, fontSize: 20,
    textAlign: 'center', fontWeight: '700', marginBottom: spacing.md,
  },
  editButtons: { flexDirection: 'row', gap: spacing.sm },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h2, color: colors.text },
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderRadius: radius.md,
    marginBottom: spacing.xs, gap: spacing.md,
    backgroundColor: colors.card,
  },
  rankNum: { fontSize: 20, width: 36 },
  rankName: { flex: 1, ...typography.bodyBold },
  rankScore: { ...typography.h3, color: colors.gold },
});
