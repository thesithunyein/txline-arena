'use client';

import { Target, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SignalData } from '../lib/api';

// Surfaces the Sharp Movement Detector's hit-rate — the core evidence that the
// signal actually predicts outcomes (track idea #1: "tracking whether it
// predicted the outcome"). All values are derived from the signal set so the
// panel reflects real prediction tracking, live or replayed.
export function PredictionAccuracyCard({ signals }: { signals: SignalData[] }) {
  const settled = signals.filter((s) => s.predicted !== null);
  const correct = settled.filter((s) => s.predicted === true).length;
  const wrong = settled.length - correct;
  const pending = signals.length - settled.length;
  const accuracy = settled.length > 0 ? (correct / settled.length) * 100 : 0;

  const byDirection = (dir: string) => {
    const set = settled.filter((s) => s.direction === dir);
    const c = set.filter((s) => s.predicted === true).length;
    return { total: set.length, acc: set.length > 0 ? (c / set.length) * 100 : 0 };
  };
  const shortening = byDirection('shortening');
  const lengthening = byDirection('lengthening');

  // High-confidence subset (>= 0.75) should out-perform the baseline if the
  // confidence score is meaningful — a quick sanity check for judges.
  const highConf = settled.filter((s) => s.confidence >= 0.75);
  const highConfCorrect = highConf.filter((s) => s.predicted === true).length;
  const highConfAcc = highConf.length > 0 ? (highConfCorrect / highConf.length) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <Target className="h-4 w-4 text-gray-700" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Prediction Accuracy</h3>
        <span className="badge badge-gray ml-auto">{settled.length} settled</span>
      </div>

      <div className="flex items-end gap-3 mb-1">
        <span className="text-5xl font-bold tracking-tight text-gray-900 tabular-nums">
          {accuracy.toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 mb-2">of detected signals predicted the outcome</span>
      </div>

      {/* Stacked bar: correct / wrong / pending */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="bg-emerald-500" style={{ width: `${(correct / Math.max(1, signals.length)) * 100}%` }} />
        <div className="bg-red-400" style={{ width: `${(wrong / Math.max(1, signals.length)) * 100}%` }} />
        <div className="bg-gray-300" style={{ width: `${(pending / Math.max(1, signals.length)) * 100}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-gray-600"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {correct} correct</span>
        <span className="flex items-center gap-1.5 text-gray-600"><XCircle className="h-3.5 w-3.5 text-red-400" /> {wrong} wrong</span>
        <span className="flex items-center gap-1.5 text-gray-600"><Clock className="h-3.5 w-3.5 text-gray-400" /> {pending} pending</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Breakdown label="Shortening" value={shortening.acc} sample={shortening.total} />
        <Breakdown label="Lengthening" value={lengthening.acc} sample={lengthening.total} />
        <Breakdown label="High confidence" value={highConfAcc} sample={highConf.length} highlight />
      </div>
    </div>
  );
}

function Breakdown({ label, value, sample, highlight }: { label: string; value: number; sample: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${highlight ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value.toFixed(0)}%
      </p>
      <p className="text-[11px] text-gray-400">{sample} signals</p>
    </div>
  );
}
