import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Alert, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';
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
    if (isNew && initPlayers) setState(initState(initPlayers));
    else {
      const saved = savedGames.find((g) => g.id === gameId);
      if (saved) setState(saved.state as YahtzeeState);
    }
  }, []);

  const persist = useCallback(async (newState: YahtzeeState) => {
    await saveGame({
      id: gameId, gameType: 'yahtzee',
      players: newState.players,
      createdAt: Date.now(), updatedAt: Date.now(),
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
      if (!prev || !prev.history?.length) return prev;
      const history = [...prev.history];
      const last = history.pop()!;
      last.history = history;
      persist(last);
      return last;
    });
  };

  const openEdit = (playerId: string, cat: YahtzeeCategory) => {
    if (!state || FIXED_SCORES[cat] !== undefined) return;
    const current = state.scores[playerId][cat];
    setEditValue(current !== undefined && current >= 0 ? String(current) : '');
    setEditCell({ playerId, cat });
  };

  const setFixedScore = (playerId: string, cat: YahtzeeCategory, success: boolean) => {
    updateState((s) => {
      const fixed = FIXED_SCORES[cat]!;
      const current = s.scores[playerId][cat];
      if (success && current === fixed) delete s.scores[playerId][cat];
      else if (!success && current === -1) delete s.scores[playerId][cat];
      else s.scores[playerId][cat] = success ? fixed : -1;
      return s;
    });
  };

  const commitEdit = () => {
    if (!editCell) return;
    const { playerId, cat } = editCell;
    const numStr = editValue.trim();
    if (numStr === '') {
      updateState((s) => { delete s.scores[playerId][cat]; return s; });
    } else {
      const num = parseInt(numStr, 10);
      if (isNaN(num) || num < 0) {
        if (Platform.OS === 'web') window.alert('Entrez un nombre positif ou laissez vide.');
        else Alert.alert('Valeur invalide', 'Entrez un nombre positif ou laissez vide pour effacer.');
        return;
      }
      updateState((s) => { s.scores[playerId][cat] = num; return s; });
    }
    setEditCell(null);
  };

  const isFinished = (scores: YahtzeeScores): boolean =>
    [...UPPER_CATEGORIES, ...LOWER_CATEGORIES].every((cat) => scores[cat] !== undefined);

  if (!state) return (
    <SafeAreaView style={styles.safe}>
      <Text style={[typography.body, { color: colors.textSecondary, padding: spacing.md }]}>Chargement…</Text>
    </SafeAreaView>
  );

  const allFinished = state.players.every((p) => isFinished(state.scores[p.id]));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yahtzee</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={undo}
            style={[styles.iconBtn, !state.history?.length && { opacity: 0.25 }]}
            disabled={!state.history?.length}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowScoreboard(true)} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Player header */}
        <View style={[styles.tableHeader, shadow.sm]}>
          <Text style={[styles.catCol, styles.thLabel]}>Catégorie</Text>
          {state.players.map((p, idx) => (
            <View key={p.id} style={styles.scoreCol}>
              <View style={[styles.playerInitial, { borderColor: getPlayerColor(idx) + '50', backgroundColor: getPlayerColor(idx) + '12' }]}>
                <Text style={[styles.playerInitialText, { color: getPlayerColor(idx) }]}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[styles.playerColName, { color: getPlayerColor(idx) }]} numberOfLines={1}>{p.name}</Text>
            </View>
          ))}
        </View>

        {/* Upper section */}
        <SectionHeader title="Section haute" right={`Bonus +${UPPER_BONUS} si ≥ ${UPPER_BONUS_THRESHOLD}`} />
        {UPPER_CATEGORIES.map((cat) => (
          <CategoryRow key={cat} cat={cat} players={state.players} scores={state.scores} onPress={openEdit} onFixedScore={setFixedScore} />
        ))}
        <TotalRow label="Sous-total" players={state.players} getValue={(p) => calcYahtzeeUpperTotal(state.scores[p.id])} />
        <TotalRow label={`Bonus +${UPPER_BONUS}`} players={state.players} getValue={(p) => calcYahtzeeBonus(state.scores[p.id])} highlight />

        {/* Lower section */}
        <SectionHeader title="Section basse" />
        {LOWER_CATEGORIES.map((cat) => (
          <CategoryRow key={cat} cat={cat} players={state.players} scores={state.scores} onPress={openEdit} onFixedScore={setFixedScore} fixedScore={FIXED_SCORES[cat]} />
        ))}

        {/* Grand total */}
        <TotalRow label="TOTAL" players={state.players} getValue={(p) => calcYahtzeeTotal(state.scores[p.id])} grand />

        {allFinished && (
          <View style={[styles.finishedBanner, shadow.sm]}>
            <Text style={styles.finishedText}>Partie terminée !</Text>
            <Button label="Retour à l'accueil" onPress={() => navigation.navigate('Home')} variant="secondary" size="sm" style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editCell !== null} transparent animationType="fade" onRequestClose={() => setEditCell(null)}>
        <View style={styles.editOverlay}>
          <View style={[styles.editSheet, shadow.md]}>
            {editCell && (
              <>
                <Text style={styles.editCat}>{CATEGORY_LABELS[editCell.cat]}</Text>
                <Text style={styles.editPlayer}>{state.players.find((p) => p.id === editCell.playerId)?.name}</Text>
                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="number-pad"
                  autoFocus
                  placeholder="Score"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={commitEdit}
                  returnKeyType="done"
                />
                <Text style={styles.editHint}>Laisser vide pour effacer</Text>
                <View style={styles.editButtons}>
                  <Button label="Annuler" onPress={() => setEditCell(null)} variant="secondary" style={{ flex: 1 }} />
                  <Button label="Valider" onPress={commitEdit} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Scoreboard */}
      <ScoreboardModal visible={showScoreboard} onClose={() => setShowScoreboard(false)} state={state} />
    </SafeAreaView>
  );
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right && <Text style={styles.sectionRight}>{right}</Text>}
    </View>
  );
}

function CategoryRow({ cat, players, scores, onPress, onFixedScore, fixedScore }: {
  cat: YahtzeeCategory;
  players: { id: string; name: string }[];
  scores: Record<string, YahtzeeScores>;
  onPress: (playerId: string, cat: YahtzeeCategory) => void;
  onFixedScore?: (playerId: string, cat: YahtzeeCategory, success: boolean) => void;
  fixedScore?: number;
}) {
  const isFixed = fixedScore !== undefined;
  return (
    <View style={styles.catRow}>
      <View style={styles.catCol}>
        <Text style={styles.catName}>{CATEGORY_LABELS[cat]}</Text>
        {isFixed && <Text style={styles.catFixed}>{fixedScore} pts</Text>}
      </View>
      {players.map((p, idx) => {
        const val = scores[p.id][cat];
        const color = getPlayerColor(idx);
        if (isFixed && onFixedScore) {
          const isSuccess = val === fixedScore;
          const isFail = val === -1;
          return (
            <View key={p.id} style={[styles.scoreCol, styles.fixedCellRow]}>
              <TouchableOpacity
                style={[styles.fixedBtn, isSuccess && { backgroundColor: colors.success, borderColor: colors.success }]}
                onPress={() => onFixedScore(p.id, cat, true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fixedBtnText, isSuccess && styles.fixedBtnActive]}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fixedBtn, isFail && { backgroundColor: colors.danger, borderColor: colors.danger }]}
                onPress={() => onFixedScore(p.id, cat, false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fixedBtnText, isFail && styles.fixedBtnActive]}>✗</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.scoreCol, styles.scoreCell, val !== undefined && val >= 0 && { backgroundColor: color + '10' }]}
            onPress={() => onPress(p.id, cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.scoreCellText, val !== undefined && val >= 0 && { color, fontWeight: '600' }]}>
              {val !== undefined && val >= 0 ? String(val) : '—'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TotalRow({ label, players, getValue, highlight, grand }: {
  label: string;
  players: { id: string; name: string }[];
  getValue: (p: { id: string; name: string }) => number;
  highlight?: boolean;
  grand?: boolean;
}) {
  return (
    <View style={[styles.catRow, styles.totalRow, grand && styles.grandRow]}>
      <Text style={[styles.catCol, styles.totalLabel, grand && styles.grandLabel]}>{label}</Text>
      {players.map((p, idx) => {
        const val = getValue(p);
        const color = grand ? colors.accent : highlight ? colors.success : getPlayerColor(idx);
        return (
          <View key={p.id} style={styles.scoreCol}>
            <Text style={[styles.totalValue, { color }, grand && { fontSize: 17 }]}>
              {highlight && val === 0 ? '—' : String(val)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ScoreboardModal({ visible, onClose, state }: { visible: boolean; onClose: () => void; state: YahtzeeState }) {
  const sorted = [...state.players].sort(
    (a, b) => calcYahtzeeTotal(state.scores[b.id]) - calcYahtzeeTotal(state.scores[a.id])
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Classement</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {sorted.map((p, i) => {
            const idx = state.players.findIndex((sp) => sp.id === p.id);
            const color = getPlayerColor(idx);
            return (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                <View style={[styles.rankDot, { backgroundColor: color }]} />
                <Text style={styles.rankName}>{p.name}</Text>
                <Text style={[styles.rankScore, { color }]}>{calcYahtzeeTotal(state.scores[p.id])} pts</Text>
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
    backgroundColor: colors.surface,
  },
  headerTitle: { ...typography.h3, color: colors.text, flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 2,
  },
  playerInitial: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    marginBottom: 3,
  },
  playerInitialText: { fontSize: 12, fontWeight: '700' },
  playerColName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1, borderTopWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { ...typography.label, color: colors.textSecondary },
  sectionRight: { ...typography.tiny, color: colors.textMuted },
  catRow: {
    flexDirection: 'row', alignItems: 'stretch',
    borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 46,
  },
  catCol: {
    flex: 2, paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  catName: { ...typography.small, color: colors.text },
  catFixed: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
  scoreCol: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: colors.border,
  },
  scoreCell: { minHeight: 46 },
  scoreCellText: { ...typography.body, color: colors.textMuted },
  thLabel: { ...typography.label, color: colors.textMuted, paddingHorizontal: spacing.md },
  fixedCellRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 4 },
  fixedBtn: {
    flex: 1, height: 34, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  fixedBtnText: { fontSize: 15, color: colors.textMuted },
  fixedBtnActive: { color: colors.white, fontWeight: '700' },
  totalRow: { backgroundColor: colors.card },
  grandRow: { backgroundColor: colors.accentLight, borderTopWidth: 2, borderTopColor: colors.accent + '30' },
  totalLabel: { ...typography.smallBold, color: colors.textSecondary },
  grandLabel: { ...typography.bodyBold, color: colors.accent },
  totalValue: { ...typography.bodyBold, textAlign: 'center' },
  finishedBanner: {
    margin: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  finishedText: { ...typography.h3, color: colors.text },
  editOverlay: { flex: 1, backgroundColor: 'rgba(26,25,23,0.3)', justifyContent: 'center', alignItems: 'center' },
  editSheet: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, width: 300, borderWidth: 1, borderColor: colors.border,
  },
  editCat: { ...typography.h3, color: colors.text, marginBottom: 2 },
  editPlayer: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  editInput: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, color: colors.text, fontSize: 24,
    textAlign: 'center', fontWeight: '700', marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  editHint: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  editButtons: { flexDirection: 'row', gap: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,25,23,0.3)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h2, color: colors.text },
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rankPos: { fontSize: 20, width: 32 },
  rankDot: { width: 8, height: 8, borderRadius: 4 },
  rankName: { flex: 1, ...typography.bodyBold, color: colors.text },
  rankScore: { ...typography.bodyBold },
});
