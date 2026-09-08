import React from 'react';
import { Clock, Dumbbell, Flame, Sparkles, X, CheckCircle2, Trophy } from 'lucide-react';
import { WorkoutSession } from '../types';
import {
  buildSessionDetail,
  sessionDetailTitle,
  SessionDetail,
} from '../utilsSessionDetail';

interface SessionDetailModalProps {
  session: WorkoutSession;
  onClose: () => void;
}

// LOT 9 — Item 9.3 : modal lecture seule d'une séance. Reuses the single
// canonical XP formula and a pure buildSessionDetail; nothing is persisted and
// no new storage is introduced. Esc / overlay click close.
export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ session, onClose }) => {
  React.useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, onClose]);

  if (!session) return null;

  const detail: SessionDetail = buildSessionDetail(session);
  const dateLabel = session.date
    ? new Date(`${session.date}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div
      className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Détail de la séance ${sessionDetailTitle(session)}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="session-detail-modal"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto sport-card rounded-3xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                {sessionDetailTitle(session)}
              </h2>
              <div className="text-[11px] text-zinc-400 capitalize">{dateLabel}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {session.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 font-bold">
            <Flame className="w-3.5 h-3.5" />
            {detail.xp} XP
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <Trophy className="w-3.5 h-3.5" />
            {detail.totalVolumeKg.toLocaleString('fr-FR')} kg
          </span>
          {session.feeling && (
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              {session.feeling}
            </span>
          )}
        </div>

        {/* Exercises */}
        <div data-testid="session-detail-exercises">
          <div className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-2">
            {detail.exercises.length} exercice{detail.exercises.length > 1 ? 's' : ''} · {detail.totalCompletedSets} série{detail.totalCompletedSets > 1 ? 's' : ''} validée{detail.totalCompletedSets > 1 ? 's' : ''}
          </div>
          {detail.exercises.length === 0 ? (
            <div className="text-center py-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400">
              Aucun exercice avec des séries validées dans cette séance.
            </div>
          ) : (
            <div className="space-y-2.5">
              {detail.exercises.map((ex, i) => (
                <div key={`${ex.exerciseId}-${i}`} className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-white truncate">{ex.exerciseName}</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {ex.completedSets}/{ex.plannedSets} séries
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.sets.map((s) => (
                      <span
                        key={s.setNumber}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                          s.completed
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-zinc-500 border border-white/10 line-through'
                        }`}
                      >
                        {s.display}
                      </span>
                    ))}
                  </div>
                  {ex.restSec != null && ex.restSec > 0 && (
                    <div className="text-[10px] text-zinc-500">
                      Repos entre séries : {ex.restSec} s
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stretches */}
        <div className="rounded-2xl bg-sky-950/20 border border-sky-500/30 p-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-sky-200">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Retour au calme & étirements
          </span>
          {detail.stretchesCompleted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {detail.stretchesCount} réalisé{detail.stretchesCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400">Non réalisé</span>
          )}
        </div>

        {/* Notes */}
        {session.notes && (
          <p className="text-xs text-zinc-300 bg-white/5 p-3 rounded-2xl border border-white/10 italic">
            "{session.notes}"
          </p>
        )}

        {/* Footer (no invented data) */}
      </div>
    </div>
  );
};
