import React, { useMemo, useState } from 'react';
import {
  Goal,
  BodyMeasurement,
  WorkoutSession,
  UserProfile,
  PersonalRecord,
  ExercisePerformance,
  ExerciseBest,
  GoalMetric,
  GoalDirection,
} from '../types';
import {
  goalProgress,
  GoalStatus,
  goalReachedFor,
  GOAL_METRICS,
  goalMetricFromCategory,
  goalMetricLabel,
  goalUnitSuffix,
  goalValueText,
  computeGoalCurrentValue,
  buildGoalHistory,
  goalCurrentDataDate,
  validateGoalForm,
  GoalContext,
  buildBlockBar,
} from '../utilsGoals';
import {
  Target,
  Plus,
  CheckCircle2,
  Trophy,
  Flame,
  Scale,
  Calendar,
  Check,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Repeat,
  Clock,
  CalendarDays,
  Zap,
  Layers,
  Activity,
} from 'lucide-react';

interface GoalsPageProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  measurements: BodyMeasurement[];
  // LOT F: real SportTrack data used to derive smart-goal current values.
  sessions: WorkoutSession[];
  profile: UserProfile;
  records: PersonalRecord[];
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
}

const todayStr = () => new Date().toISOString().split('T')[0];

const statusStyle: Record<GoalStatus, string> = {
  Actif: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  Atteint: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Expiré: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
};

// Icons + colors per goal metric (used in the card header).
const metricIcon: Record<GoalMetric, React.ReactNode> = {
  reps: <Repeat className="w-4 h-4 text-emerald-400" />,
  duration: <Clock className="w-4 h-4 text-sky-400" />,
  sessions: <CalendarDays className="w-4 h-4 text-violet-400" />,
  xp: <Zap className="w-4 h-4 text-amber-400" />,
  streak: <Flame className="w-4 h-4 text-amber-400" />,
  record: <Trophy className="w-4 h-4 text-violet-400" />,
  weight: <Scale className="w-4 h-4 text-indigo-400" />,
  frequency: <Calendar className="w-4 h-4 text-amber-400" />,
  custom: <Sparkles className="w-4 h-4 text-pink-400" />,
};

// Filter chips.
type StatusFilter = 'all' | 'Actif' | 'Atteint' | 'Expiré';

const GOAL_FILTER_METRICS: (GoalMetric | 'all')[] = [
  'all',
  'reps',
  'duration',
  'sessions',
  'xp',
  'streak',
  'record',
  'weight',
  'custom',
];

export const GoalsPage: React.FC<GoalsPageProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  measurements,
  sessions,
  profile,
  records,
  exercisePerformances,
  exerciseBests,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<GoalMetric>('reps');
  const [category, setCategory] = useState<'frequency' | 'record' | 'weight' | 'custom'>('record');
  const [direction, setDirection] = useState<GoalDirection>('gain');
  const [targetValue, setTargetValue] = useState(100);
  const [initialValue, setInitialValue] = useState(80);
  const [currentValue, setCurrentValue] = useState(80);
  const [unit, setUnit] = useState('kg');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [metricFilter, setMetricFilter] = useState<GoalMetric | 'all'>('all');

  const goalContext = useMemo(
    () => ({ sessions, profile, records, exercisePerformances, exerciseBests, measurements }),
    [sessions, profile, records, exercisePerformances, exerciseBests, measurements]
  );

  // Exercise options for reps/duration/record smart goals.
  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of exercisePerformances) {
      if (p.exerciseId && !map.has(p.exerciseId)) map.set(p.exerciseId, p.exerciseName || p.exerciseId);
    }
    for (const b of exerciseBests) {
      if (b.exerciseId && !map.has(b.exerciseId)) map.set(b.exerciseId, b.exerciseName || b.exerciseId);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [exercisePerformances, exerciseBests]);

  // Weight measurements (legacy prefill).
  const weightMeasurements = useMemo(
    () =>
      measurements
        .filter((m) => typeof m.weightKg === 'number' && isFinite(m.weightKg) && m.weightKg > 0)
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [measurements]
  );

  // When the selected metric changes, adapt category/unit/direction defaults.
  const applyMetric = (m: GoalMetric) => {
    setMetric(m);
    setFormErrors([]);
    switch (m) {
      case 'reps':
        setCategory('record');
        setUnit('reps');
        setDirection('gain');
        setInitialValue(10);
        setTargetValue(20);
        setCurrentValue(10);
        break;
      case 'duration':
        setCategory('record');
        setUnit('sec');
        setDirection('gain');
        setInitialValue(30);
        setTargetValue(60);
        setCurrentValue(30);
        break;
      case 'sessions':
        setCategory('frequency');
        setUnit('séances');
        setDirection('gain');
        setInitialValue(0);
        setTargetValue(12);
        setCurrentValue(0);
        break;
      case 'xp':
        setCategory('custom');
        setUnit('XP');
        setDirection('gain');
        setInitialValue(0);
        setTargetValue(2000);
        setCurrentValue(0);
        break;
      case 'streak':
        setCategory('frequency');
        setUnit('jours');
        setDirection('gain');
        setInitialValue(0);
        setTargetValue(30);
        setCurrentValue(0);
        break;
      case 'record':
        setCategory('record');
        setUnit('records');
        setDirection('gain');
        setInitialValue(0);
        setTargetValue(5);
        setCurrentValue(0);
        break;
      case 'weight':
        setCategory('weight');
        setUnit('kg');
        setDirection('perte');
        const latest = weightMeasurements[weightMeasurements.length - 1];
        const first = weightMeasurements[0];
        if (latest) {
          const v = latest.weightKg;
          setCurrentValue(v);
          setInitialValue(v);
          setTargetValue(Math.round(v * 0.9 * 10) / 10);
        } else {
          setInitialValue(80);
          setCurrentValue(80);
          setTargetValue(75);
        }
        if (first) setInitialValue(first.weightKg);
        break;
      default:
        // custom / frequency
        setCategory(m === 'frequency' ? 'frequency' : 'custom');
        setUnit(m === 'frequency' ? 'séances/sem' : '');
        setDirection('gain');
        setInitialValue(0);
        setTargetValue(10);
        setCurrentValue(0);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(targetValue);
    const c = Number(currentValue);
    const ini = Number(initialValue);

    const errors = validateGoalForm({
      title,
      initialValue: Number.isFinite(ini) ? ini : null,
      targetValue: t,
      direction,
      deadline,
    });
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const effectiveInitial = !Number.isFinite(ini) || ini === 0 ? c : ini;

    const metricIsAuto = metric !== 'custom' && metric !== 'frequency';
    const ticket: Goal = {
      id: `goal-${Date.now()}`,
      title: title.trim(),
      category,
      goalMetric: metric,
      direction,
      initialValue: effectiveInitial,
      targetValue: isFinite(t) ? t : 0,
      currentValue: 0,
      unit: unit.trim() || goalUnitSuffix(metric),
      deadline: deadline || undefined,
      description: description.trim() || undefined,
      exerciseId: (metric === 'reps' || metric === 'duration' || metric === 'record') && exerciseId ? exerciseId : undefined,
      exerciseName: exerciseId ? exerciseOptions.find(([id]) => id === exerciseId)?.[1] : undefined,
      completed: false,
      createdAt: todayStr(),
    };
    const smartCurrent = metricIsAuto ? computeGoalCurrentValue(ticket, goalContext) : null;
    const finalCurrent = metricIsAuto ? (smartCurrent ?? c) : c;

    const newGoal: Goal = {
      ...ticket,
      currentValue: finalCurrent,
      completed: goalReachedFor(direction, isFinite(t) ? t : 0, finalCurrent),
    };

    onAddGoal(newGoal);
    setShowAddForm(false);
    setTitle('');
    setDescription('');
    setFormErrors([]);
  };

  const handleIncrement = (goal: Goal, step: number) => {
    const nextVal = Math.max(0, (goal.currentValue || 0) + step);
    const dir = goal.direction === 'perte' ? 'perte' : 'gain';
    onUpdateGoal({
      ...goal,
      currentValue: nextVal,
      completed: goalReachedFor(dir, goal.targetValue, nextVal),
    });
  };

  const handleToggleComplete = (goal: Goal) => {
    onUpdateGoal({ ...goal, completed: !goal.completed });
  };

  // Filtered goals.
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const m = g.goalMetric || goalMetricFromCategory(g.category);
      if (metricFilter !== 'all' && m !== metricFilter) return false;
      const pg = goalProgress(goalWithCurrent(g, goalContext), todayStr());
      const effective: GoalStatus = g.completed && pg.status !== 'Atteint' ? 'Atteint' : pg.status;
      if (statusFilter !== 'all' && effective !== statusFilter) return false;
      return true;
    });
  }, [goals, metricFilter, statusFilter, goalContext]);

  const statusCounts = useMemo(() => {
    const c = { Actif: 0, Atteint: 0, Expiré: 0 };
    for (const g of goals) {
      const pg = goalProgress(goalWithCurrent(g, goalContext), todayStr());
      const effective: GoalStatus = g.completed && pg.status !== 'Atteint' ? 'Atteint' : pg.status;
      c[effective]++;
    }
    return c;
  }, [goals, goalContext]);

  return (
    <div id="page-goals" data-testid="goals-page" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
              Objectifs & Défis
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Suivez vos cibles de répétitions, durée, séances, XP, séries ou records — reliées à vos vraies données.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="goal-create"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Fermer' : 'Nouvel Objectif'}</span>
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          data-testid="goal-form"
          className="sport-card-active rounded-3xl p-6 sm:p-7 space-y-4 animate-in fade-in"
        >
          <h2 className="text-base font-bold text-violet-300">Nouvel objectif</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-form-name" className="block text-xs font-semibold text-zinc-300 mb-1">
                Intitulé de l'objectif *
              </label>
              <input
                id="goal-form-name"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Atteindre 60 répétitions"
                data-testid="goal-form-name"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label htmlFor="goal-form-category" className="block text-xs font-semibold text-zinc-300 mb-1">
                Type d'objectif
              </label>
              <select
                id="goal-form-category"
                value={metric}
                onChange={(e) => applyMetric(e.target.value as GoalMetric)}
                data-testid="goal-form-category"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {GOAL_METRICS.map((m) => (
                  <option key={m.metric} value={m.metric} className="bg-[#0f0f15]">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(metric === 'reps' || metric === 'duration' || metric === 'record') && (
            <div>
              <label htmlFor="goal-form-exercise" className="block text-xs font-semibold text-zinc-300 mb-1">
                Exercice suivi
              </label>
              <select
                id="goal-form-exercise"
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                data-testid="goal-form-exercise"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">Tous les exercices</option>
                {exerciseOptions.map(([id, name]) => (
                  <option key={id} value={id} className="bg-[#0f0f15]">
                    {name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">
                La valeur actuelle est calculée à partir de votre meilleure performance réelle. Aucune conversion reps ↔ durée.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="goal-direction-loss"
                  data-testid="goal-form-direction-perte"
                  onClick={() => setDirection('perte')}
                  aria-pressed={direction === 'perte'}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                    direction === 'perte'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Perte
                </button>
                <button
                  type="button"
                  id="goal-direction-gain"
                  data-testid="goal-form-direction-gain"
                  onClick={() => setDirection('gain')}
                  aria-pressed={direction === 'gain'}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                    direction === 'gain'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Gain
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="goal-form-initial" className="block text-xs font-semibold text-zinc-300 mb-1">Départ</label>
                <input
                  id="goal-form-initial"
                  type="number"
                  step={0.5}
                  value={initialValue}
                  onChange={(e) => setInitialValue(Number(e.target.value))}
                  data-testid="goal-form-initial"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
                />
              </div>
              {(metric === 'custom' || metric === 'frequency') ? (
                <div>
                  <label htmlFor="goal-form-current" className="block text-xs font-semibold text-zinc-300 mb-1">Actuelle</label>
                  <input
                    id="goal-form-current"
                    type="number"
                    step={0.5}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    data-testid="goal-form-current"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-center">
                  <div className="text-[10px] font-semibold text-zinc-400">Actuelle</div>
                  <div className="text-sm font-bold text-emerald-300" data-testid="goal-form-auto-current">
                    auto
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="goal-form-target" className="block text-xs font-semibold text-zinc-300 mb-1">Cible</label>
                <input
                  id="goal-form-target"
                  type="number"
                  step={0.5}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  data-testid="goal-form-target"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white text-center"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-form-deadline" className="block text-xs font-semibold text-zinc-300 mb-1">
                Date limite (optionnel)
              </label>
              <input
                id="goal-form-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                data-testid="goal-form-deadline"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="goal-form-desc" className="block text-xs font-semibold text-zinc-300 mb-1">
                Description (optionnel)
              </label>
              <input
                id="goal-form-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="goal-form-description"
                placeholder="Ex: Tenir 45 s de planche"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white"
              />
            </div>
          </div>

          {formErrors.length > 0 && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 space-y-1" data-testid="goal-form-errors">
              {formErrors.map((m, i) => (
                <p key={i} className="text-xs text-rose-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 shrink-0" /> {m}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              id="btn-create-goal"
              type="submit"
              data-testid="goal-form-submit"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl transition-all shadow-md"
            >
              Créer l'objectif
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      {goals.length > 0 && (
        <div className="space-y-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap bg-white/5 border border-white/10 p-1.5 rounded-2xl w-fit" role="group" aria-label="Filtrer par état">
            {([
              ['all', `Tous (${goals.length})`],
              ['Actif', `Actifs (${statusCounts.Actif})`],
              ['Atteint', `Atteints (${statusCounts.Atteint})`],
              ['Expiré', `Expirés (${statusCounts.Expiré})`],
            ] as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                aria-pressed={statusFilter === key}
                data-testid={`goal-status-filter-${key}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === key ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap bg-white/5 border border-white/10 p-1.5 rounded-2xl w-fit" role="group" aria-label="Filtrer par catégorie">
            {GOAL_FILTER_METRICS.map((m) => (
              <button
                key={m}
                onClick={() => setMetricFilter(m)}
                aria-pressed={metricFilter === m}
                data-testid={`goal-category-filter-${m}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  metricFilter === m ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'all' ? 'Tous' : goalMetricLabel(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="sport-card rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-xl font-bold text-white uppercase">Aucun objectif défini</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Fixez-vous des objectifs de répétitions, durée, séances, XP, série (streak) ou records, reliés à vos vraies données.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Créer mon premier objectif</span>
          </button>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="sport-card rounded-3xl p-8 text-center text-sm text-zinc-400" data-testid="goal-card-empty">
          Aucun objectif ne correspond à ce filtre.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((g) => {
            const metric = g.goalMetric || goalMetricFromCategory(g.category);
            // Smart goals: compute current value from real data.
            const withCurrent = goalWithCurrent(g, goalContext);
            const pg = goalProgress(withCurrent, todayStr());
            const effectiveStatus: GoalStatus = g.completed && pg.status !== 'Atteint' ? 'Atteint' : pg.status;
            const percent = effectiveStatus === 'Atteint' ? 100 : pg.percent;
            const currentVal = withCurrent.currentValue;
            const isManual = metric === 'custom' || metric === 'frequency';
            const history = buildGoalHistory(g, goalContext);
            const lastDataDate = goalCurrentDataDate(g, goalContext);
            const currentText = goalValueText(metric, currentVal);
            const targetText = goalValueText(metric, g.targetValue);

            return (
              <div
                key={g.id}
                data-testid="goal-card"
                className={`rounded-3xl p-6 border flex flex-col justify-between gap-4 transition-all backdrop-blur-xl ${
                  effectiveStatus === 'Atteint'
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        {metricIcon[metric]}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">{g.title}</h3>
                        <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wide">
                          {goalMetricLabel(metric)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        data-testid="goal-card-status"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${statusStyle[effectiveStatus]}`}
                      >
                        {effectiveStatus === 'Actif' && <CheckCircle2 className="w-3 h-3" />}
                        {effectiveStatus === 'Atteint' && <Trophy className="w-3 h-3" />}
                        {effectiveStatus === 'Expiré' && <Calendar className="w-3 h-3" />}
                        {effectiveStatus}
                      </span>
                      <button
                        onClick={() => handleToggleComplete(g)}
                        className={`p-2 rounded-xl border transition-all ${
                          effectiveStatus === 'Atteint'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                        title={effectiveStatus === 'Atteint' ? 'Marquer comme non terminé' : 'Marquer comme atteint'}
                        aria-pressed={effectiveStatus === 'Atteint'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {g.description && (
                    <p className="text-xs text-zinc-400" data-testid="goal-card-description">{g.description}</p>
                  )}

                  {/* Current / Target values */}
                  <div className="flex items-end justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Valeur actuelle</div>
                      <div className="font-display text-2xl font-bold text-white leading-none" data-testid="goal-card-current">
                        {currentText}
                      </div>
                      {lastDataDate && (
                        <div className="text-[10px] text-zinc-500 mt-0.5" data-testid="goal-card-current-date">
                          dernière mesure : {new Date(lastDataDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Cible</div>
                      <div className="font-display text-2xl font-bold text-violet-300 leading-none" data-testid="goal-card-target">
                        {targetText}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">départ : {goalValueText(metric, g.initialValue ?? currentVal)}</div>
                    </div>
                  </div>

                  {/* Progress Visual */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-400">Progression</span>
                      <span
                        data-testid="goal-card-progress"
                        className={effectiveStatus === 'Atteint' ? 'text-emerald-400 font-bold' : 'text-violet-300'}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          effectiveStatus === 'Atteint'
                            ? 'bg-emerald-500'
                            : effectiveStatus === 'Expiré'
                              ? 'bg-amber-500/70'
                              : 'bg-gradient-to-r from-violet-600 to-indigo-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 pt-0.5"
                      data-testid="goal-card-blocks"
                    >
                      <span className="text-white font-semibold">
                        {compactNumber(currentVal)} / {compactNumber(g.targetValue)}
                      </span>
                      <span className="text-zinc-500">{goalUnitSuffix(metric)}</span>
                      <span className={effectiveStatus === 'Atteint' ? 'text-emerald-400' : 'text-violet-400'}>
                        {buildBlockBar(percent)}
                      </span>
                      <span className={`font-bold ${effectiveStatus === 'Atteint' ? 'text-emerald-400' : 'text-violet-300'}`}>
                        {percent}%
                      </span>
                    </div>
                  </div>

                  {/* Remaining */}
                  {(effectiveStatus === 'Actif') && pg.remaining !== null && (
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                      <Target className="w-3.5 h-3.5 text-violet-400" />
                      <span data-testid="goal-card-remaining">
                        Encore {goalValueText(metric, pg.remaining)} {pg.direction === 'perte' ? 'à perdre' : 'pour atteindre la cible'}
                      </span>
                    </div>
                  )}

                  {effectiveStatus === 'Atteint' && (
                    <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 pt-1" data-testid="goal-card-achieved">
                      <Trophy className="w-3.5 h-3.5" /> Objectif atteint
                    </div>
                  )}

                  {g.deadline && (
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      <span className={effectiveStatus === 'Expiré' ? 'text-amber-300' : ''}>
                        Cible avant le {new Date(g.deadline).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}

                  {/* History */}
                  {history.length > 0 && (
                    <div className="space-y-1 pt-1" data-testid="goal-card-history">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-violet-400" /> Historique
                      </div>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                        {history.slice().reverse().map((h, i, arr) => {
                          const isLast = i === 0; // reversed → first is most recent
                          const delta = i < arr.length - 1 ? h.value - arr[i + 1].value : null;
                          return (
                            <div
                              key={`${h.date}-${h.value}-${i}`}
                              data-testid="goal-card-history-row"
                              className={`flex items-center justify-between text-xs ${
                                isLast ? 'text-white font-bold' : 'text-zinc-400'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                {isLast && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                {new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                {delta != null && delta !== 0 && (
                                  <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {delta > 0 ? '+' : ''}{delta > 0 ? Math.round(delta) === delta ? delta : delta.toFixed(1) : Math.round(delta) === delta ? delta : delta.toFixed(1)}
                                  </span>
                                )}
                                {goalValueText(metric, h.value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1.5">
                    {isManual ? (
                      <>
                        <button
                          onClick={() => handleIncrement(g, -1)}
                          className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleIncrement(g, 1)}
                          className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleIncrement(g, 2.5)}
                          className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-violet-300 hover:text-white transition-colors"
                        >
                          +2.5
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-zinc-500 px-1">
                        Valeur suivie automatiquement
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="text-xs text-zinc-500 hover:text-rose-400 transition-colors font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Clones a goal with its currentValue resolved to real data for smart metrics,
// so the existing goalProgress logic can be reused unchanged.
function goalWithCurrent(g: Goal, ctx: GoalContext): Goal {
  const metric = g.goalMetric || goalMetricFromCategory(g.category);
  if (metric === 'custom' || metric === 'frequency') return g;
  const real = computeGoalCurrentValue(g, ctx);
  if (real === null) return g;
  return { ...g, currentValue: real };
}

// Compact unit-less number for the "current / target" visual ("45 / 60"),
// never NaN / Infinity. Duration stays in seconds (its internal unit).
function compactNumber(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return Math.round(v) === v ? String(v) : v.toFixed(1);
}
