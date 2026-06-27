export function kellyFraction(
  odds: number,
  winProbability: number,
  maxFraction: number = 0.25
): number {
  if (odds <= 1 || winProbability <= 0 || winProbability >= 1) return 0;

  const b = odds - 1;
  const q = 1 - winProbability;
  const f = (b * winProbability - q) / b;

  return Math.max(0, Math.min(f, maxFraction));
}

export function kellyStake(
  bankroll: number,
  odds: number,
  winProbability: number,
  maxFraction: number = 0.25
): number {
  const fraction = kellyFraction(odds, winProbability, maxFraction);
  return bankroll * fraction;
}

export function impliedProbFromOdds(odds: number): number {
  if (odds <= 0) return 0;
  return 1 / odds;
}

export function edge(
  estimatedProb: number,
  odds: number
): number {
  const implied = impliedProbFromOdds(odds);
  return estimatedProb - implied;
}
