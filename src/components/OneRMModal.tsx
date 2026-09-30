import React, { useState, useCallback } from 'react';
import { X, Calculator, Dumbbell, RotateCcw, Check, AlertCircle } from 'lucide-react';
import {
  estimateOneRM,
  estimateOneRMEpley,
  estimateOneRMBrzycki,
  calculateWeightFromOneRM,
  roundWeightToIncrement,
  calculatePlatesForWeight,
  formatPlates,
  PERCENTAGE_PRESETS,
  STANDARD_BAR_WEIGHTS_KG,
  STANDARD_PLATES_KG,
  WEIGHT_INCREMENTS_KG,
  type PlateCalculation,
  formatWeight,
} from '../utilsOneRM';

export type OneRMMode = 'estimate' | 'percentage' | 'plates';

interface OneRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: OneRMMode;
  initialWeightKg?: number;
  initialReps?: number;
  initialOneRM?: number;
  initialTargetWeightKg?: number;
  onApplyWeight?: (weightKg: number) => void;
  applyLabel?: string;
}

const MODE_LABELS: Record<OneRMMode, { label: string; icon: React.ReactNode; description: string }> = {
  estimate: {
    label: 'Estimer 1RM',
    icon: <Dumbbell className="w-4 h-4" />,
    description: 'Calculer votre 1RM à partir d\'un poids et de répétitions',
  },
  percentage: {
    label: '% du 1RM',
    icon: <Calculator className="w-4 h-4" />,
    description: 'Calculer une charge de travail à partir de votre 1RM',
  },
  plates: {
    label: 'Charge → Disques',
    icon: <RotateCcw className="w-4 h-4" />,
    description: 'Déterminer les disques à mettre sur la barre',
  },
};

export const OneRMModal: React.FC<OneRMModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  initialWeightKg,
  initialReps,
  initialOneRM,
  initialTargetWeightKg,
  onApplyWeight,
  applyLabel = 'Utiliser cette charge',
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<OneRMMode>(initialMode ?? 'estimate');

  // Mode A: Estimate 1RM
  const [weightKg, setWeightKg] = useState<number>(initialWeightKg ?? 0);
  const [reps, setReps] = useState<number>(initialReps ?? 0);
  const [estimateResult, setEstimateResult] = useState<{
    epley: number;
    brzycki: number;
    conservative: number;
  } | null>(null);

  // Mode B: Percentage of 1RM
  const [oneRM, setOneRM] = useState<number>(initialOneRM ?? 0);
  const [percentage, setPercentage] = useState<number>(80);
  const [percentageResult, setPercentageResult] = useState<number>(0);
  const [roundedPercentageResult, setRoundedPercentageResult] = useState<number>(0);
  const [percentageIncrement, setPercentageIncrement] = useState<number>(2.5);

  // Mode C: Plates calculator
  const [targetWeightKg, setTargetWeightKg] = useState<number>(initialTargetWeightKg ?? 0);
  const [barWeightKg, setBarWeightKg] = useState<number>(20);
  const [platesIncrement, setPlatesIncrement] = useState<number>(2.5);
  const [platesResult, setPlatesResult] = useState<PlateCalculation | null>(null);

  // Recalculate on input changes
  const recalcEstimate = useCallback(() => {
    if (weightKg > 0 && reps > 0) {
      setEstimateResult(estimateOneRM(weightKg, reps));
    } else {
      setEstimateResult(null);
    }
  }, [weightKg, reps]);

  const recalcPercentage = useCallback(() => {
    if (oneRM > 0 && percentage > 0 && percentage <= 100) {
      const raw = calculateWeightFromOneRM(oneRM, percentage);
      const rounded = roundWeightToIncrement(raw, percentageIncrement);
      setPercentageResult(raw);
      setRoundedPercentageResult(rounded);
    } else {
      setPercentageResult(0);
      setRoundedPercentageResult(0);
    }
  }, [oneRM, percentage, percentageIncrement]);

  const recalcPlates = useCallback(() => {
    if (targetWeightKg > 0 && barWeightKg > 0) {
      setPlatesResult(calculatePlatesForWeight(targetWeightKg, barWeightKg, STANDARD_PLATES_KG));
    } else {
      setPlatesResult(null);
    }
  }, [targetWeightKg, barWeightKg]);

  // Recalculate when inputs change
  React.useEffect(recalcEstimate, [recalcEstimate]);
  React.useEffect(recalcPercentage, [recalcPercentage]);
  React.useEffect(recalcPlates, [recalcPlates]);

  const handleApply = () => {
    let weightToApply = 0;
    switch (mode) {
      case 'estimate':
        weightToApply = estimateResult?.conservative ?? 0;
        break;
      case 'percentage':
        weightToApply = roundedPercentageResult;
        break;
      case 'plates':
        weightToApply = platesResult?.totalWeightKg ?? 0;
        break;
    }
    if (weightToApply > 0 && onApplyWeight) {
      onApplyWeight(weightToApply);
    }
  };

  const hasValidApply = () => {
    switch (mode) {
      case 'estimate':
        return estimateResult !== null && estimateResult.conservative > 0;
      case 'percentage':
        return roundedPercentageResult > 0;
      case 'plates':
        return platesResult !== null && platesResult.achievable && platesResult.totalWeightKg > 0;
    }
  };

  const applyDisabled = !hasValidApply();

  return (
    <div
      className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Calculateur 1RM"
    >
      <div
        className="w-full max-w-md sport-card rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">Calculateur 1RM</h2>
              <p className="text-[11px] text-zinc-400">Outil local — ne modifie aucune donnée</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le calculateur"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10" role="tablist">
          {(['estimate', 'percentage', 'plates'] as OneRMMode[]).map((m) => {
            const info = MODE_LABELS[m];
            const isActive = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {info.icon}
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-zinc-500 text-center">{MODE_LABELS[mode].description}</p>

        {/* Mode A: Estimate 1RM */}
        {mode === 'estimate' && (
          <div className="space-y-4" data-testid="orm-mode-estimate">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orm-weight" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Poids utilisé (kg)
                </label>
                <input
                  id="orm-weight"
                  type="number"
                  step={0.5}
                  min={0}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                  placeholder="Ex: 80"
                />
              </div>
              <div>
                <label htmlFor="orm-reps" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Répétitions
                </label>
                <input
                  id="orm-reps"
                  type="number"
                  step={1}
                  min={1}
                  max={50}
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                  placeholder="Ex: 8"
                />
              </div>
            </div>

            {estimateResult && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Epley</div>
                  <div className="font-display text-lg font-bold text-white mt-1">{formatWeight(estimateResult.epley)}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Brzycki</div>
                  <div className="font-display text-lg font-bold text-white mt-1">{formatWeight(estimateResult.brzycki)}</div>
                </div>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <div className="text-[10px] uppercase text-emerald-400 font-semibold">Conservatif (min)</div>
                  <div className="font-display text-lg font-bold text-emerald-300 mt-1">{formatWeight(estimateResult.conservative)}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Recommandé pour la sécurité</div>
                </div>
              </div>
            )}

            {(weightKg > 0 || reps > 0) && !estimateResult && (
              <p className="text-[11px] text-amber-300 text-center">Entrez un poids et des répétitions valides</p>
            )}

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleApply}
                disabled={applyDisabled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  applyDisabled
                    ? 'bg-white/5 text-zinc-500 border border-white/10 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applyLabel}</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                Applique la valeur conservatrice (min Epley/Brzycki) au champ cible
              </p>
            </div>
          </div>
        )}

        {/* Mode B: Percentage of 1RM */}
        {mode === 'percentage' && (
          <div className="space-y-4" data-testid="orm-mode-percentage">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orm-onerm" className="block text-xs font-semibold text-zinc-300 mb-1">
                  1RM estimé (kg)
                </label>
                <input
                  id="orm-onerm"
                  type="number"
                  step={0.5}
                  min={0}
                  value={oneRM}
                  onChange={(e) => setOneRM(Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                  placeholder="Ex: 120"
                />
              </div>
              <div>
                <label htmlFor="orm-percent" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Pourcentage (%)
                </label>
                <input
                  id="orm-percent"
                  type="number"
                  step={1}
                  min={1}
                  max={100}
                  value={percentage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 1 && v <= 100) setPercentage(v);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Percentage Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Pourcentages courants</label>
              <div className="flex flex-wrap gap-2">
                {PERCENTAGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPercentage(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      percentage === p
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {/* Increment selector */}
            <div>
              <label htmlFor="orm-percent-increment" className="block text-xs font-semibold text-zinc-300 mb-1">
                Arrondi de la charge (kg)
              </label>
              <div className="flex gap-2">
                {WEIGHT_INCREMENTS_KG.map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setPercentageIncrement(inc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      percentageIncrement === inc
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {inc % 1 === 0 ? `${inc} kg` : `${inc} kg`}
                  </button>
                ))}
              </div>
            </div>

            {oneRM > 0 && percentage > 0 && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Charge théorique</div>
                  <div className="font-display text-lg font-bold text-white mt-1">{formatWeight(percentageResult)}</div>
                </div>
                <div className="rounded-xl bg-violet-600/10 border border-violet-500/30 p-3">
                  <div className="text-[10px] uppercase text-violet-300 font-semibold">Arrondi ({percentageIncrement} kg)</div>
                  <div className="font-display text-lg font-bold text-violet-300 mt-1">{formatWeight(roundedPercentageResult)}</div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleApply}
                disabled={applyDisabled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  applyDisabled
                    ? 'bg-white/5 text-zinc-500 border border-white/10 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applyLabel}</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                Applique la charge arrondie au champ cible
              </p>
            </div>
          </div>
        )}

        {/* Mode C: Plates Calculator */}
        {mode === 'plates' && (
          <div className="space-y-4" data-testid="orm-mode-plates">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orm-target" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Charge cible (kg)
                </label>
                <input
                  id="orm-target"
                  type="number"
                  step={0.5}
                  min={0}
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                  placeholder="Ex: 100"
                />
              </div>
              <div>
                <label htmlFor="orm-bar" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Poids de la barre (kg)
                </label>
                <select
                  id="orm-bar"
                  value={barWeightKg}
                  onChange={(e) => setBarWeightKg(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-violet-500"
                >
                  {STANDARD_BAR_WEIGHTS_KG.map((w) => (
                    <option key={w} value={w} className="bg-[#0f0f15]">
                      {w} kg
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Increment for rounding target weight */}
            <div>
              <label htmlFor="orm-plates-increment" className="block text-xs font-semibold text-zinc-300 mb-1">
                Arrondi charge cible (kg)
              </label>
              <div className="flex gap-2">
                {WEIGHT_INCREMENTS_KG.map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      setPlatesIncrement(inc);
                      if (targetWeightKg > 0) {
                        const rounded = roundWeightToIncrement(targetWeightKg, inc);
                        setTargetWeightKg(rounded);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      platesIncrement === inc
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {inc % 1 === 0 ? `${inc} kg` : `${inc} kg`}
                  </button>
                ))}
              </div>
            </div>

            {platesResult && (
              <div className={`space-y-3 ${platesResult.achievable ? '' : 'border-amber-500/30 bg-amber-500/10'}`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Barre</div>
                    <div className="font-display text-lg font-bold text-white mt-1">{formatWeight(platesResult.barWeightKg)}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Chaque côté</div>
                    <div className="font-display text-lg font-bold text-white mt-1">{formatWeight(platesResult.perSideKg)}</div>
                  </div>
                  <div className={`rounded-xl p-3 ${
                    platesResult.achievable
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-rose-500/10 border border-rose-500/30'
                  }`}>
                    <div className="text-[10px] uppercase font-semibold">
                      {platesResult.achievable ? 'REALISABLE' : 'IMPOSSIBLE'}
                    </div>
                    <div className="font-display text-lg font-bold mt-1">
                      {platesResult.achievable ? (
                        <span className="text-emerald-300">{formatWeight(platesResult.totalWeightKg)}</span>
                      ) : (
                        <span className="text-rose-300">{formatWeight(platesResult.totalWeightKg)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {platesResult.plates.length > 0 && (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                    <div className="text-xs font-bold text-zinc-400 mb-2">Disques par côté :</div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {platesResult.plates.map((p) => (
                        <div
                          key={p.weightKg}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
                        >
                          <span className="text-xs font-bold text-violet-300">{p.count} ×</span>
                          <span className="text-sm font-bold text-white">{formatWeight(p.weightKg)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-500 text-center mt-2">
                      Total : {formatPlates(platesResult.plates)}
                    </div>
                  </div>
                )}

                {!platesResult.achievable && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Charge non réalisable exactement avec les disques standards.
                      Charge la plus proche : {formatWeight(platesResult.totalWeightKg)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {(targetWeightKg > 0 || barWeightKg > 0) && !platesResult && (
              <p className="text-[11px] text-amber-300 text-center">Entrez une charge cible valide</p>
            )}

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleApply}
                disabled={applyDisabled}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                  applyDisabled
                    ? 'bg-white/5 text-zinc-500 border border-white/10 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applyLabel}</span>
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                Applique la charge réalisable au champ cible
              </p>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-[10px] text-zinc-500 text-center border-t border-white/10 pt-3">
          Formules : Epley (poids × (1 + reps/30)) · Brzycki (poids × 36/(37-reps))
          <br />Aucune donnée n'est sauvegardée —outil d'aide à la décision uniquement.
        </p>
      </div>
    </div>
  );
};