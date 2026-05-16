import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Modal, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme';
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
      id: gameId, gameType: 'rikiki',
      players: newState.players,
      createdAt: Date.now(), updatedAt: Date.now(),
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
      if (!prev || !prev.history?.length) return prev;
      const history = [...prev.history];
      const last = history.pop()!;
      last.history = history;
      persist(last);
      return last;
    });
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  if (!state) return (
    <SafeAreaView style={styles.safe}>
      <Text style={[typography.body, { color: colors.textSecondary, padding: spacing.md }]}>Chargement…</Text>
    </SafeAreaView>
  );

  const round = state.rounds[state.currentRound];
  const totals = getRikikiTotals(state);
  const allBidsFilled = state.players.every((p) => round.bids[p.id] !== null);
  const allTricksFilled = state.players.every((p) => round.tricks[p.id] !== null);
  const totalBids = state.players.reduce((s, p) => s + (round.bids[p.id] ?? 0), 0);
  const bidEqualCards = totalBids === round.cardCount;

  const setBid = (playerId: string, value: number) =>
    updateState((s) => { s.rounds[s.currentRound].bids[playerId] = value; return s; });

  const setTricks = (playerId: string, value: number) =>
    updateState((s) => { s.rounds[s.currentRound].tricks[playerId] = value; return s; });

  const advancePhase = () => {
    if (state.phase === 'bidding') {
      if (!allBidsFilled) { showAlert('Annonces incomplètes', 'Tous les joueurs doivent annoncer.'); return; }
      updateState((s) => { s.phase = 'scoring'; return s; });
    } else if (state.phase === 'scoring') {
      if (!allTricksFilled) { showAlert('Plis incomplets', 'Entrez les plis pour tous les joueurs.'); return; }
      const totalTricks = state.players.reduce((s, p) => s + (round.tricks[p.id] ?? 0), 0);
      if (totalTricks !== round.cardCount) {
        showAlert('Total incorrect', `Total: ${totalTricks} pli(s), attendu: ${round.cardCount}.`);
        return;
      }
      updateState((s) => {
        const nextIdx = s.currentRound + 1;
        if (nextIdx >= sequence.length) {
          s.phase = 'finished';
        } else {
          s.rounds.push({
            roundNumber: nextIdx, cardCount: sequence[nextIdx],
            bids: Object.fromEntries(s.players.map((p) => [p.id, null])),
            tricks: Object.fromEntries(s.players.map((p) => [p.id, null])),
          });
          s.currentRound = nextIdx;
          s.phase = 'bidding';
        }
        return s;
      });
    }
  };

  const sortedByScore = [...state.players].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rikiki</Text>
          {state.phase !== 'finished' && (
            <Text style={styles.headerSub}>
              Manche {state.currentRound + 1} / {sequence.length} · {round.cardCount} carte{round.cardCount > 1 ? 's' : ''}
            </Text>
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
          <TouchableOpacity onPress={() => setShowScoreboard(true)} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {state.phase === 'finished' ? (
        <FinishedView players={sortedByScore} totals={totals} state={state} onHome={() => navigation.navigate('Home')} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Progress */}
          <View style={styles.progressRow}>
            {sequence.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSeg,
                  i < state.currentRound && styles.progressDone,
                  i === state.currentRound && styles.progressActive,
                ]}
              />
            ))}
          </View>

          {/* Phase pill */}
          <View style={styles.phaseRow}>
            <View style={[styles.phasePill, state.phase === 'scoring' && styles.phasePillScoring]}>
              <Text style={[styles.phaseText, state.phase === 'scoring' && styles.phaseTextScoring]}>
                {state.phase === 'bidding' ? 'Annonces' : 'Résultats'}
              </Text>
            </View>
            {state.phase === 'bidding' && (
              <Text style={[styles.bidTotal, bidEqualCards && styles.bidTotalWarn]}>
                Total annoncé : {totalBids} / {round.cardCount}
                {bidEqualCards ? '  ⚠︎' : ''}
              </Text>
            )}
          </View>

          {/* Table */}
          <View style={[styles.table, shadow.sm]}>
            {/* Header row */}
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 2 }]}>Joueur</Text>
              <Text style={styles.th}>Annonce</Text>
              {state.phase === 'scoring' && <Text style={styles.th}>Plis</Text>}
              <Text style={styles.th}>Tour</Text>
              <Text style={styles.th}>Total</Text>
            </View>

            {state.players.map((player, idx) => {
              const color = getPlayerColor(idx);
              const bid = round.bids[player.id];
              const tricks = round.tricks[player.id];
              const roundScore = state.phase === 'scoring' && bid !== null && tricks !== null
                ? calcRikikiScore(bid, tricks) : null;
              const total = totals[player.id];

              return (
                <View key={player.id} style={styles.tableRow}>
                  <View style={[styles.playerDot, { backgroundColor: color }]} />
                  <Text style={[styles.playerName, { flex: 2 }]} numberOfLines={1}>{player.name}</Text>

                  <NumberPicker value={bid} min={0} max={round.cardCount} onChange={(v) => setBid(player.id, v)} color={color} />

                  {state.phase === 'scoring' && (
                    <NumberPicker value={tricks} min={0} max={round.cardCount} onChange={(v) => setTricks(player.id, v)} color={color} />
                  )}

                  <Text style={[
                    styles.scoreCell,
                    roundScore !== null && roundScore > 0 && styles.scorePos,
                    roundScore !== null && roundScore < 0 && styles.scoreNeg,
                  ]}>
                    {roundScore !== null ? (roundScore > 0 ? `+${roundScore}` : String(roundScore)) : '—'}
                  </Text>

                  <Text style={[styles.scoreCell, styles.totalCell, { color }]}>{total}</Text>
                </View>
              );
            })}
          </View>

          {/* History */}
          {state.rounds.length > 1 && <ScoreHistory state={state} sequence={sequence} />}

          <Button
            label={state.phase === 'bidding' ? 'Valider les annonces' : 'Manche suivante'}
            onPress={advancePhase}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      )}

      {/* Scoreboard */}
      <ScoreboardModal visible={showScoreboard} onClose={() => setShowScoreboard(false)} players={sortedByScore} totals={totals} state={state} />
    </SafeAreaView>
  );
}

function ScoreHistory({ state, sequence }: { state: RikikiState; sequence: number[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const done = state.rounds.slice(0, state.currentRound);
  if (done.length === 0) return null;

  return (
    <View style={[styles.history, shadow.sm]}>
      <TouchableOpacity style={styles.historyToggle} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.historyTitle}>Historique</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded && done.map((r) => (
        <View key={r.roundNumber} style={styles.historyRow}>
          <Text style={styles.historyLabel}>M{r.roundNumber + 1} · {r.cardCount}c</Text>
          {state.players.map((p) => {
            const s = calcRikikiScore(r.bids[p.id] ?? null, r.tricks[p.id] ?? null);
            return (
              <Text key={p.id} style={[styles.historyScore, s > 0 && styles.scorePos, s < 0 && styles.scoreNeg]}>
                {s > 0 ? `+${s}` : s}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ScoreboardModal({ visible, onClose, players, totals, state }: {
  visible: boolean; onClose: () => void;
  players: { id: string; name: string }[];
  totals: Record<string, number>;
  state: RikikiState;
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
            return (
              <View key={p.id} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
                <View style={[styles.rankDot, { backgroundColor: color }]} />
                <Text style={styles.rankName}>{p.name}</Text>
                <Text style={[styles.rankScore, { color }]}>{totals[p.id]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function FinishedView({ players, totals, state, onHome }: {
  players: { id: string; name: string }[];
  totals: Record<string, number>;
  state: RikikiState;
  onHome: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.finishedContent}>
      <Text style={styles.finishedTitle}>Partie terminée</Text>
      <Text style={styles.finishedSub}>Classement final</Text>
      {players.map((p, i) => {
        const idx = state.players.findIndex((sp) => sp.id === p.id);
        const color = getPlayerColor(idx);
        return (
          <View key={p.id} style={[styles.rankRowLarge, shadow.sm, i === 0 && styles.rankFirst]}>
            <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
            <View style={[styles.rankDot, { backgroundColor: color }]} />
            <Text style={[styles.rankName, i === 0 && styles.rankNameFirst]}>{p.name}</Text>
            <Text style={[styles.rankScore, { color }, i === 0 && { fontSize: 20 }]}>{totals[p.id]} pts</Text>
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
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: spacing.md },
  progressSeg: { height: 3, flex: 1, minWidth: 6, borderRadius: 2, backgroundColor: colors.border },
  progressDone: { backgroundColor: colors.success },
  progressActive: { backgroundColor: colors.accent },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  phasePill: {
    paddingHorizontal: spacing.sm + 2, paddingVertical: 5,
    borderRadius: radius.full, backgroundColor: colors.accentLight,
    borderWidth: 1, borderColor: colors.accent + '30',
  },
  phasePillScoring: { backgroundColor: colors.successLight, borderColor: colors.success + '30' },
  phaseText: { ...typography.smallBold, color: colors.accent },
  phaseTextScoring: { color: colors.success },
  bidTotal: { ...typography.small, color: colors.textSecondary },
  bidTotalWarn: { color: colors.warning },
  table: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  th: { width: 50, textAlign: 'center', ...typography.label, color: colors.textMuted },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs,
  },
  playerDot: { width: 6, height: 6, borderRadius: 3 },
  playerName: { ...typography.bodyBold, color: colors.text },
  scoreCell: { width: 50, textAlign: 'center', ...typography.bodyBold, color: colors.textMuted },
  scorePos: { color: colors.success },
  scoreNeg: { color: colors.danger },
  totalCell: { fontWeight: '700' },
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
  historyLabel: { flex: 1, ...typography.small, color: colors.textMuted },
  historyScore: { width: 50, textAlign: 'center', ...typography.small, color: colors.textMuted },
  finishedContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  finishedTitle: { ...typography.h1, color: colors.text, marginBottom: 4 },
  finishedSub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
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
  rankPos: { fontSize: 20, width: 32 },
  rankDot: { width: 8, height: 8, borderRadius: 4 },
  rankName: { flex: 1, ...typography.bodyBold, color: colors.text },
  rankNameFirst: { ...typography.h3, color: colors.accent },
  rankScore: { ...typography.bodyBold, color: colors.text },
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
});
