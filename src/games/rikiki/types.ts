export interface RikikiRound {
  roundNumber: number;
  cardCount: number; // number of cards dealt this round
  bids: Record<string, number | null>;   // playerId -> bid
  tricks: Record<string, number | null>; // playerId -> tricks won
}

export interface RikikiState {
  players: { id: string; name: string }[];
  rounds: RikikiRound[];
  currentRound: number;
  phase: 'bidding' | 'scoring' | 'finished';
  history: RikikiState[];
}

// Standard Rikiki: 1 card, 2 cards... up to max, then down
export function buildRoundSequence(playerCount: number): number[] {
  const max = Math.min(10, Math.floor(52 / playerCount));
  const up = Array.from({ length: max }, (_, i) => i + 1);
  const down = Array.from({ length: max - 1 }, (_, i) => max - 1 - i);
  return [...up, ...down];
}

export function calcRikikiScore(bid: number | null, tricks: number | null): number {
  if (bid === null || tricks === null) return 0;
  if (bid === tricks) return 10 + bid * 2;
  return -Math.abs(bid - tricks) * 2;
}

export function getRikikiTotals(state: RikikiState): Record<string, number> {
  const totals: Record<string, number> = {};
  state.players.forEach((p) => (totals[p.id] = 0));
  state.rounds.forEach((round) => {
    state.players.forEach((p) => {
      totals[p.id] += calcRikikiScore(round.bids[p.id] ?? null, round.tricks[p.id] ?? null);
    });
  });
  return totals;
}
