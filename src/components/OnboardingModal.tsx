import React, { useMemo, useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Check, Zap } from 'lucide-react';
import { buildOnboardingSteps, OnboardingGoal, OnboardingMode } from '../utilsOnboarding';

interface OnboardingModalProps {
  onFinish: (goal: OnboardingGoal, mode: OnboardingMode) => void;
  onSkip: () => void;
}

// LOT 9 — Item 9.1 : welcome flow. Read-only over user data (writes nothing to
// IndexedDB, stores only the two lightweight preferences + the done flag in
// localStorage). Fully skippable; both steps are required to "start".
export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onFinish, onSkip }) => {
  const steps = useMemo(() => buildOnboardingSteps(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [mode, setMode] = useState<OnboardingMode | null>(null);

  const step = steps[stepIndex];

  const handleSelect = (id: string) => {
    if (stepIndex === 0) {
      setGoal(id as OnboardingGoal);
    } else {
      setMode(id as OnboardingMode);
    }
  };

  const nextStep = () => {
    if (stepIndex === 0 && goal) setStepIndex(1);
  };

  const prevStep = () => {
    if (stepIndex === 1) setStepIndex(0);
  };

  const canContinue = stepIndex === 0 ? !!goal : !!mode;

  return (
    <div
      className="fixed inset-0 z-[99] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur SportTrack"
      data-testid="onboarding-modal"
    >
      <div className="w-full max-w-md sport-card rounded-3xl p-6 sm:p-7 space-y-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="font-display text-xl font-bold uppercase tracking-wider text-white">
              Bienvenue sur SportTrack
            </div>
            <div className="text-[11px] text-zinc-400">Deux petites questions pour adapter vos recommandations.</div>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-all ${i <= stepIndex ? 'bg-violet-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-300">
            <Sparkles className="w-3.5 h-3.5" /> {stepIndex === 0 ? 'Objectif principal' : 'Style de pratique'}
          </div>
          <h2 className="font-display text-xl font-bold text-white">{step.title}</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 gap-2">
          {step.choices.map((c) => {
            const selected = stepIndex === 0 ? goal === c.id : mode === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                data-testid={`onboarding-${step.id}-${c.id}`}
                aria-pressed={selected}
                className={`text-left w-full flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                  selected
                    ? 'bg-violet-600/20 border-violet-500/60'
                    : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{c.label}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{c.description}</div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    selected ? 'bg-violet-500 border-violet-400' : 'border-white/20'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onSkip}
            data-testid="onboarding-skip"
            className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all"
          >
            Passer pour l'instant
          </button>
          <div className="flex items-center gap-2">
            {stepIndex === 1 && (
              <button
                onClick={prevStep}
                data-testid="onboarding-back"
                aria-label="Revenir à l'étape précédente"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {stepIndex === 0 ? (
              <button
                onClick={nextStep}
                disabled={!canContinue}
                data-testid="onboarding-continue"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => goal && mode && onFinish(goal, mode)}
                disabled={!canContinue}
                data-testid="onboarding-start"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Zap className="w-3.5 h-3.5" /> Commencer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};