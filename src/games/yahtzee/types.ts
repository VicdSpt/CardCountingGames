export type YahtzeeCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeOfAKind' | 'fourOfAKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance';

export const UPPER_CATEGORIES: YahtzeeCategory[] = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
];

export const LOWER_CATEGORIES: YahtzeeCategory[] = [
  'threeOfAKind', 'fourOfAKind', 'fullHouse',
  'smallStraight', 'largeStraight', 'yahtzee', 'chance',
];

export const CATEGORY_LABELS: Record<YahtzeeCategory, string> = {
  ones: '1 - As',
  twos: '2 - Deux',
  threes: '3 - Trois',
  fours: '4 - Quatre',
  fives: '5 - Cinq',
  sixes: '6 - Six',
  threeOfAKind: 'Brelan',
  fourOfAKind: 'Carré',
  fullHouse: 'Full',
  smallStraight: 'Petite Suite',
  largeStraight: 'Grande Suite',
  yahtzee: 'Yahtzee',
  chance: 'Chance',
};

export const FIXED_SCORES: Partial<Record<YahtzeeCategory, number>> = {
  fullHouse: 25,
  smallStraight: 30,
  largeStraight: 40,
  yahtzee: 50,
};

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;

export type YahtzeeScores = Partial<Record<YahtzeeCategory, number>>;

export interface YahtzeeState {
  players: { id: string; name: string }[];
  scores: Record<string, YahtzeeScores>; // playerId -> category -> score
  history: YahtzeeState[];
}

export function calcYahtzeeUpperTotal(scores: YahtzeeScores): number {
  return UPPER_CATEGORIES.reduce((sum, cat) => sum + (scores[cat] ?? 0), 0);
}

export function calcYahtzeeBonus(scores: YahtzeeScores): number {
  return calcYahtzeeUpperTotal(scores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
}

export function calcYahtzeeLowerTotal(scores: YahtzeeScores): number {
  // -1 means "failed" (crossed out), counts as 0
  return LOWER_CATEGORIES.reduce((sum, cat) => {
    const v = scores[cat] ?? 0;
    return sum + (v < 0 ? 0 : v);
  }, 0);
}

export function calcYahtzeeTotal(scores: YahtzeeScores): number {
  return calcYahtzeeUpperTotal(scores) + calcYahtzeeBonus(scores) + calcYahtzeeLowerTotal(scores);
}
