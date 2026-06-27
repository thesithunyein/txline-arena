import { BacktestEngine, generateSyntheticBacktestData } from '../src/backtest/engine';

async function main() {
  const numMatches = parseInt(process.argv[2] || '20');
  console.log(`\n=== TxLINE Arena — Backtest Mode ===`);
  console.log(`Generating ${numMatches} synthetic matches...\n`);

  const data = generateSyntheticBacktestData(numMatches);
  const engine = new BacktestEngine({
    initialBankroll: 1000,
    zScoreThreshold: 2.0,
    pctChangeThreshold: 10,
    windowSize: 20,
  });

  console.log('Running backtest...');
  const result = engine.run(data);

  console.log(`\n=== Results ===`);
  console.log(`Matches: ${result.totalMatches}`);
  console.log(`Signals: ${result.totalSignals}`);
  console.log(`Positions: ${result.totalPositions}`);
  console.log(`Prediction Accuracy: ${result.predictionAccuracy.toFixed(1)}%`);
  console.log(`Duration: ${result.durationMs}ms\n`);

  console.log('Agent Performance:');
  console.log('-'.repeat(80));
  for (const agent of result.agents) {
    console.log(`\n  ${agent.name}`);
    console.log(`    Strategy: ${agent.strategy}`);
    console.log(`    Final Bankroll: ${agent.finalBankroll.toFixed(2)} USDC`);
    console.log(`    P&L: ${agent.totalPnl >= 0 ? '+' : ''}${agent.totalPnl.toFixed(2)} USDC`);
    console.log(`    ROI: ${agent.roi >= 0 ? '+' : ''}${agent.roi.toFixed(1)}%`);
    console.log(`    Positions: ${agent.totalPositions} (${agent.wins}W / ${agent.losses}L)`);
    console.log(`    Win Rate: ${(agent.winRate * 100).toFixed(0)}%`);
    console.log(`    Sharpe Ratio: ${agent.sharpeRatio.toFixed(2)}`);
    console.log(`    Max Drawdown: -${agent.maxDrawdown.toFixed(1)}%`);
  }

  console.log('\n=== Backtest Complete ===\n');
}

main().catch(console.error);
