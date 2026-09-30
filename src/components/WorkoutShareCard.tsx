// LOT E.4 — Composant de carte de partage de séance
import React from 'react';
import { X, Calculator, Dumbbell, Clock, Medal, Flame, Sparkles, Target } from 'lucide-react';
import { computeAverageRPE, computeRPEStats } from '../utilsStats';
import type { WorkoutSession, WorkoutSet, ExercisePerformance } from '../types';

export interface WorkoutShareCardProps {
  session: WorkoutSession;
  showRPE?: boolean;
  showXP?: boolean;
  showRecords?: boolean;
}

const WORKOUT_CARD_WIDTH = 350;
const WORKOUT_CARD_HEIGHT = 500;
const MARGIN = 40;
const LINE_HEIGHT = 22;

export const WorkoutShareCard: React.FC<WorkoutShareCardProps> = ({
  session,
  showRPE = true,
  showXP = true,
  showRecords = true,
}) => {
  const totalSets = session.exercises.reduce((acc, log) => acc + log.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (acc, log) =>
      acc + log.sets.filter((s) => s.completed).length,
    0
  );
  const volume = session.totalVolumeKg;
  const durationMinutes = session.durationMinutes;
  const exercisesCount = session.exercises.length;
  const date = new Date(session.date);
  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  // Calculs optionnels
  const rpeStats = showRPE ? computeRPEStats(session.exercises.flatMap((log) => log.sets)) : null;
  const averageRPE = showRPE && rpeStats ? rpeStats.average : null;
  const rpeCount = showRPE && rpeStats ? rpeStats.count : 0;

  // XP total
  const totalXP = (session.stretchesCount ?? 0) > 0
    ? 250 + completedSets * 20 + (session.stretchesCount ?? 0) * 25
    : 0;

  // Records simplifiés
  const bestExercises = session.exercises
    .filter((log) => log.sets.some((s) => s.completed))
    .map((log) => ({
      name: log.exerciseName,
      weight: Math.max(...log.sets.filter((s) => s.completed && s.weightKg > 0).map((s) => s.weightKg), 0),
      reps: Math.max(...log.sets.filter((s) => s.completed && s.reps > 0).map((s) => s.reps), 0),
    }));

  return (
    <div
      style={{
        width: WORKOUT_CARD_WIDTH,
        height: WORKOUT_CARD_HEIGHT,
        background: '#0f0f15',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1a1a2e',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <div style={{ width: 40, height: 40, background: '#7f1d1f', borderRadius: 10, marginRight: 12 }} />
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase' }}>SportTrack</div>
          <h3 style={{ fontSize: 16, margin: 0 }}>{session.title || 'Séance'}</h3>
        </div>
      </div>

      {/* Date & Durée */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>Date</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>{formattedDate}</div>
        {durationMinutes !== undefined && durationMinutes > 0 && (
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>{durationMinutes} min</div>
        )}
      </div>

      {/* Résumé */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>Résumé</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{exercisesCount} exercices</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>séries</div>
          </div>
          <div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{completedSets} séries</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>complétées</div>
          </div>
          {volume > 0 && (
            <div>
              <div style={{ fontSize: 14, marginBottom: 2 }}>Volume</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>{volume} kg</div>
            </div>
          )}
          {showXP && totalXP > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>XP</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>{totalXP} XP</div>
            </div>
          )}
        </div>
      </div>

      {/* RPE */}
      {showRPE && averageRPE !== null && rpeCount > 0 && (
        <>
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>RPE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>RPE moyen</span>
              <div style={{ fontSize: 14, color: '#eab308' }}>{averageRPE?.toFixed(1)} / 10</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>{rpeCount} séries</div>
            </div>
          </div>
          {showRPE && rpeCount > 0 && rpeStats && rpeStats.min !== null && rpeStats.max !== null && (
            <div style={{ padding: '0 20px', marginTop: 4, fontSize: 10 }}>
              <span style={{ opacity: 0.6 }}>RPE min</span>
              <span style={{ marginLeft: 4, color: '#eab308' }}>{rpeStats.min}</span> /
              <span style={{ marginLeft: 4, color: '#f472b6' }}>{rpeStats.max}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};