import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { NumberPicker } from '../components/NumberPicker';
import { Button } from '../components/Button';
import { useGameStore, Player } from '../store/gameStore';
import {
  RikikiState, RikikiRound, buildRoundSequence,
  calcRikikiScore, getRikikiTotals,
} from '../games/rikiki/types';
import { getPlayerColor } from '../components/PlayerBadge';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initState(players: Player[], sequence: number[]): RikikiState {
  const firstRound: RikikiRound = {
    roundNumber: 0,
    cardCount: sequence[0],
    bids: Object.fromEntries(players.map((p) => [p.id, null])),
    tricks: Object.fromEntries(players.map((p) => [p.id, null])),
  };
  return { players, rounds: [firstRound], currentRound: 0, phase: 'bidding', history: [] };
}

export function RikikiScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId, players: initPlayers, isNew } = route.params ?? {};
  const { savedGames, saveGame } = useGameStore();

  const [state, setState] = useState<RikikiState | null>(null);
  const [sequence, setSequence] = useState<number[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    if (isNew && initPlayers) {
      const seq = buildRoundSequence(initPlayers.length);
      setSequence(seq);
      setState(initState(initPlayers, seq));
    } else {
      const saved = savedGames.find((g) => g.id === gameId);
      if (saved) {
        const seq = buildRoundSequence(saved.players.length);
        setSequence(seq);
        setState(saved.state as RikikiState);
      }
    }
  }, []);

  const persist = useCallback(async (newState: RikikiState) => {
    await saveGame({
      id: gameId,
      gameType: 'rikiki',
      players: newState.players,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: newState,
    });
  }, [gameId, saveGame]);

  const updateState = useCallback((updater: (s: RikikiState) => RikikiState) => {
    setState((prev) => {
      if (!prev) return prev;
      const snapshot: RikikiState = JSON.parse(JSON.stringify(prev));
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

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.text, padding: spacing.md }}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  const round = state.rounds[state.currentRound];
  const totals = getRikikiTotals(state);
  const allBidsFilled = state.players.every((p) => round.bids[p.id] !== null);
  const allTricksFilled = state.players.every((p) => round.tricks[p.id] !== null);
  const totalBids = state.players.reduce((s, p) => s + (round.bids[p.id] ?? 0), 0);
  const bidLocked = totalBids === round.cardCount;

  const setBid = (playerId: string, value: number) => {
    updateState((s) => {
      s.rounds[s.currentRound].bids[playerId] = value;
      return s;
    });
  };

  const setTricks = (playerId: string, value: number) => {
    updateState((s) => {
      s.rounds[s.currentRound].tricks[playerId] = value;
      return s;
    });
  };

  const advancePhase = () => {
    if (state.phase === 'bidding') {
      if (!allBidsFilled) {
        Alert.alert('Annonces incomplètes', 'Tous les joueurs doivent annoncer.');
        return;
      }
      updateState((s) => { s.phase = 'scoring'; return s; });
    } else if (state.phase === 'scoring') {
      if (!allTricksFilled) {
        Alert.alert('Plis incomplets', 'Entrez le nombre de plis pour tous les joueurs.');
        return;
      }
      const totalTricks = state.players.reduce((s, p) => s + (round.tricks[p.id] ?? 0), 0);
      if (totalTricks !== round.cardCount) {
        Alert.alert(
          'Total des plis incorrect',
          `Total actuel: ${totalTricks} pli(s), attendu: ${round.cardCount}.`
        );
        return;
      }
      // Next round
      updateState((s) => {
        const nextRoundIdx = s.currentRound + 1;
        if (nextRoundIdx >= sequence.length) {
          s.phase = 'finished';
        } else {
          const nextRound: RikikiRound = {
            roundNumber: nextRoundIdx,
            cardCount: sequence[nextRoundIdx],
            bids: Object.fromEntries(s.players.map((p) => [p.id, null])),
            tricks: Object.fromEntries(s.players.map((p) => [p.id, null])),
          };
          s.rounds.push(nextRound);
          s.currentRound = nextRoundIdx;
          s.phase = 'bidding';
        }
        return s;
      });
    }
  };

  const sortedPlayers = [...state.players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rikiki</Text>
          {state.phase !== 'finished' && (
            <Text style={styles.headerSub}>
              Manche {state.currentRound + 1}/{sequence.length} • {round.cardCount} carte{round.cardCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
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

      {state.phase === 'finished' ? (
        <FinishedView players={sortedPlayers} totals={totals} onNewGame={() => navigation.navigate('Home')} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            {sequence.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < state.currentRound && styles.progressDone,
                  i === state.currentRound && styles.progressCurrent,
                ]}
              />
            ))}
          </View>

          {/* Phase label */}
          <View style={styles.phaseRow}>
            <View style={[styles.phaseBadge, state.phase === 'scoring' && styles.phaseBadgeScoring]}>
              <Text style={styles.phaseText}>
                {state.phase === 'bidding' ? '📣 Annonces' : '✅ Résultats'}
              </Text>
            </View>
            {state.phase === 'bidding' && (
              <Text style={[styles.bidWarning, bidLocked && styles.bidWarningBad]}>
                Total annoncé: {totalBids}/{round.cardCount}
                {bidLocked ? ' ⚠️' : ''}
              </Text>
            )}
          </View>

          {/* Players table */}
          <View style={styles.table}>
            {/* Column headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { flex: 2 }]}>Joueur</Text>
              <Text style={styles.colHeader}>Annonce</Text>
              {state.phase === 'scoring' && <Text style={styles.colHeader}>Plis</Text>}
              <Text style={styles.colHeader}>Points</Text>
              <Text style={styles.colHeader}>Total</Text>
            </View>

            {state.players.map((player, idx) => {
              const color = getPlayerColor(idx);
              const bid = round.bids[player.id];
              const tricks = round.tricks[player.id];
              const roundScore = state.phase === 'scoring' && bid !== null && tricks !== null
                ? calcRikikiScore(bid, tricks)
                : null;
              const total = totals[player.id];

              return (
                <View key={player.id} style={[styles.tableRow, { borderLeftColor: color }]}>
                  <Text style={[styles.playerName, { flex: 2 }]} numberOfLines={1}>{player.name}</Text>

                  <NumberPicker
                    value={bid}
                    min={0}
                    max={round.cardCount}
                    onChange={(v) => setBid(player.id, v)}
                    color={color}
                  />

                  {state.phase === 'scoring' && (
                    <NumberPicker
                      value={tricks}
                      min={0}
                      max={round.cardCount}
                      onChange={(v) => setTricks(player.id, v)}
                      color={color}
                    />
                  )}

                  <Text style={[
                    styles.scoreText,
                    roundScore !== null && roundScore > 0 && styles.scorePos,
                    roundScore !== null && roundScore < 0 && styles.scoreNeg,
                  ]}>
                    {roundScore !== null ? (roundScore > 0 ? `+${roundScore}` : roundScore) : '—'}
                  </Text>

                  <Text style={[styles.totalText, { color }]}>{total}</Text>
                </View>
              );
            })}
          </View>

          {/* Scores history */}
          {state.rounds.length > 1 && (
            <ScoreHistory state={state} sequence={sequence} />
          )}

          <Button
            label={state.phase === 'bidding' ? 'Valider les annonces →' : 'Manche suivante →'}
            onPress={advancePhase}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      )}

      {/* Scoreboard modal */}
      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        players={sortedPlayers}
        totals={totals}
        state={state}
      />
    </SafeAreaView>
  );
}

function ScoreHistory({ state, sequence }: { state: RikikiState; sequence: number[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const completedRounds = state.rounds.filter((r, i) =>
    i < state.currentRound ||
    (i === state.currentRound && state.phase === 'scoring' &&
      state.players.every((p) => r.tricks[p.id] !== null))
  );
  if (completedRounds.length === 0) return null;

  return (
    <View style={styles.history}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Historique des manches</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded && completedRounds.map((r) => (
        <View key={r.roundNumber} style={styles.historyRow}>
          <Text style={styles.historyLabel}>M{r.roundNumber + 1} ({r.cardCount}c)</Text>
          {state.players.map((p, idx) => {
            const score = calcRikikiScore(r.bids[p.id] ?? null, r.tricks[p.id] ?? null);
            return (
              <Text
                key={p.id}
                style={[
                  styles.historyScore,
                  score > 0 && styles.scorePos,
                  score < 0 && styles.scoreNeg,
                ]}
              >
                {score > 0 ? `+${score}` : score}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ScoreboardModal({ visible, onClose, players, totals, state }: {
  visible: boolean;
  onClose: () => void;
  players: { id: string; name: string }[];
  totals: Record<string, number>;
  state: RikikiState;
}) {
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
          {players.map((p, i) => {
            const color = getPlayerColor(state.players.findIndex((sp) => sp.id === p.id));
            return (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankNum}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                <Text style={[styles.rankName, { color }]}>{p.name}</Text>
                <Text style={styles.rankScore}>{totals[p.id]} pts</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function FinishedView({ players, totals, onNewGame }: {
  players: { id: string; name: string }[];
  totals: Record<string, number>;
  onNewGame: () => void;
}) {
  return (
    <View style={styles.finished}>
      <Text style={styles.finishedTitle}>Partie terminée ! 🎉</Text>
      {players.map((p, i) => {
        const color = getPlayerColor(i);
        return (
          <View key={p.id} style={[styles.rankRow, { backgroundColor: colors.surface }]}>
            <Text style={styles.rankNum}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
            <Text style={[styles.rankName, { color }]}>{p.name}</Text>
            <Text style={styles.rankScore}>{totals[p.id]} pts</Text>
          </View>
        );
      })}
      <Button label="Retour à l'accueil" onPress={onNewGame} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.text },
  headerSub: { ...typography.tiny, color: colors.textSecondary },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  progressBar: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 4, marginBottom: spacing.md,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDone: { backgroundColor: colors.success },
  progressCurrent: { backgroundColor: colors.accent, width: 16 },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  phaseBadge: {
    backgroundColor: colors.card, paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: radius.full,
  },
  phaseBadgeScoring: { backgroundColor: '#1a4a2e' },
  phaseText: { ...typography.small, color: colors.text, fontWeight: '600' },
  bidWarning: { ...typography.small, color: colors.textSecondary },
  bidWarningBad: { color: colors.warning },
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.md, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  colHeader: {
    width: 50, textAlign: 'center',
    ...typography.tiny, color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    borderLeftWidth: 3, gap: spacing.xs,
  },
  playerName: { ...typography.bodyBold, color: colors.text },
  scoreText: { width: 50, textAlign: 'center', ...typography.bodyBold, color: colors.textMuted },
  scorePos: { color: colors.success },
  scoreNeg: { color: colors.accent },
  totalText: { width: 50, textAlign: 'center', ...typography.bodyBold },
  history: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    marginTop: spacing.md, overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: spacing.md,
  },
  historyTitle: { ...typography.bodyBold, color: colors.textSecondary },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  historyLabel: { flex: 1, ...typography.small, color: colors.textMuted },
  historyScore: { width: 50, textAlign: 'center', ...typography.small, color: colors.textMuted },
  finished: { flex: 1, padding: spacing.lg },
  finishedTitle: { ...typography.h1, color: colors.gold, textAlign: 'center', marginBottom: spacing.lg },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
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
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, gap: spacing.md,
  },
  rankNum: { fontSize: 20, width: 36 },
  rankName: { flex: 1, ...typography.bodyBold },
  rankScore: { ...typography.h3, color: colors.gold },
});
