import React, { useState } from 'react';
import { WorkoutSession, WorkoutProgram, WorkoutProgramDay, PersonalRecord } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  CheckCircle2,
  Play,
  Sparkles,
  Layers,
  Moon,
  Trophy,
} from 'lucide-react';
import { computeSessionXp } from '../utilsXp';
import { dayOfWeekName, isRestDay, programPlansDay, computeMonthSummary, toLocalDateKey } from '../utilsCalendar';
import { SessionDetailModal } from '../components/SessionDetailModal';

interface CalendarPageProps {
  sessions: WorkoutSession[];
  activeProgram?: WorkoutProgram;
  records?: PersonalRecord[];
  onStartSession: (programDayId?: string) => void;
  onStartSessionWithDay?: (day: WorkoutProgramDay, program: WorkoutProgram) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  sessions,
  activeProgram,
  records,
  onStartSession,
  onStartSessionWithDay,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    toLocalDateKey(new Date())
  );
  // LOT 9 — 9.3: the session currently shown in the read-only detail modal.
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    const localKey = toLocalDateKey(now);
    setCurrentMonthDate(now);
    setSelectedDateStr(localKey);
  };

  // Days in month calculation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust Monday = 0
  const startDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: startDay }, (_, i) => i);

  // Sessions map by YYYY-MM-DD
  const sessionsByDate: Record<string, WorkoutSession[]> = {};
  sessions.forEach((s) => {
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  });

  const selectedSessions = sessionsByDate[selectedDateStr] || [];

  // Determine planned workout for the selected date
  const selectedDayOfWeekName = dayOfWeekName(selectedDateStr);
  const plannedDay = activeProgram?.days.find(
    (d) => d.dayOfWeek === selectedDayOfWeekName
  );

  // LOT III: plan-based rest days (a day with a really completed session is
  // never a rest day, even if no workout was planned).
  const completedDateKeys = Object.keys(sessionsByDate);
  const hasProgramDays = !!(activeProgram?.days?.length);

  // LOT III: monthly summary for the displayed month (pure helper, real data).
  const monthSummary = computeMonthSummary(year, month, sessions, activeProgram);

  // LOT III: personal records achieved on the selected date.
  const dayRecords = (records || []).filter((r) => r.date === selectedDateStr);
  const hasDayRecords = dayRecords.length > 0;

  return (
    <div id="page-calendar" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
              Planning & Calendrier
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Distinction claire entre vos séances <strong className="text-violet-300">programmées</strong> et vos séances <strong className="text-emerald-400">réellement terminées</strong>.
          </p>
        </div>

        <button
          id="btn-calendar-new-session"
          onClick={() => onStartSession(plannedDay?.id)}
          className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Nouvelle séance</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Month Calendar Grid (7 Cols) */}
        <div className="lg:col-span-7 sport-card rounded-3xl p-5 space-y-4">
          {/* Month Navigator */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold uppercase text-white capitalize">
              {monthName}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={goToToday}
                className="p-2 px-3 rounded-xl bg-violet-600/80 text-white hover:bg-violet-500 border border-violet-500/40 transition-colors text-xs font-bold uppercase tracking-wider"
                aria-label="Revenir au mois courant"
                data-testid="btn-calendar-today"
              >
                Aujourd'hui
              </button>
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-white/5 text-zinc-300 hover:text-white border border-white/10 hover:bg-white/10 transition-colors"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-white/5 text-zinc-300 hover:text-white border border-white/10 hover:bg-white/10 transition-colors"
                aria-label="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {blanksArray.map((_, i) => (
              <div key={`blank-${i}`} className="h-16 rounded-2xl bg-white/[0.02]" />
            ))}

            {daysArray.map((dayNum) => {
              const currentIsoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasCompletedWorkouts = Boolean(sessionsByDate[currentIsoDate]?.length);
              const isSelected = selectedDateStr === currentIsoDate;
              const isToday = toLocalDateKey(new Date()) === currentIsoDate;

              const cellDayName = dayOfWeekName(currentIsoDate);
              const hasPlanned = Boolean(activeProgram?.days.some((d) => d.dayOfWeek === cellDayName));

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(currentIsoDate)}
                  className={`h-16 rounded-2xl p-2 flex flex-col justify-between text-left transition-all relative border ${
                    isSelected
                      ? 'bg-violet-950/80 border-violet-400 shadow-lg shadow-violet-950/50 text-white'
                      : hasCompletedWorkouts
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/50'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center -ml-0.5 -mt-0.5'
                          : ''
                      }`}
                    >
                      {dayNum}
                    </span>
                    {hasCompletedWorkouts && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                    )}
                    {!hasCompletedWorkouts && hasPlanned && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" title="Séance programmée" />
                    )}
                  </div>

                  {hasCompletedWorkouts ? (
                    <div className="text-[9px] font-bold text-emerald-300 truncate flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      <span>{sessionsByDate[currentIsoDate].length} terminée</span>
                    </div>
                  ) : hasPlanned ? (
                    <div className="text-[9px] font-medium text-violet-300/80 truncate">
                      Prévue
                    </div>
                  ) : isRestDay(currentIsoDate, activeProgram, completedDateKeys) ? (
                    <div className="text-[9px] font-medium text-zinc-600 truncate">Repos</div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Calendar legend */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Séance terminée (validée)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400/60" />
              <span>Séance programmée (planifiée)</span>
            </div>
            {hasProgramDays && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/10 border border-white/20" />
                <span>Jour de repos (aucune séance prévue)</span>
              </div>
            )}
          </div>

          {/* LOT III: monthly summary (real data of the displayed month only) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2" data-testid="calendar-summary">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Terminées
              </div>
              <div className="font-display text-xl font-bold text-emerald-300" data-testid="cal-sum-completed">
                {monthSummary.completed}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-violet-400" /> Programmées
              </div>
              <div className="font-display text-xl font-bold text-violet-300" data-testid="cal-sum-planned">
                {monthSummary.planned}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <Moon className="w-3 h-3 text-zinc-400" /> Jours de repos
              </div>
              <div className="font-display text-xl font-bold text-zinc-300" data-testid="cal-sum-rest">
                {monthSummary.restDays}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-amber-400" /> Volume
              </div>
              <div className="font-display text-xl font-bold text-amber-300" data-testid="cal-sum-volume">
                {monthSummary.volumeKg.toLocaleString('fr-FR')} <span className="text-[10px] text-zinc-400 font-normal">kg</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Durée
              </div>
              <div className="font-display text-xl font-bold text-sky-300" data-testid="cal-sum-duration">
                {monthSummary.durationMinutes} <span className="text-[10px] text-zinc-400 font-normal">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date Workout Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Header of selected day */}
          <div className="sport-card rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] text-violet-400 uppercase font-bold tracking-wider">
                  Détails de la date
                </span>
                <h3 className="font-display text-2xl font-bold uppercase text-white capitalize">
                  {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  selectedSessions.length > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/5 text-zinc-400 border-white/10'
                }`}
              >
                {selectedSessions.length > 0
                  ? `${selectedSessions.length} effectuée(s)`
                  : '0 effectuée'}
              </span>
            </div>

            {/* 1. Planned Workout Section */}
            {plannedDay ? (
              <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      <CalendarIcon className="w-3 h-3" />
                      PROGRAMMÉ (Planifié)
                    </span>
                    <h4 className="font-bold text-base text-white">{plannedDay.name}</h4>
                  </div>
                  <button
                    onClick={() => {
                      if (onStartSessionWithDay && activeProgram) {
                        onStartSessionWithDay(plannedDay, activeProgram);
                      } else {
                        onStartSession(plannedDay.id);
                      }
                    }}
                    className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-xl transition-all shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Lancer</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {plannedDay.muscleGroups.map((mg) => (
                    <span
                      key={mg}
                      className="text-[10px] font-semibold bg-white/5 text-zinc-300 px-2 py-0.5 rounded-md border border-white/10"
                    >
                      {mg}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-zinc-400">
                  {plannedDay.exerciseIds.length} exercices prévus
                  {plannedDay.stretches && plannedDay.stretches.length > 0 && (
                    <span> • {plannedDay.stretches.length} étirements de fin</span>
                  )}
                </div>
              </div>
            ) : selectedSessions.length === 0 && isRestDay(selectedDateStr, activeProgram, completedDateKeys) ? (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400 flex items-center gap-2">
                <Moon className="w-4 h-4 text-zinc-500 shrink-0" />
                Jour de repos — aucune séance n'est programmée ce jour par votre programme.
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400">
                Aucune séance programmée dans votre planning pour ce jour.
              </div>
            )}

            {/* 2. Completed Sessions Section */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Séances Réalisées (Terminées)
              </span>

              {selectedSessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setDetailSession(s)}
                      data-testid="calendar-session-card"
                      className="w-full text-left bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-3 hover:border-emerald-400/60 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              TERMINÉ
                            </span>
                            <h4 className="font-bold text-base text-white">{s.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{s.durationMinutes} minutes</span>
                            <span>• {computeSessionXp(s.exercises?.length || 0, s.stretchesCount || 0)} XP</span>
                            {s.feeling && <span>• {s.feeling}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl font-bold text-emerald-300">
                            {s.totalVolumeKg.toLocaleString('fr-FR')}{' '}
                            <span className="text-xs text-zinc-400 font-normal">kg</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                            Volume réel
                          </span>
                        </div>
                      </div>

                      {/* Exercises list in session */}
                      <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                        {s.exercises.map((ex, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs text-zinc-300"
                          >
                            <span className="flex items-center gap-1.5">
                              <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                              {ex.exerciseName}
                            </span>
                            <span className="text-zinc-400 font-mono text-[11px]">
                              {ex.sets.length} séries
                            </span>
                          </div>
                        ))}
                      </div>

                      {s.notes && (
                        <p className="text-xs text-zinc-300 bg-white/5 p-2 rounded-xl border border-white/10 italic">
                          "{s.notes}"
                        </p>
                      )}

                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/70">
                        <Play className="w-3 h-3" /> Détail de la séance
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <p className="text-xs text-zinc-400">
                    Aucune séance terminée enregistrée pour cette date.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Une séance programmée n'est ajoutée à votre historique que lorsque vous la terminez réellement.
                  </p>
                </div>
              )}
            </div>

            {/* LOT III: records achieved on the selected date */}
            {hasDayRecords && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Records personnels ce jour
                </span>
                <div className="space-y-1.5">
                  {dayRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs text-zinc-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <Dumbbell className="w-3 h-3 text-amber-400" />
                        {r.exerciseName}
                      </span>
                      <span className="font-mono text-[11px] text-amber-300">
                        {r.weightKg} kg × {r.reps || 0} reps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          onClose={() => setDetailSession(null)}
        />
      )}
    </div>
  );
};

