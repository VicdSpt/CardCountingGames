import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';
import { Button } from '../components/Button';
import { useGameStore, Player } from '../store/gameStore';
import { getPlayerColor } from '../components/PlayerBadge';
import {
  Game5000State, Game5000Config, Game5000Turn,
  DEFAULT_CONFIG, getTotals, SCORING_RULES,
} from '../games/game5000/types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initState(players: Player[], config: Game5000Config): Game5000State {
  return {
    players,
    config,
    turns: [{ turnNumber: 0, scores: Object.fromEntries(players.map((p) => [p.id, 0])) }],
    opened: Object.fromEntries(players.map((p) => [p.id, config.openingThreshold === 0])),
    phase: 'playing',
    winner: null,
    history: [],
  };
}

export function Game5000Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId, players: initPlayers, isNew, config: initConfig } = route.params ?? {};
  const { savedGames, saveGame } = useGameStore();

  const [state, setState] = useState<Game5000State | null>(null);
  // editCell: which player's score we're editing in current turn
  const [editCell, setEditCell] = useState<string | null>(null); // playerId
  const [editValue, setEditValue] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    if (isNew && initPlayers) {
      setState(initState(initPlayers, initConfig ?? DEFAULT_CONFIG));
    } else {
      const saved = savedGames.find((g) => g.id === gameId);
      if (saved) setState(saved.state as Game5000State);
    }
  }, []);

  const persist = useCallback(async (newState: Game5000State) => {
    if (!newState.players) return;
    await saveGame({
      id: gameId, gameType: '5000' as any,
      players: newState.players,
      createdAt: Date.now(), updatedAt: Date.now(),
      state: newState,
    });
  }, [gameId, saveGame]);

  const updateState = useCallback((updater: (s: Game5000State) => Game5000State) => {
    setState((prev) => {
      if (!prev) return prev;
      const snapshot: Game5000State = JSON.parse(JSON.stringify(prev));
      const next = updater(snapshot);
      next.history = [...(prev.history ?? []), { ...prev, history: [] }].slice(-50);
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

  const openEditCell = (playerId: string) => {
    if (!state) return;
    const currentTurn = state.turns[state.turns.length - 1];
    const current = currentTurn.scores[playerId] ?? 0;
    setEditValue(current > 0 ? String(current) : '');
    setEditCell(playerId);
  };

  const commitEditCell = () => {
    if (!editCell || !state) return;
    const num = parseInt(editValue.trim(), 10);
    const score = isNaN(num) || num < 0 ? 0 : num;
    updateState((s) => {
      const turn = s.turns[s.turns.length - 1];
      turn.scores[editCell] = score;

      // Check opening
      if (!s.opened[editCell] && s.config.openingThreshold > 0) {
        if (score >= s.config.openingThreshold) {
          s.opened[editCell] = true;
        }
      }
      return s;
    });
    setEditCell(null);
  };

  const validateTurn = () => {
    if (!state) return;
    const totals = getTotals(state);
    const winner = state.players.find((p) => totals[p.id] >= state.config.targetScore);
    updateState((s) => {
      if (winner) {
        s.phase = 'finished';
        s.winner = winner.id;
      } else {
        s.turns.push({
          turnNumber: s.turns.length,
          scores: Object.fromEntries(s.players.map((p) => [p.id, 0])),
        });
      }
      return s;
    });
  };

  if (!state) return (
    <SafeAreaView style={styles.safe}>
      <Text style={[typography.body, { color: colors.textSecondary, padding: spacing.md }]}>Chargement…</Text>
    </SafeAreaView>
  );

  const totals = getTotals(state);
  const currentTurn = state.turns[state.turns.length - 1];
  const sortedPlayers = [...state.players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>5000</Text>
          {state.phase === 'playing' && (
            <Text style={styles.headerSub}>Tour {state.turns.length} · Objectif {state.config.targetScore.toLocaleString()}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={undo}
            style={[styles.iconBtn, !state.history?.length && { opacity: 0.25 }]}
            disabled={!state.history?.length}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRules(true)} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowScoreboard(true)} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {state.phase === 'finished' ? (
        <FinishedView state={state} totals={totals} sortedPlayers={sortedPlayers} onHome={() => navigation.navigate('Home')} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Score cards */}
          <View style={styles.scoreCards}>
            {state.players.map((p, idx) => {
              const color = getPlayerColor(idx);
              const total = totals[p.id];
              const turnScore = currentTurn.scores[p.id] ?? 0;
              const isOpened = state.opened[p.id];
              const progress = Math.min(total / state.config.targetScore, 1);

              return (
                <View key={p.id} style={[styles.scoreCard, shadow.sm]}>
                  {/* Player name + status */}
                  <View style={styles.scoreCardTop}>
                    <View style={[styles.playerDot, { backgroundColor: color }]} />
                    <Text style={styles.scoreCardName} numberOfLines={1}>{p.name}</Text>
                    {!isOpened && (
                      <View style={styles.lockedBadge}>
                        <Text style={styles.lockedText}>Pas ouvert</Text>
                      </View>
                    )}
                  </View>

                  {/* Total */}
                  <Text style={[styles.scoreCardTotal, { color }]}>{total.toLocaleString()}</Text>

                  {/* Progress bar */}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
                  </View>

                  {/* Turn score input */}
                  <TouchableOpacity
                    style={[styles.turnInput, { borderColor: color + '50' }]}
                    onPress={() => openEditCell(p.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.turnInputLabel, { color: colors.textMuted }]}>Ce tour</Text>
                    <Text style={[styles.turnInputValue, { color: turnScore > 0 ? color : colors.textMuted }]}>
                      {turnScore > 0 ? `+${turnScore.toLocaleString()}` : '—'}
                    </Text>
                  </TouchableOpacity>

                  {/* Opening info */}
                  {!isOpened && state.config.openingThreshold > 0 && (
                    <Text style={styles.openingHint}>
                      Ouverture à {state.config.openingThreshold} pts en un tour
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* History table */}
          {state.turns.length > 1 && (
            <HistoryTable state={state} />
          )}

          <Button
            label="Valider le tour"
            onPress={validateTurn}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      )}

      {/* Edit score modal */}
      <Modal visible={editCell !== null} transparent animationType="fade" onRequestClose={() => setEditCell(null)}>
        <View style={styles.editOverlay}>
          <View style={[styles.editSheet, shadow.md]}>
            {editCell && (
              <>
                <Text style={styles.editTitle}>
                  {state.players.find((p) => p.id === editCell)?.name}
                </Text>
                <Text style={styles.editSubtitle}>Score de ce tour</Text>

                {/* Quick score buttons */}
                <View style={styles.quickScores}>
                  {[50, 100, 200, 300, 400, 500, 600, 1000].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={styles.quickBtn}
                      onPress={() => setEditValue((prev) => String((parseInt(prev || '0', 10)) + v))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickBtnText}>+{v}</Text>
                    </TouchableOpacity>
                  ))}
                  {state.config.suiteScore > 0 && (
                    <TouchableOpacity
                      style={[styles.quickBtn, styles.quickBtnSpecial]}
                      onPress={() => setEditValue((prev) => String((parseInt(prev || '0', 10)) + state.config.suiteScore))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickBtnText, { color: colors.accent }]}>Suite +{state.config.suiteScore}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="number-pad"
                  autoFocus
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={commitEditCell}
                  returnKeyType="done"
                />

                <View style={styles.editButtons}>
                  <Button label="Annuler" onPress={() => setEditCell(null)} variant="secondary" style={{ flex: 1 }} />
                  <Button label="Valider" onPress={commitEditCell} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Rules modal */}
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} config={state.config} />

      {/* Scoreboard */}
      <ScoreboardModal visible={showScoreboard} onClose={() => setShowScoreboard(false)} players={sortedPlayers} totals={totals} state={state} />
    </SafeAreaView>
  );
}

function HistoryTable({ state }: { state: Game5000State }) {
  const [expanded, setExpanded] = React.useState(false);
  const completedTurns = state.turns.slice(0, -1);
  if (completedTurns.length === 0) return null;

  return (
    <View style={[styles.history, shadow.sm]}>
      <TouchableOpacity style={styles.historyToggle} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.historyTitle}>Historique des tours</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded && (
        <>
          {/* Header */}
          <View style={[styles.historyRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.historyCell, styles.historyLabelCell, { color: colors.textMuted }]}>Tour</Text>
            {state.players.map((p, idx) => (
              <Text key={p.id} style={[styles.historyCell, { color: getPlayerColor(idx) }]} numberOfLines={1}>{p.name}</Text>
            ))}
          </View>
          {completedTurns.slice().reverse().map((turn) => (
            <View key={turn.turnNumber} style={styles.historyRow}>
              <Text style={[styles.historyCell, styles.historyLabelCell]}>{turn.turnNumber + 1}</Text>
              {state.players.map((p, idx) => {
                const score = turn.scores[p.id] ?? 0;
                return (
                  <Text key={p.id} style={[styles.historyCell, score > 0 && { color: getPlayerColor(idx), fontWeight: '600' }]}>
                    {score > 0 ? `+${score}` : '—'}
                  </Text>
                );
              })}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function RulesModal({ visible, onClose, config }: { visible: boolean; onClose: () => void; config: Game5000Config }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Règles de scoring</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {SCORING_RULES.map((rule) => (
            <View key={rule.label} style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>{rule.label}</Text>
              <Text style={styles.rulePoints}>{rule.points} pts</Text>
            </View>
          ))}
          {config.suiteScore > 0 && (
            <View style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>Suite (1-2-3-4-5 ou 2-3-4-5-6)</Text>
              <Text style={[styles.rulePoints, { color: colors.accent }]}>{config.suiteScore} pts</Text>
            </View>
          )}
          <View style={[styles.ruleRow, { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Objectif</Text>
            <Text style={[styles.rulePoints, { color: colors.accent }]}>{config.targetScore.toLocaleString()} pts</Text>
          </View>
          {config.openingThreshold > 0 && (
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Seuil d'ouverture</Text>
              <Text style={[styles.rulePoints, { color: colors.warning }]}>{config.openingThreshold} pts</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ScoreboardModal({ visible, onClose, players, totals, state }: {
  visible: boolean; onClose: () => void;
  players: { id: string; name: string }[];
  totals: Record<string, number>;
  state: Game5000State;
}) {
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
          {players.map((p, i) => {
            const idx = state.players.findIndex((sp) => sp.id === p.id);
            const color = getPlayerColor(idx);
            const progress = Math.min((totals[p.id] ?? 0) / state.config.targetScore, 1);
            return (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                <View style={[styles.playerDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rankTopRow}>
                    <Text style={styles.rankName}>{p.name}</Text>
                    <Text style={[styles.rankScore, { color }]}>{totals[p.id].toLocaleString()} pts</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function FinishedView({ state, totals, sortedPlayers, onHome }: {
  state: Game5000State;
  totals: Record<string, number>;
  sortedPlayers: { id: string; name: string }[];
  onHome: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winner);
  return (
    <ScrollView contentContainerStyle={styles.finishedContent}>
      <Text style={styles.finishedTitle}>Partie terminée !</Text>
      {winner && <Text style={styles.finishedWinner}>{winner.name} a gagné 🎲</Text>}
      <Text style={styles.finishedSub}>Classement final</Text>
      {sortedPlayers.map((p, i) => {
        const idx = state.players.findIndex((sp) => sp.id === p.id);
        const color = getPlayerColor(idx);
        return (
          <View key={p.id} style={[styles.rankRowLarge, shadow.sm, i === 0 && styles.rankFirst]}>
            <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
            <View style={[styles.playerDot, { backgroundColor: color }]} />
            <Text style={[styles.rankName, i === 0 && { color: colors.accent }]}>{p.name}</Text>
            <Text style={[styles.rankScore, { color }]}>{totals[p.id].toLocaleString()} pts</Text>
          </View>
        );
      })}
      <Button label="Retour à l'accueil" onPress={onHome} variant="secondary" style={{ marginTop: spacing.xl }} />
    </ScrollView>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.text },
  headerSub: { ...typography.tiny, color: colors.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  scoreCards: { gap: spacing.sm },
  scoreCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  scoreCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  playerDot: { width: 8, height: 8, borderRadius: 4 },
  scoreCardName: { ...typography.bodyBold, color: colors.text, flex: 1 },
  lockedBadge: {
    backgroundColor: colors.warningLight, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.warning + '30',
  },
  lockedText: { ...typography.tiny, color: colors.warning },
  scoreCardTotal: { fontSize: 32, fontWeight: '700', letterSpacing: -1, marginBottom: spacing.xs },
  progressBg: {
    height: 4, backgroundColor: colors.border,
    borderRadius: 2, overflow: 'hidden', marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  turnInput: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  turnInputLabel: { ...typography.small },
  turnInputValue: { ...typography.bodyBold, fontSize: 17 },
  openingHint: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  history: {
    marginTop: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  historyToggle: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: spacing.md,
  },
  historyTitle: { ...typography.smallBold, color: colors.textSecondary },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  historyCell: { flex: 1, textAlign: 'center', ...typography.small, color: colors.textMuted },
  historyLabelCell: { textAlign: 'left', color: colors.textMuted },
  editOverlay: { flex: 1, backgroundColor: 'rgba(26,25,23,0.3)', justifyContent: 'center', alignItems: 'center' },
  editSheet: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, width: 320, borderWidth: 1, borderColor: colors.border,
  },
  editTitle: { ...typography.h3, color: colors.text, marginBottom: 2 },
  editSubtitle: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  quickScores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  quickBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  quickBtnSpecial: { borderColor: colors.accent + '40', backgroundColor: colors.accentLight },
  quickBtnText: { ...typography.smallBold, color: colors.text },
  editInput: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, color: colors.text, fontSize: 28,
    textAlign: 'center', fontWeight: '700', marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  editButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
  ruleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ruleLabel: { ...typography.small, color: colors.text },
  rulePoints: { ...typography.smallBold, color: colors.text },
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rankRowLarge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  rankFirst: { borderColor: colors.accent + '40', backgroundColor: colors.accentLight },
  rankTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rankPos: { fontSize: 20, width: 32 },
  rankName: { flex: 1, ...typography.bodyBold, color: colors.text },
  rankScore: { ...typography.bodyBold },
  finishedContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  finishedTitle: { ...typography.h1, color: colors.text, marginBottom: 4 },
  finishedWinner: { ...typography.h2, color: colors.accent, marginBottom: spacing.xs },
  finishedSub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
});
