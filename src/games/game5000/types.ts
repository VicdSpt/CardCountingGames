export interface Game5000Config {
  targetScore: number;        // default 5000
  openingThreshold: number;   // 0 = aucun, 250, 500
  suiteScore: number;         // 0 = désactivé, 1000, 2000
}

export interface Game5000Turn {
  turnNumber: number;
  scores: Record<string, number>; // playerId -> points marqués ce tour
}

export interface Game5000State {
  players: { id: string; name: string }[];
  config: Game5000Config;
  turns: Game5000Turn[];
  opened: Record<string, boolean>; // playerId -> a ouvert son score
  phase: 'playing' | 'finished';
  winner: string | null;           // playerId
  history: Game5000State[];
}

export const DEFAULT_CONFIG: Game5000Config = {
  targetScore: 5000,
  openingThreshold: 500,
  suiteScore: 1000,
};

export function getTotals(state: Game5000State): Record<string, number> {
  const totals: Record<string, number> = {};
  state.players.forEach((p) => (totals[p.id] = 0));
  state.turns.forEach((turn) => {
    state.players.forEach((p) => {
      if (state.opened[p.id] || turn.scores[p.id] === undefined) {
        totals[p.id] += turn.scores[p.id] ?? 0;
      }
    });
  });
  return totals;
}

export function getTurnTotal(state: Game5000State, playerId: string): number {
  return state.turns.reduce((sum, t) => sum + (t.scores[playerId] ?? 0), 0);
}

// Calcule les points d'un tour (pour affichage informatif, pas de validation auto)
export const SCORING_RULES = [
  { label: '1 seul', points: 100 },
  { label: '5 seul', points: 50 },
  { label: 'Brelan de 1', points: 1000 },
  { label: 'Brelan de 2', points: 200 },
  { label: 'Brelan de 3', points: 300 },
  { label: 'Brelan de 4', points: 400 },
  { label: 'Brelan de 5', points: 500 },
  { label: 'Brelan de 6', points: 600 },
];
