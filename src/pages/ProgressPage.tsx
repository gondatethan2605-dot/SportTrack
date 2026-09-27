import React, { useMemo, useState } from 'react';
import { BodyMeasurement, PersonalRecord, ExercisePerformance, ExerciseBest, WorkoutProgram } from '../types';
import {
  computeProgramRecommendations,
  recommendationForExercise,
  applyProgramTargetSuggestion,
} from '../utilsSmartProgram';
import {
  TrendingUp,
  Scale,
  Plus,
  Award,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Flame,
  Activity,
  ChevronDown,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import {
  sortPerformancesByDate,
  computeHistoryDeltas,
  computeProgressionSuggestion,
  metricIsApplicable,
  primaryProgressionMetric,
  performanceMetricValue,
  metricUnit,
  TrackedMetric,
  ProgressionDelta,
  analyzeProgression,
  suggestNextTarget,
} from '../utilsProgression';

const PerfRow: React.FC<{ entry: ExercisePerformance; delta: ProgressionDelta | null }> = ({ entry, delta }) => {
  const dateStr = new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const weightApplicable = metricIsApplicable(entry, 'weight') && entry.weightUsedKg > 0;
  const durationApplicable = metricIsApplicable(entry, 'duration');
  const volumeApplicable = metricIsApplicable(entry, 'volume');

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2" data-testid="perf-row">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-200">{dateStr}</span>
        </div>
        <EvolutionBadge delta={delta} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
        <MetricCell testid="perf-cell-sets" label="Séries validées" value={String(entry.setsCompleted)} suffix={`/${entry.setsPlanned}`} />
        <MetricCell testid="perf-cell-reps" label="Reps" value={entry.mode !== 'timer' ? String(entry.totalReps) : '—'} suffix={entry.mode !== 'timer' ? 'reps' : ''} />
        <MetricCell testid="perf-cell-duration" label="Durée" value={durationApplicable ? String(entry.totalDurationSec) : '—'} suffix={durationApplicable ? 'sec' : ''} />
        <MetricCell testid="perf-cell-weight" label="Poids max" value={weightApplicable ? String(entry.weightUsedKg) : '—'} suffix={weightApplicable ? 'kg' : ''} />
        <MetricCell testid="perf-cell-volume" label="Volume" value={volumeApplicable && entry.totalVolumeKg > 0 ? String(entry.totalVolumeKg) : '—'} suffix={volumeApplicable ? 'kg' : ''} />
        <MetricCell testid="perf-cell-best" label="Meilleure série" value={entry.bestSet ? String(entry.bestSet.durationSec ?? entry.bestSet.weightKg) : '—'} suffix={entry.bestSet ? (entry.bestSet.durationSec != null ? 'sec' : `${entry.bestSet.reps} reps`) : ''} />
      </div>
    </div>
  );
};

const MetricCell: React.FC<{ testid: string; label: string; value: string; suffix: string }> = ({ testid, label, value, suffix }) => {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-2" data-testid={testid}>
      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</div>
      <div className="font-display text-lg font-bold text-white">
        {value}
        {suffix && <span className="text-[10px] text-zinc-400 font-normal"> {suffix}</span>}
      </div>
    </div>
  );
};

const EvolutionBadge: React.FC<{ delta: ProgressionDelta | null }> = ({ delta }) => {
  if (!delta || delta.delta === null) {
    return <span className="text-xs font-bold text-zinc-500" data-testid="perf-evol">—</span>;
  }
  if (Math.abs(delta.delta) < 1e-9) {
    return <span className="text-xs font-bold text-zinc-400" data-testid="perf-evol">— stable</span>;
  }
  const sign = delta.delta > 0 ? '▲' : '▼';
  const cls = delta.delta > 0 ? 'text-emerald-400' : 'text-rose-400';
  const fmt = Math.round(delta.delta) === delta.delta ? String(delta.delta) : delta.delta.toFixed(1);
  return (
    <span className={`text-xs font-bold ${cls}`} data-testid="perf-evol">
      {sign} {delta.delta > 0 ? '+' : ''}
      {fmt} {delta.unit}
    </span>
  );
};

const ProgressChart: React.FC<{ entries: ExercisePerformance[] }> = ({ entries }) => {
  // Single-exercise curve. The curve follows the PRIMARY recorded metric of the
  // exercise (timer -> duration, weighted -> max weight, otherwise reps) and is
  // built from the chronologically sorted history, so it never mixes exercises.
  const model = useMemo(() => {
    const sorted = sortPerformancesByDate(entries || []);
    if (sorted.length === 0) return null;
    const metric: TrackedMetric = primaryProgressionMetric(sorted[sorted.length - 1]);
    const points = sorted
      .map((e) => ({ entry: e, v: performanceMetricValue(e, metric), ok: metricIsApplicable(e, metric) }))
      .filter((p) => p.ok);
    if (points.length === 0) return null;
    const values = points.map((p) => p.v);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max === min) {
      min = max - 10;
      max = max + 10;
    }
    const pad = (max - min) * 0.15 || 5;
    return { metric, unit: metricUnit(metric), sorted, points, min, max, pad };
  }, [entries]);

  if (!model) return null;

  const W = 640;
  const H = 180;
  const PAD_X = 42;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 34;

  const xFor = (i: number) =>
    model.points.length === 1 ? W / 2 : PAD_X + (i * (W - 2 * PAD_X)) / (model.points.length - 1);
  const yFor = (v: number) =>
    PAD_TOP + ((model.max + model.pad - v) * (H - PAD_TOP - PAD_BOTTOM)) / (model.max + model.pad - (model.min - model.pad));

  const coords = model.points.map((p, i) => ({ x: xFor(i), y: yFor(p.v), p }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const labelMap: Record<TrackedMetric, string> = {
    reps: 'Reps totaux',
    duration: 'Durée (sec)',
    weight: 'Poids max (kg)',
    volume: 'Volume (kg)',
  };
  const shortDate = (d: string) => {
    const dd = new Date(d);
    return `${dd.getDate()}/${dd.getMonth() + 1}`;
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="perf-chart">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
          Courbe — {labelMap[model.metric]}
        </span>
        <span className="text-[11px] text-zinc-400">
          {model.points.length} séance{model.points.length > 1 ? 's' : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Courbe de progression (${labelMap[model.metric]})`}>
        <line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} className="stroke-white/15" strokeWidth="1" />
        <line x1={PAD_X} y1={yFor(model.max + model.pad)} x2={PAD_X} y2={H - PAD_BOTTOM} className="stroke-white/15" strokeWidth="1" />
        <text x={PAD_X - 6} y={H - PAD_BOTTOM - 5} className="fill-zinc-500" fontSize="10" textAnchor="end">
          {model.min - model.pad + model.pad}
        </text>
        {model.points.length > 1 && <polyline points={line} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-violet-400" />}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3.5" className="fill-violet-400 stroke-[#12121a] stroke-2" />
            <text x={c.x} y={Math.max(PAD_TOP - 2, c.y - 8)} className="fill-zinc-300" fontSize="10" textAnchor="middle">
              {Number.isInteger(c.p.v) ? c.p.v : c.p.v.toFixed(1)}
            </text>
            {model.points.length > 1 && (
              <text x={c.x} y={H - 12} className="fill-zinc-500" fontSize="9" textAnchor="middle">
                {shortDate(c.p.entry.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

interface ProgressPageProps {
  measurements: BodyMeasurement[];
  records: PersonalRecord[];
  onAddMeasurement: (measurement: BodyMeasurement) => void;
  onAddRecord: (record: PersonalRecord) => void;
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
  // LOT 4 — Item 13: active program (pure optionally-applied suggestions).
  activeProgram?: WorkoutProgram;
  onSaveProgram?: (program: WorkoutProgram) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  measurements,
  records,
  onAddMeasurement,
  onAddRecord,
  exercisePerformances,
  exerciseBests,
  activeProgram,
  onSaveProgram,
}) => {
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedPerfExerciseId, setSelectedPerfExerciseId] = useState<string>('');
  // V8.1: suggestion resolution, reset whenever the exercise selection changes.
  const [suggestionAccepted, setSuggestionAccepted] = useState(false);
  const [suggestionIgnored, setSuggestionIgnored] = useState(false);
  // LOT 4 — Item 13: programme-aware suggestion resolution (per exercise).
  const [smartAccepted, setSmartAccepted] = useState(false);
  const [smartRefused, setSmartRefused] = useState(false);

  // LOT E — these fields were pre-filled with invented numbers (79 kg, 15 %
  // body fat, 106 cm chest...). A forgotten field silently saved a measurement
  // the user never took, and it then looked like real history. Empty now.
  // Measurement Form State
  const [weightKg, setWeightKg] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [armsCm, setArmsCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [thighsCm, setThighsCm] = useState('');
  const [measureNotes, setMeasureNotes] = useState('');
  const [measureError, setMeasureError] = useState<string | null>(null);

  // Record Form State
  const [recName, setRecName] = useState('');
  const [recWeight, setRecWeight] = useState('');
  const [recReps, setRecReps] = useState('');
  const [recordError, setRecordError] = useState<string | null>(null);

  // Optional numeric input: empty -> undefined, non-finite -> undefined.
  const optNum = (raw: string): number | undefined => {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = optNum(weightKg);
    // LOT E — refuse instead of persisting Number('') === 0 or NaN.
    if (weight === undefined || weight <= 0) {
      setMeasureError('Saisissez un poids valide (ex : 72,4) avant d’enregistrer.');
      return;
    }
    setMeasureError(null);
    const newM: BodyMeasurement = {
      id: `meas-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      weightKg: weight,
      bodyFatPercent: optNum(bodyFat),
      chestCm: optNum(chestCm),
      armsCm: optNum(armsCm),
      waistCm: optNum(waistCm),
      thighsCm: optNum(thighsCm),
      notes: measureNotes.trim() || undefined,
    };

    onAddMeasurement(newM);
    setShowMeasureForm(false);
    setMeasureNotes('');
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim()) {
      setRecordError('Indiquez le nom de l’exercice.');
      return;
    }
    const w = optNum(recWeight);
    const r = optNum(recReps);
    // LOT E — a record with no real weight/reps was stored as 0 and then hid
    // itself from the record lists (falsy checks) instead of being rejected.
    if (w === undefined || w <= 0) {
      setRecordError('Saisissez une charge valide (ex : 100) pour ce record.');
      return;
    }
    if (r === undefined || r <= 0) {
      setRecordError('Saisissez un nombre de répétitions valide (ex : 5).');
      return;
    }
    setRecordError(null);

    const newR: PersonalRecord = {
      id: `rec-${Date.now()}`,
      exerciseId: `custom-${Date.now()}`,
      exerciseName: recName.trim(),
      weightKg: w,
      reps: r,
      date: new Date().toISOString().split('T')[0],
    };

    onAddRecord(newR);
    setShowRecordForm(false);
    setRecName('');
  };

  // F6/F8 audit: measurements are read chronologically (by date), independent of
  // the insertion order used when they were stored. Storage is left untouched.
  const sortedMeasurements = useMemo(
    () =>
      [...measurements].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [measurements]
  );

  // LOT E — the old '|| 80' invented a body weight for users who had never
  // entered a measurement, showing a fake starting point and a fake 0,0 kg of
  // progress. Nullable now, and the header hides itself instead of inventing.
  const latestWeight = sortedMeasurements.length > 0 ? sortedMeasurements[sortedMeasurements.length - 1].weightKg : null;
  const firstWeight = sortedMeasurements.length > 0 ? sortedMeasurements[0].weightKg : null;
  const weightDiff = latestWeight !== null && firstWeight !== null ? (latestWeight - firstWeight).toFixed(1) : null;

  // ---- Performance history section (Phase 3) ----
  const perfOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of exercisePerformances) {
      if (!p.exerciseId) continue;
      if (!map.has(p.exerciseId)) map.set(p.exerciseId, p.exerciseName || p.exerciseId);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
      .map(([id, name]) => ({ id, name }));
  }, [exercisePerformances]);

  const activePerfSelection = selectedPerfExerciseId || perfOptions[0]?.id || '';

  const perfHistory = useMemo(
    () => sortPerformancesByDate(exercisePerformances.filter((p) => p.exerciseId === activePerfSelection)),
    [exercisePerformances, activePerfSelection]
  );

  const perfDeltas = useMemo(
    () => computeHistoryDeltas(exercisePerformances, activePerfSelection),
    [exercisePerformances, activePerfSelection]
  );

  // V8.1: reset the suggestion answer when switching exercise.
  const handlePerfSelection = (id: string) => {
    setSelectedPerfExerciseId(id);
    setSuggestionAccepted(false);
    setSuggestionIgnored(false);
    setSmartAccepted(false);
    setSmartRefused(false);
  };

  const suggestion = useMemo(
    () => computeProgressionSuggestion(exercisePerformances, activePerfSelection),
    [exercisePerformances, activePerfSelection]
  );

  // LOT D: analysed trend + conservative next-target recommendation.
  const analysis = useMemo(
    () => analyzeProgression(exercisePerformances, activePerfSelection),
    [exercisePerformances, activePerfSelection]
  );
  const recommendation = useMemo(
    () => suggestNextTarget(exercisePerformances, activePerfSelection),
    [exercisePerformances, activePerfSelection]
  );

  const metricLabel: Record<string, string> = {
    reps: 'répétitions',
    duration: 'secondes',
    weight: 'kg',
    volume: 'kg',
  };
  const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const trendInfo: Record<string, { label: string; cls: string }> = {
    progressing: { label: 'Progression', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    stagnating: { label: 'Stagnation', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    regressing: { label: 'Régression', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    insufficient: { label: 'Historique insuffisant', cls: 'text-zinc-300 bg-white/10 border-white/15' },
  };

  // LOT 4 — Item 13: programme-aware suggestion (reuses analyzeProgression /
  // suggestNextTarget). Pure + computed; applying never happens here.
  const programRecommendations = useMemo(
    () => computeProgramRecommendations(exercisePerformances, activeProgram || null),
    [exercisePerformances, activeProgram]
  );
  const programRecommendation = useMemo(
    () => recommendationForExercise(programRecommendations, activePerfSelection),
    [programRecommendations, activePerfSelection]
  );
  const programUnitLabel = programRecommendation ? metricLabel[programRecommendation.metric] || '' : '';
  const programTargetFieldLabel = programRecommendation
    ? programRecommendation.metric === 'reps'
      ? 'répétitions plan'
      : programRecommendation.metric === 'duration'
        ? 'durée plan'
        : programRecommendation.metric === 'weight'
          ? 'poids cible'
          : 'cible'
    : '';

  const handleSmartRefuse = () => {
    setSmartRefused(true);
  };

  const handleSmartAccept = () => {
    if (!programRecommendation || !onSaveProgram || !activeProgram) return;
    const updated = applyProgramTargetSuggestion(
      activeProgram,
      programRecommendation.exerciseId,
      programRecommendation.metric,
      programRecommendation.suggestedTarget
    );
    if (updated !== activeProgram) {
      onSaveProgram(updated);
    }
    setSmartAccepted(true);
  };

  return (
    <div id="page-progress" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
              Progression Corporelle & Records
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Suivi du poids de corps, mensurations et évolution de vos maxis (PR).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowMeasureForm(!showMeasureForm)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Pesée / Mensuration</span>
          </button>
          <button
            onClick={() => setShowRecordForm(!showRecordForm)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-violet-300 border border-white/10 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau PR</span>
          </button>
        </div>
      </div>

      {/* Forms */}
      {showMeasureForm && (
        <form
          onSubmit={handleSaveMeasurement}
          className="sport-card-active rounded-3xl p-6 sm:p-7 space-y-4 animate-in fade-in"
        >
          <h2 className="text-base font-bold text-violet-300">Enregistrer une nouvelle pesée</h2>
          {measureError && (
            <p role="alert" className="text-xs font-semibold text-red-300 bg-red-950/40 border border-red-500/40 rounded-2xl px-3 py-2">
              {measureError}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="meas-weight" className="block text-xs font-semibold text-zinc-300 mb-1">Poids (kg) *</label>
              <input
                id="meas-weight"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-bodyfat" className="block text-xs font-semibold text-zinc-300 mb-1">Masse grasse (% MG)</label>
              <input
                id="meas-bodyfat"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                max={70}
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-arms" className="block text-xs font-semibold text-zinc-300 mb-1">Tour de bras (cm)</label>
              <input
                id="meas-arms"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={armsCm}
                onChange={(e) => setArmsCm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-chest" className="block text-xs font-semibold text-zinc-300 mb-1">Tour de poitrine (cm)</label>
              <input
                id="meas-chest"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-waist" className="block text-xs font-semibold text-zinc-300 mb-1">Tour de taille (cm)</label>
              <input
                id="meas-waist"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="meas-thighs" className="block text-xs font-semibold text-zinc-300 mb-1">Tour de cuisse (cm)</label>
              <input
                id="meas-thighs"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={thighsCm}
                onChange={(e) => setThighsCm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowMeasureForm(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl shadow-md transition-all"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {showRecordForm && (
        <form
          onSubmit={handleSaveRecord}
          className="sport-card-active rounded-3xl p-6 sm:p-7 space-y-4 animate-in fade-in"
        >
          <h2 className="text-base font-bold text-violet-300">Ajouter un Record Personnel (PR)</h2>
          {recordError && (
            <p role="alert" className="text-xs font-semibold text-red-300 bg-red-950/40 border border-red-500/40 rounded-2xl px-3 py-2">
              {recordError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label htmlFor="rec-name" className="block text-xs font-semibold text-zinc-300 mb-1">Nom de l'exercice *</label>
              <input
                id="rec-name"
                type="text"
                required
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="Ex: Développé Couché"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label htmlFor="rec-weight" className="block text-xs font-semibold text-zinc-300 mb-1">Charge max (kg) *</label>
              <input
                id="rec-weight"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                required
                value={recWeight}
                onChange={(e) => setRecWeight(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
            <div>
              <label htmlFor="rec-reps" className="block text-xs font-semibold text-zinc-300 mb-1">Répétitions *</label>
              <input
                id="rec-reps"
                type="number"
                inputMode="numeric"
                min={1}
                required
                value={recReps}
                onChange={(e) => setRecReps(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRecordForm(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl shadow-md transition-all"
            >
              Enregistrer le record
            </button>
          </div>
        </form>
      )}

      {/* Body Progress Timeline Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Measurements Log (7 Cols) */}
        <div className="lg:col-span-7 sport-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-violet-400" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                Historique des Pesées
              </h2>
            </div>
            {measurements.length > 0 && (
              <span className="text-xs font-bold text-violet-300">
                Dernier poids : {latestWeight} kg ({weightDiff !== null && Number(weightDiff) >= 0 ? '+' + weightDiff : weightDiff} kg)
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {measurements.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 space-y-2">
                <Scale className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
                <p className="font-semibold text-zinc-300 text-sm">Aucune mesure corporelle enregistrée.</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Enregistrez votre première pesée pour suivre l'évolution de votre poids et de vos mensurations !
                </p>
                <button
                  onClick={() => setShowMeasureForm(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 hover:text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer une pesée</span>
                </button>
              </div>
            ) : (
              sortedMeasurements.slice().reverse().map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-bold text-zinc-200">
                        {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="font-display text-2xl font-bold text-violet-300">
                      {m.weightKg} <span className="text-xs text-zinc-400 font-normal">kg</span>
                    </div>
                  </div>

                  {/* Details chips */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                    {m.bodyFatPercent && (
                      <span className="bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        MG: <strong className="text-violet-300">{m.bodyFatPercent}%</strong>
                      </span>
                    )}
                    {m.armsCm && (
                      <span className="bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        Bras: <strong className="text-zinc-200">{m.armsCm} cm</strong>
                      </span>
                    )}
                    {m.chestCm && (
                      <span className="bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        Poitrine: <strong className="text-zinc-200">{m.chestCm} cm</strong>
                      </span>
                    )}
                    {m.waistCm && (
                      <span className="bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        Taille: <strong className="text-zinc-200">{m.waistCm} cm</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PR History (5 Cols) */}
        <div className="lg:col-span-5 sport-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Tableau des Records (PR)
            </h2>
          </div>

          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 space-y-2">
                <Award className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
                <p className="font-semibold text-zinc-300 text-sm">Aucun record personnel.</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Vos records personnels se mettront à jour automatiquement après chaque séance réussie !
                </p>
                <button
                  onClick={() => setShowRecordForm(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un record manuellement</span>
                </button>
              </div>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-zinc-200">{r.exerciseName}</h4>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span>{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span>•</span>
                      <span>{r.reps} reps</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-amber-300">
                      {r.weightKg} <span className="text-xs text-zinc-400 font-normal">kg</span>
                    </div>
                    {r.previousWeightKg && (
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        +{r.weightKg - r.previousWeightKg} kg de gain
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Historique de performance par exercice */}
      <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="perf-history-card">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
            Historique de Performance
          </h2>
        </div>

        {/* Selector */}
        <div className="relative">
          <select
            value={activePerfSelection}
            onChange={(e) => handlePerfSelection(e.target.value)}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer pr-10"
            aria-label="Sélectionner un exercice pour son historique"
            data-testid="perf-select"
          >
            {perfOptions.length === 0 && <option value="">Aucun exercice enregistré</option>}
            {perfOptions.map((o) => (
              <option key={o.id} value={o.id} className="bg-zinc-900 text-white">
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {perfOptions.length > 0 && !suggestionIgnored && (
          <div className="rounded-2xl bg-white/5 border border-violet-500/30 p-4 space-y-3" data-testid="progression-analysis">
            {suggestionAccepted && recommendation ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Objectif accepté : {fmtNum(recommendation.target)} {metricLabel[recommendation.metric] || ''} pour la prochaine séance.</span>
                </div>
                <button
                  onClick={() => { setSuggestionAccepted(false); setSuggestionIgnored(true); }}
                  className="text-[11px] text-zinc-400 hover:text-white font-semibold underline"
                >
                  Ignorer
                </button>
              </div>
            ) : recommendation ? (
              <div data-testid="progression-recommendation">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">Recommandation de progression</h4>
                  <span
                    data-testid="progression-trend"
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${trendInfo[recommendation.trend].cls}`}
                  >
                    {trendInfo[recommendation.trend].label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3">
                  <div className="rounded-xl bg-black/30 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Dernière performance</div>
                    <div className="font-display text-lg font-bold text-white" data-testid="progression-last-value">
                      {fmtNum(recommendation.last)} <span className="text-[10px] text-zinc-400 font-normal">{metricLabel[recommendation.metric]}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Meilleure performance</div>
                    <div className="font-display text-lg font-bold text-amber-300" data-testid="progression-best-value">
                      {recommendation.best != null ? `${fmtNum(recommendation.best)} ${metricLabel[recommendation.metric]}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/30 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Évolution</div>
                    <div className="font-display text-lg font-bold">
                      {recommendation.trend === 'progressing' ? (
                        <span className="text-emerald-400">▲ +{recommendation.previous != null ? fmtNum(recommendation.last - recommendation.previous) : '—'}</span>
                      ) : recommendation.trend === 'regressing' ? (
                        <span className="text-rose-400">▼ {recommendation.previous != null ? fmtNum(recommendation.last - recommendation.previous) : '—'}</span>
                      ) : recommendation.trend === 'stagnating' ? (
                        <span className="text-zinc-400">— stable</span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-violet-600/10 border border-violet-500/30 px-3 py-2.5 mt-3">
                  <span className="text-sm text-zinc-200">
                    <span className="font-bold text-white" data-testid="sugg-from">{fmtNum(recommendation.last)}</span>
                    <span className="text-zinc-500 mx-1">→</span>
                    <span className="font-bold text-violet-300" data-testid="progression-target">{fmtNum(recommendation.target)}</span>
                    <span className="text-zinc-400 text-xs"> {metricLabel[recommendation.metric]}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSuggestionAccepted(true); setSuggestionIgnored(false); }}
                      className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                      data-testid="sugg-apply"
                      aria-label="Appliquer la recommandation de progression comme objectif"
                    >
                      Appliquer
                    </button>
                    <button
                      onClick={() => setSuggestionIgnored(true)}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold uppercase tracking-wider transition-all"
                      data-testid="sugg-ignore"
                      aria-label="Ignorer la recommandation de progression"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 mt-2">{recommendation.reason}</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Repères de votre historique (jamais de conversion reps ↔ secondes). Appliquer fixe simplement un objectif : aucun programme n'est modifié automatiquement.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* LOT 4 — Item 13: Programme intelligent. Pure derived suggestion tied to
            the active program. Accepting ONLY rewrites the exercise's target in
            the program (reps plan / duration plan / target weight); sets, rest,
            mode and the rest of the program are never touched by this block. */}
        {smartAccepted && programRecommendation && (
          <div className="rounded-2xl bg-white/5 border border-emerald-500/30 p-4 space-y-3" data-testid="smart-program">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-300 font-semibold min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="min-w-0">
                  Nouvelle cible du programme enregistrée : {fmtNum(programRecommendation.suggestedTarget)} {programUnitLabel} pour la prochaine séance.
                </span>
              </div>
              <button
                onClick={() => setSmartRefused(true)}
                className="text-[11px] text-zinc-400 hover:text-white font-semibold underline shrink-0"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {perfOptions.length > 0 && !smartAccepted && !smartRefused && activeProgram && programRecommendation && onSaveProgram && (
          <div className="rounded-2xl bg-white/5 border border-violet-500/30 p-4 space-y-3" data-testid="smart-program">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-violet-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">Programme intelligent</h4>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${trendInfo[programRecommendation.trend].cls}`}
                data-testid="smart-trend"
              >
                {trendInfo[programRecommendation.trend].label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs mt-2">
              <div className="rounded-xl bg-black/30 border border-white/10 px-2 py-2">
                <div className="text-[10px] uppercase text-zinc-500 font-semibold">Cible actuelle du programme</div>
                <div className="font-display text-lg font-bold text-white" data-testid="smart-current-target">
                  {fmtNum(programRecommendation.currentTarget)}{' '}
                  <span className="text-[10px] text-zinc-400 font-normal">{programUnitLabel}</span>
                </div>
              </div>
              <div className="rounded-xl bg-black/30 border border-violet-500/30 px-2 py-2">
                <div className="text-[10px] uppercase text-zinc-500 font-semibold">Nouvelle cible proposée</div>
                <div className="font-display text-lg font-bold text-violet-300" data-testid="smart-suggested-target">
                  {fmtNum(programRecommendation.suggestedTarget)}{' '}
                  <span className="text-[10px] text-zinc-400 font-normal">{programUnitLabel}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">{programRecommendation.reason}</p>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSmartAccept}
                className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                data-testid="smart-accept"
                aria-label="Accepter et mettre à jour la cible de cet exercice dans le programme"
              >
                Accepter
              </button>
              <button
                onClick={handleSmartRefuse}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold uppercase tracking-wider transition-all"
                data-testid="smart-refuse"
                aria-label="Refuser la suggestion (rien n'est modifié)"
              >
                Refuser
              </button>
            </div>

            <p className="text-[11px] text-zinc-500">
              Seule la cible ({programTargetFieldLabel}) est mise à jour dans le programme : séries, repos, mode et le reste du programme ne changent pas.
            </p>
          </div>
        )}

        {perfOptions.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 space-y-2" data-testid="perf-history-empty">
            <Activity className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
            <p className="font-semibold text-zinc-300 text-sm">Aucune performance enregistrée.</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Terminez des séances avec des séries validées pour voir ici l'historique et l'évolution de chaque exercice.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {perfHistory.length === 0 ? (
              <div className="text-center py-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-500" data-testid="perf-history-empty">
                Aucune séance de cet exercice.
              </div>
            ) : (
              <div className="space-y-2">
                <ProgressChart entries={perfHistory} />
                {[...perfHistory].reverse().map((entry) => (
                  <PerfRow key={entry.id} entry={entry} delta={perfDeltas.get(entry.sessionId) || null} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
