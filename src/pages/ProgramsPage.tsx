import React, { useState, useMemo } from 'react';
import {
  WorkoutProgram,
  Exercise,
  WorkoutProgramDay,
  ProgramExerciseConfig,
  ProgramExerciseGroup,
  DayOfWeek,
  ExerciseDifficulty,
  MuscleGroup,
  StretchItem,
} from '../types';
import {
  getDefaultStretchesForDay,
  CORE_STRETCHES,
  LOWER_BODY_STRETCHES,
  UPPER_BODY_STRETCHES,
} from '../data/stretchesData';
import { formatDuration } from '../utilsExerciseMode';
import {
  getDayExerciseCount,
  getDayTotalSets,
  estimateDayDurationMin,
  getProgramSummary,
} from '../utilsProgram';
import { getWorkoutSettings } from '../utilsSettings';
import { validateProgramConsistency, validateDay } from '../utilsProgramConsistency';
import {
  buildExerciseSwapSuggestions,
  getExerciseNaturalMode,
  moveProgramExerciseToDay,
  renameProgramDay,
  replaceProgramExercise,
  validateProgramData,
  ExerciseModeChoice,
  ExerciseReplaceOutcome,
  ProgramValidationIssue,
} from '../utilsProgramSwap';
import {
  Layers,
  Play,
  Plus,
  CheckCircle2,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Copy,
  Trash2,
  Edit3,
  GripVertical,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  CalendarClock,
  Sliders,
  Flame,
  Info,
  RefreshCw,
  Timer,
  Repeat,
  Palette,
  MoveRight,
  ArrowLeftRight,
  Pencil,
  Lightbulb,
  ShieldAlert,
  RotateCcw,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import { OneRMModal } from '../components/OneRMModal';

interface ProgramsPageProps {
  programs: WorkoutProgram[];
  exercises: Exercise[];
  onSelectActiveProgram: (programId: string) => void;
  onStartSessionWithDay: (day: WorkoutProgramDay, program: WorkoutProgram) => void;
  onSaveProgram: (program: WorkoutProgram) => void;
  onDeleteProgram?: (programId: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
  'Flexible',
];

export const ProgramsPage: React.FC<ProgramsPageProps> = ({
  programs,
  exercises,
  onSelectActiveProgram,
  onStartSessionWithDay,
  onSaveProgram,
  onDeleteProgram,
}) => {
  const [expandedProgramId, setExpandedProgramId] = useState<string>(
    programs[0]?.id || ''
  );

  const globalTransitionRestSec = getWorkoutSettings().exerciseTransitionRestSec;

  // Program creation / editing modal
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [progTitle, setProgTitle] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progDaysCount, setProgDaysCount] = useState(4);
  const [progLevel, setProgLevel] = useState<ExerciseDifficulty>('Intermédiaire');
  const [progType, setProgType] = useState<'fixed' | 'flexible'>('fixed');
  const [progColor, setProgColor] = useState('#8b5cf6');

  const PROGRAM_COLORS = ['#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#ec4899', '#14b8a6'];

  // Session Editor Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [currentProgramForSession, setCurrentProgramForSession] = useState<WorkoutProgram | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Session fields
  const [sessionName, setSessionName] = useState('');
  const [sessionDayOfWeek, setSessionDayOfWeek] = useState<DayOfWeek>('Lundi');
  const [sessionScheduledTime, setSessionScheduledTime] = useState('18:00');
  const [sessionMuscleGroups, setSessionMuscleGroups] = useState<MuscleGroup[]>(['Pectoraux']);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<ProgramExerciseConfig[]>([]);
  const [sessionStretches, setSessionStretches] = useState<StretchItem[]>([]);

  // Exercise Picker Modal within Session Editor
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMuscle, setPickerMuscle] = useState<string>('Tous');

  // Drag and Drop State for exercises in session
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Cross-day exercise move state (within the current program being edited)
  const [moveFromDayId, setMoveFromDayId] = useState<string | null>(null);
  const [moveFromCfgId, setMoveFromCfgId] = useState<string | null>(null);
  const [moveToDayId, setMoveToDayId] = useState<string>('');

  // LOT D — exercise replacement (real UI wired to the pure utilsProgramSwap core)
  const [replaceCfgIndex, setReplaceCfgIndex] = useState<number | null>(null);
  const [replaceSearch, setReplaceSearch] = useState('');
  const [replacePending, setReplacePending] = useState<Exercise | null>(null);
  const [replaceOutcome, setReplaceOutcome] = useState<ExerciseReplaceOutcome | null>(null);

  // LOT E.1 — 1RM Calculator Modal
  const [oneRMModalOpen, setOneRMModalOpen] = useState(false);
  const [oneRMModalExercise, setOneRMModalExercise] = useState<Exercise | null>(null);
  const [oneRMModalMode, setOneRMModalMode] = useState<'estimate' | 'percentage' | 'plates'>('estimate');
  const [oneRMModalConfig, setOneRMModalConfig] = useState<ProgramExerciseConfig | null>(null);

// F.1-B — Gestion de groupes superset/circuit (UI de configuration uniquement).
  // Ces états sont indépendants de la session en cours ; ils opèrent sur
  // day.groups / day.exercises tels quels, sans toucher WorkoutSession, sans
  // IndexedDB, sans DB_VERSION.

  // État ouvert/fermé du modal de création/édition de groupe
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  // Groupe en cours d'édition (null = création neuve)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  // Type du groupe en cours : 'superset' | 'circuit'
  const [newGroupType, setNewGroupType] = useState<'superset' | 'circuit'>('superset');
  // IDs d'exercices sélectionnés pour la création d'un nouveau groupe
  const [groupSelectedExerciseIds, setGroupSelectedExerciseIds] = useState<string[]>([]);
  // Paramètres du groupe en cours d'édition
  const [editingGroupRounds, setEditingGroupRounds] = useState(1);
  const [editingGroupRestBetweenExercises, setEditingGroupRestBetweenExercises] = useState(0);
  const [editingGroupRestBetweenRounds, setEditingGroupRestBetweenRounds] = useState(60);

  // Filtre/mémo par programme pour éviter les ré-open inutilels du modal
  const [groupProgramId, setGroupProgramId] = useState<string | null>(null);

  const handleOpenOneRMModal = (exercise: Exercise, config: ProgramExerciseConfig | null, initialMode: 'estimate' | 'percentage' | 'plates' = 'estimate') => {
    setOneRMModalExercise(exercise);
    setOneRMModalConfig(config);
    setOneRMModalMode(initialMode);
    setOneRMModalOpen(true);
  };

  const handleOneRMApply = (weightKg: number) => {
    if (oneRMModalConfig && weightKg > 0) {
      handleUpdateExerciseParam(
        sessionExercises.findIndex((e) => e.id === oneRMModalConfig!.id),
        'targetWeightKg',
        weightKg
      );
    }
    setOneRMModalOpen(false);
    setOneRMModalConfig(null);
  };

  // F.1-B — Helpers de groupe (purs, sans mutation).

  // Génère un groupId unique
  const generateGroupId = (programId: string, dayId: string): string => {
    return `group-${programId}-${dayId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  };

  // Ouvre le modal de création/édition de groupe pour un jour donné
  const handleOpenGroupModal = (program: WorkoutProgram, day: WorkoutProgramDay) => {
    setGroupProgramId(program.id);
    const exerciseIds = day.exercises ? day.exercises.map((ex) => ex.exerciseId) : [];
    setGroupSelectedExerciseIds(exerciseIds);
    setIsGroupModalOpen(true);
  };

  // Ferme le modal de groupe
  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    setGroupProgramId(null);
    setEditingGroupId(null);
    setNewGroupType('superset');
    setGroupSelectedExerciseIds([]);
    setEditingGroupRounds(1);
    setEditingGroupRestBetweenExercises(0);
    setEditingGroupRestBetweenRounds(60);
  };

  // Crée un nouveau groupe avec les exercices sélectionnés
  const handleCreateGroup = (program: WorkoutProgram, day: WorkoutProgramDay) => {
    const exerciseIds = groupSelectedExerciseIds.filter(
      (id) => day.exercises?.some((ex) => ex.exerciseId === id)
    );
    if (exerciseIds.length < 2) return;

    // Trouver les configs d'exercices sélectionnés
    const selectedConfigs = day.exercises?.filter((ex) =>
      exerciseIds.includes(ex.exerciseId)
    ) || [];

    // Générer un groupId unique
    const groupId = generateGroupId(program.id, day.id);

    // Créer les nouveaux groupId/groupType pour chaque exercice sélectionné
    const updatedExercises = day.exercises?.map((ex) => {
      if (selectedConfigs.some((c) => c.id === ex.id)) {
        return { ...ex, groupId, groupType: newGroupType };
      }
      return ex;
    });

    // Créer le groupe
    const newGroup: ProgramExerciseGroup = {
      id: groupId,
      type: newGroupType,
      rounds: editingGroupRounds,
      restBetweenExercisesSec: editingGroupRestBetweenExercises,
      restBetweenRoundsSec: editingGroupRestBetweenRounds,
    };

    // Mettre à jour day.groups
    const updatedGroups = day.groups ? [...day.groups, newGroup] : [newGroup];

    // Sauvegarder le programme
    onSaveProgram({
      ...program,
      days: program.days.map((d) =>
        d.id === day.id ? { ...d, exercises: updatedExercises, groups: updatedGroups } : d
      ),
    });

    handleCloseGroupModal();
  };

  // Bascule un exercice dans/du groupe (ajoute ou retire)
  const handleToggleExerciseInGroup = (
    program: WorkoutProgram,
    day: WorkoutProgramDay,
    exerciseId: string
  ) => {
    const cfg = day.exercises?.find((c) => c.exerciseId === exerciseId);
    if (!cfg) return;

    if (cfg.groupId) {
      // Retirer du groupe
      const newExercises = day.exercises?.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, groupId: undefined, groupType: undefined }
          : ex
      ) || [];
      const newGroups = day.groups?.filter((g) => g.id !== cfg.groupId) || [];
      onSaveProgram({
        ...program,
        days: program.days.map((d) =>
          d.id === day.id ? { ...d, exercises: newExercises, groups: newGroups } : d
        ),
      });
    } else {
      // Ajouter au groupe (si on a déjà un groupe en cours)
      // Pour l'instant, on sélectionne juste l'exercice dans le modal
      const selected = groupSelectedExerciseIds.includes(exerciseId)
        ? groupSelectedExerciseIds.filter((id) => id !== exerciseId)
        : [...groupSelectedExerciseIds, exerciseId];
      setGroupSelectedExerciseIds(selected);
    }
  };

  // Dissout un groupe existant
  const handleDeleteGroup = (
    program: WorkoutProgram,
    day: WorkoutProgramDay,
    groupId: string
  ) => {
    const newExercises = day.exercises?.map((ex) =>
      ex.groupId === groupId ? { ...ex, groupId: undefined, groupType: undefined } : ex
    ) || [];
    const newGroups = day.groups?.filter((g) => g.id !== groupId) || [];
    onSaveProgram({
      ...program,
      days: program.days.map((d) =>
        d.id === day.id ? { ...d, exercises: newExercises, groups: newGroups } : d
      ),
    });
  };

  // Change le type d'un groupe (superset <-> circuit)
  const handleChangeGroupType = (
    program: WorkoutProgram,
    day: WorkoutProgramDay,
    groupId: string,
    newType: 'superset' | 'circuit'
  ) => {
    const newGroups = day.groups?.map((g) =>
      g.id === groupId ? { ...g, type: newType } : g
    ) || [];
    onSaveProgram({
      ...program,
      days: program.days.map((d) =>
        d.id === day.id ? { ...d, groups: newGroups } : d
      ),
    });
  };

  // Met à jour les paramètres d'un groupe
  const handleUpdateGroupParams = (
    program: WorkoutProgram,
    day: WorkoutProgramDay,
    groupId: string,
    rounds?: number,
    restBetweenExercisesSec?: number,
    restBetweenRoundsSec?: number
  ) => {
    const newGroups = day.groups?.map((g) =>
      g.id === groupId
        ? { ...g, rounds: rounds ?? g.rounds, restBetweenExercisesSec: restBetweenExercisesSec ?? g.restBetweenExercisesSec, restBetweenRoundsSec: restBetweenRoundsSec ?? g.restBetweenRoundsSec }
        : g
    ) || [];
    onSaveProgram({
      ...program,
      days: program.days.map((d) =>
        d.id === day.id ? { ...d, groups: newGroups } : d
      ),
    });
  };
  const [renamingDayId, setRenamingDayId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  // LOT D — advisory coherence report. Computed ONCE for every rendered program
  // (one memo, no hook inside the day map) and used for the per-day badge.
  const programIssues = useMemo(() => {
    const map = new Map<string, ProgramValidationIssue[]>();
    for (const program of programs) {
      const issues = validateProgramData(program, exercises);
      if (issues.length > 0) map.set(program.id, issues);
    }
    return map;
  }, [programs, exercises]);

  const dayIssueCount = (programId: string, dayId: string): number =>
    (programIssues.get(programId) || []).filter((issue) => issue.dayId === dayId).length;

  // LOT D — Delete Program Confirmation Modal
  const [isDeleteProgramModalOpen, setIsDeleteProgramModalOpen] = useState(false);
  const [deleteProgramTarget, setDeleteProgramTarget] = useState<string | null>(null);

  const getExerciseObj = (id: string): Exercise | undefined => {
    return exercises.find((e) => e.id === id);
  };

  // ================= PROGRAM CRUD =================
  const handleOpenNewProgram = () => {
    setEditingProgramId(null);
    setProgTitle('');
    setProgDesc('');
    setProgDaysCount(4);
    setProgLevel('Intermédiaire');
    setProgType('fixed');
    setProgColor('#8b5cf6');
    setIsProgramModalOpen(true);
  };

  const handleOpenEditProgram = (prog: WorkoutProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProgramId(prog.id);
    setProgTitle(prog.title);
    setProgDesc(prog.description);
    setProgDaysCount(prog.daysPerWeek);
    setProgLevel(prog.level);
    setProgType(prog.type || 'fixed');
    setProgColor(prog.color || '#8b5cf6');
    setIsProgramModalOpen(true);
  };

  const handleSaveProgramForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progTitle.trim()) return;

    if (editingProgramId) {
      const existing = programs.find((p) => p.id === editingProgramId);
      if (!existing) return;
      const updated: WorkoutProgram = {
        ...existing,
        title: progTitle.trim(),
        description: progDesc.trim() || 'Programme personnalisé.',
        daysPerWeek: progDaysCount,
        level: progLevel,
        type: progType,
        color: progColor,
      };
      onSaveProgram(updated);
    } else {
      const newProg: WorkoutProgram = {
        id: `prog-${Date.now()}`,
        title: progTitle.trim(),
        description: progDesc.trim() || 'Programme personnalisé créé sur SportTrack.',
        daysPerWeek: progDaysCount,
        level: progLevel,
        type: progType,
        isActive: programs.length === 0,
        color: progColor,
        days: [],
      };
      onSaveProgram(newProg);
      setExpandedProgramId(newProg.id);
    }

    setIsProgramModalOpen(false);
  };

  const handleDuplicateProgram = (prog: WorkoutProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: WorkoutProgram = {
      ...prog,
      id: `prog-${Date.now()}`,
      title: `${prog.title} (Copie)`,
      isActive: false,
      days: prog.days.map((day) => ({
        ...day,
        id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        exercises: day.exercises ? [...day.exercises.map((ex) => ({ ...ex, id: `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }))] : [],
      })),
    };
    onSaveProgram(duplicated);
    setExpandedProgramId(duplicated.id);
  };

  const handleDeleteProgram = (progId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer ce programme ?')) {
      if (onDeleteProgram) onDeleteProgram(progId);
    }
  };

  // ================= SESSION / DAY CRUD =================
  const handleOpenNewSession = (program: WorkoutProgram) => {
    setCurrentProgramForSession(program);
    setEditingSessionId(null);
    const dayName = program.type === 'fixed' ? 'Nouvelle Séance' : `Jour ${program.days.length + 1}`;
    const dayOfWeek = program.type === 'fixed' ? 'Lundi' : 'Flexible';
    setSessionName(dayName);
    setSessionDayOfWeek(dayOfWeek);
    setSessionScheduledTime('18:00');
    setSessionMuscleGroups(['Pectoraux']);
    setSessionNotes('');
    setSessionExercises([]);
    setSessionStretches(getDefaultStretchesForDay(dayOfWeek, dayName, ['Pectoraux']));
    setIsSessionModalOpen(true);
  };

  const handleOpenEditSession = (program: WorkoutProgram, day: WorkoutProgramDay) => {
    setCurrentProgramForSession(program);
    setEditingSessionId(day.id);
    setSessionName(day.name);
    setSessionDayOfWeek((day.dayOfWeek as DayOfWeek) || (program.type === 'fixed' ? 'Lundi' : 'Flexible'));
    setSessionScheduledTime(day.scheduledTime || '18:00');
    setSessionMuscleGroups(day.muscleGroups || ['Pectoraux']);
    setSessionNotes(day.notes || '');
    setSessionStretches(day.stretches || getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups));

    // Migrate from exerciseIds if exercises array is missing
    let configs: ProgramExerciseConfig[] = [];
    if (day.exercises && day.exercises.length > 0) {
      configs = JSON.parse(JSON.stringify(day.exercises));
    } else if (day.exerciseIds && day.exerciseIds.length > 0) {
      configs = day.exerciseIds.map((exId, idx) => {
        const found = getExerciseObj(exId);
        const setsCount = found?.defaultSets || 4;
        const repsN = Number(found?.defaultReps) || 10;
        return {
          id: `cfg-${idx}-${Date.now()}`,
          exerciseId: exId,
          exerciseName: found?.name || exId,
          sets: setsCount,
          reps: repsN,
          repsPlan: Array.from({ length: setsCount }, () => repsN),
          durationPlan: Array.from({ length: setsCount }, () => 0),
          mode: 'reps',
          durationSec: 0,
          targetWeightKg: 0,
          restSec: found?.defaultRestSec || 90,
        };
      });
    }

    setSessionExercises(configs);
    setIsSessionModalOpen(true);
  };

  const handleDuplicateSession = (program: WorkoutProgram, day: WorkoutProgramDay) => {
    const duplicatedDay: WorkoutProgramDay = {
      ...day,
      id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${day.name} (Copie)`,
      exercises: (day.exercises || []).map((ex) => ({
        ...ex,
        id: `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      })),
      stretches: day.stretches ? [...day.stretches] : getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups),
    };

    const updatedProgram: WorkoutProgram = {
      ...program,
      days: [...program.days, duplicatedDay],
    };

    onSaveProgram(updatedProgram);
  };

  const handleDeleteSession = (program: WorkoutProgram, dayId: string) => {
    if (confirm('Voulez-vous supprimer cette séance du programme ?')) {
      const updatedProgram: WorkoutProgram = {
        ...program,
        days: program.days.filter((d) => d.id !== dayId),
      };
      onSaveProgram(updatedProgram);
    }
  };

  // LOT D — inline day rename. Only `name` is written by the pure helper: the
  // day id, dayOfWeek, muscleGroups, exercises, stretches and notes are
  // preserved verbatim, and an empty name is rejected instead of erasing it.
  const startDayRename = (day: WorkoutProgramDay) => {
    setRenamingDayId(day.id);
    setRenameValue(day.name || '');
    setRenameError('');
  };

  const cancelDayRename = () => {
    setRenamingDayId(null);
    setRenameValue('');
    setRenameError('');
  };

  const commitDayRename = (program: WorkoutProgram, dayId: string) => {
    const result = renameProgramDay(program, dayId, renameValue);
    if (!result.changed) {
      setRenameError(result.error || 'Nom de séance invalide.');
      return;
    }
    onSaveProgram(result.program);
    cancelDayRename();
  };

  // LOT D — the editor state is projected back into a program so the pure core
  // operates on exactly what the session form is about to persist.
  const buildEditorProgram = (): WorkoutProgram | null => {
    if (!currentProgramForSession || !editingSessionId) return null;
    return {
      ...currentProgramForSession,
      days: currentProgramForSession.days.map((d) =>
        d.id === editingSessionId
          ? {
              ...d,
              exercises: sessionExercises,
              exerciseIds: sessionExercises.map((c) => c.exerciseId),
            }
          : d
      ),
    };
  };

  const openReplacePanel = (index: number) => {
    setReplaceCfgIndex(index);
    setReplaceSearch('');
    setReplacePending(null);
  };

  const closeReplacePanel = () => {
    setReplaceCfgIndex(null);
    setReplaceSearch('');
    setReplacePending(null);
  };

  const applyExerciseReplacement = (next: Exercise, choice: ExerciseModeChoice) => {
    const dayId = editingSessionId;
    const cfg = replaceCfgIndex != null ? sessionExercises[replaceCfgIndex] : undefined;
    const base = buildEditorProgram();
    if (!dayId || !cfg || !base) return;
    const result = replaceProgramExercise(base, dayId, cfg.id, next, choice);
    if (!result.outcome) return;
    const updatedDay = result.program.days.find((d) => d.id === dayId);
    if (!updatedDay || !updatedDay.exercises) return;
    setSessionExercises(updatedDay.exercises);
    setReplaceOutcome(result.outcome);
    setReplacePending(null);
  };

  // Compatible mode -> applied immediately with the full configuration kept.
  // Incompatible mode -> NO automatic conversion: the explicit choice panel is
  // shown first and nothing is written until the user picks.
  const chooseReplacement = (candidate: Exercise) => {
    const cfg = replaceCfgIndex != null ? sessionExercises[replaceCfgIndex] : undefined;
    if (!cfg) return;
    const currentMode = cfg.mode === 'timer' ? 'timer' : 'reps';
    if (getExerciseNaturalMode(candidate) === currentMode) {
      applyExerciseReplacement(candidate, 'keep');
    } else {
      setReplacePending(candidate);
    }
  };

  const replaceConfig = replaceCfgIndex != null ? sessionExercises[replaceCfgIndex] : undefined;
  const replaceCurrent = replaceConfig ? getExerciseObj(replaceConfig.exerciseId) : undefined;

  // Suggestions ranked only from the metadata already stored on `Exercise`.
  const replaceSuggestions = useMemo(() => {
    if (!replaceConfig) return [];
    return buildExerciseSwapSuggestions(replaceCurrent, replaceConfig, exercises, {
      limit: 6,
      dayExerciseIds: sessionExercises.map((c) => c.exerciseId),
    });
  }, [replaceConfig, replaceCurrent, exercises, sessionExercises]);

  // Fallback: any other exercise of the library, searched by name/muscle.
  const replaceLibraryResults = useMemo(() => {
    if (replaceCfgIndex == null) return [];
    const query = replaceSearch.trim().toLowerCase();
    return exercises
      .filter((ex) => ex.id !== replaceConfig?.exerciseId)
      .filter(
        (ex) =>
          !query ||
          ex.name.toLowerCase().includes(query) ||
          ex.primaryMuscle.toLowerCase().includes(query)
      )
      .slice(0, 40);
  }, [exercises, replaceSearch, replaceCfgIndex, replaceConfig]);

  // LOT D — Delete Program Confirmation
  const handleConfirmDeleteProgram = () => {
    if (deleteProgramTarget && onDeleteProgram) {
      onDeleteProgram(deleteProgramTarget);
    }
    setIsDeleteProgramModalOpen(false);
    setDeleteProgramTarget(null);
  };

  // Reorder a day within the program (up / down). Only the ordered array of
  // days is modified; day content and ids are preserved verbatim.
  const handleMoveDay = (program: WorkoutProgram, dayId: string, direction: 'up' | 'down') => {
    const idx = program.days.findIndex((d) => d.id === dayId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === program.days.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const days = [...program.days];
    const item = days[idx];
    days[idx] = days[targetIdx];
    days[targetIdx] = item;
    onSaveProgram({ ...program, days });
  };

  // Move an exercise (with its full config) from one day to another within the
  // same program. The configuration (sets, reps/timer plans, weight, rest,
  // notes) is carried over untouched; the source day's exerciseIds fallback is
  // also kept in sync so legacy consumers stay coherent.
  // Move an exercise (with its full config) from one day to another within the
  // same program. Delegates to the pure helper so the exact persisted result is
  // unit tested (full config carried over, exerciseIds re-synced on both days,
  // and a legacy target day materialized instead of losing its ids).
  const handleMoveExerciseToDay = (program: WorkoutProgram) => {
    const result = moveProgramExerciseToDay(
      program,
      moveFromDayId || '',
      moveToDayId,
      moveFromCfgId || '',
      exercises
    );
    if (result.changed) {
      onSaveProgram(result.program);
    }
    resetMoveState();
  };

  const resetMoveState = () => {
    setMoveFromDayId(null);
    setMoveFromCfgId(null);
    setMoveToDayId('');
  };

  const handleDuplicateWeek = (program: WorkoutProgram) => {
    if (confirm('Dupliquer toute la structure des séances de la semaine ?')) {
      const clonedDays: WorkoutProgramDay[] = program.days.map((day, idx) => ({
        ...day,
        id: `day-dup-${Date.now()}-${idx}`,
        name: `${day.name} (Semaine 2)`,
        exercises: (day.exercises || []).map((ex) => ({
          ...ex,
          id: `cfg-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        })),
        stretches: day.stretches ? [...day.stretches] : getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups),
      }));

      const updatedProgram: WorkoutProgram = {
        ...program,
        days: [...program.days, ...clonedDays],
      };
      onSaveProgram(updatedProgram);
    }
  };

  // ================= EXERCISE CONFIG IN SESSION =================
  const handleAddExerciseToSession = (ex: Exercise) => {
    const setsCount = Number(ex.defaultSets) || 4;
    const repsN = Number(ex.defaultReps) || 10;
    const newConfig: ProgramExerciseConfig = {
      id: `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: setsCount,
      reps: repsN,
      repsPlan: Array.from({ length: setsCount }, () => repsN),
      durationPlan: Array.from({ length: setsCount }, () => 0),
      mode: 'reps',
      durationSec: 0,
      targetWeightKg: 0,
      restSec: ex.defaultRestSec || 90,
      notes: '',
    };
    setSessionExercises([...sessionExercises, newConfig]);
    setIsPickerOpen(false);
  };

  const getRepsPlan = (cfg: ProgramExerciseConfig): (number | string)[] => {
    if (Array.isArray(cfg.repsPlan) && cfg.repsPlan.length >= cfg.sets) {
      return [...cfg.repsPlan];
    }
    const fallback = Number.isFinite(Number(cfg.reps)) ? Number(cfg.reps) : 10;
    return Array.from({ length: cfg.sets || 3 }, () => fallback || 10);
  };

  const getDurationPlan = (cfg: ProgramExerciseConfig): number[] => {
    if (Array.isArray(cfg.durationPlan) && cfg.durationPlan.length >= cfg.sets) {
      return [...cfg.durationPlan];
    }
    const fallback = Number(cfg.durationSec) || 0;
    return Array.from({ length: cfg.sets || 3 }, () => fallback);
  };

  const handleUpdateSets = (index: number, sets: number) => {
    const updated = [...sessionExercises];
    const cfg = { ...updated[index] };
    const newSets = Math.max(1, Math.min(15, Number(sets) || 1));
    const repsPlan = getRepsPlan(cfg);
    const durationPlan = getDurationPlan(cfg);
    if (newSets > repsPlan.length) {
      const lastRep = repsPlan.length > 0 ? repsPlan[repsPlan.length - 1] : (Number.isFinite(Number(cfg.reps)) ? Number(cfg.reps) : 10);
      while (repsPlan.length < newSets) repsPlan.push(lastRep || 10);
      const lastDur = durationPlan.length > 0 ? durationPlan[durationPlan.length - 1] : (Number(cfg.durationSec) || 0);
      while (durationPlan.length < newSets) durationPlan.push(lastDur || 0);
    } else {
      repsPlan.length = newSets;
      durationPlan.length = newSets;
    }
    cfg.sets = newSets;
    cfg.repsPlan = repsPlan;
    cfg.durationPlan = durationPlan;
    updated[index] = cfg;
    setSessionExercises(updated);
  };

  const handleUpdatePlanValue = (
    index: number,
    setIndex: number,
    field: 'repsPlan' | 'durationPlan',
    value: number | string
  ) => {
    const updated = [...sessionExercises];
    const cfg = { ...updated[index] };
    if (field === 'repsPlan') {
      const plan = getRepsPlan(cfg);
      plan[setIndex] = value === '' ? 0 : value;
      cfg.repsPlan = plan;
    } else {
      const plan = getDurationPlan(cfg);
      plan[setIndex] = Math.max(0, Math.round(Number(value) || 0));
      cfg.durationPlan = plan;
    }
    updated[index] = cfg;
    setSessionExercises(updated);
  };

  const handleUpdateExerciseParam = (
    index: number,
    field: keyof ProgramExerciseConfig,
    value: any
  ) => {
    const updated = [...sessionExercises];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSessionExercises(updated);
  };

  const handleRemoveExerciseFromSession = (index: number) => {
    setSessionExercises(sessionExercises.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sessionExercises.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...sessionExercises];
    const item = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = item;
    setSessionExercises(updated);
  };

  // Drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...sessionExercises];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSessionExercises(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save session form
  const handleSaveSessionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProgramForSession || !sessionName.trim()) return;

    const dayPayload: WorkoutProgramDay = {
      id: editingSessionId || `day-${Date.now()}`,
      name: sessionName.trim(),
      dayOfWeek: sessionDayOfWeek,
      scheduledTime: sessionScheduledTime,
      muscleGroups: sessionMuscleGroups.length > 0 ? sessionMuscleGroups : ['Full Body'],
      exerciseIds: sessionExercises.map((e) => e.exerciseId),
      exercises: sessionExercises,
      stretches: sessionStretches.length > 0 ? sessionStretches : getDefaultStretchesForDay(sessionDayOfWeek, sessionName, sessionMuscleGroups),
      notes: sessionNotes.trim() || undefined,
    };

    let updatedDays: WorkoutProgramDay[];
    if (editingSessionId) {
      updatedDays = currentProgramForSession.days.map((d) =>
        d.id === editingSessionId ? dayPayload : d
      );
    } else {
      updatedDays = [...currentProgramForSession.days, dayPayload];
    }

    const updatedProg: WorkoutProgram = {
      ...currentProgramForSession,
      days: updatedDays,
    };

    onSaveProgram(updatedProg);
    setIsSessionModalOpen(false);
  };

  // Filter exercises for picker modal
  const filteredPickerExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const q = pickerSearch.toLowerCase();
      const matchesSearch =
        !pickerSearch ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle.toLowerCase().includes(q);
      const matchesMuscle =
        pickerMuscle === 'Tous' ||
        ex.primaryMuscle === pickerMuscle ||
        ex.muscleGroup === pickerMuscle;
      return matchesSearch && matchesMuscle;
    });
  }, [exercises, pickerSearch, pickerMuscle]);

  return (
    <div id="page-programs" className="space-y-6 max-w-6xl mx-auto pb-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
                Programmes d'Entraînement
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Planification hebdomadaire fixe ou routines flexibles selon vos objectifs.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-create-program"
          data-testid="program-create"
          onClick={handleOpenNewProgram}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-violet-950/40 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Programme</span>
        </button>
      </div>

      {/* Programs List */}
      {programs.length === 0 ? (
        <div className="sport-card rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wider">
              Aucun programme pour le moment
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Vous pouvez créer votre propre programme personnalisé ou démarrer une séance libre à tout moment.
            </p>
          </div>
          <button
            id="btn-empty-create-program"
            onClick={handleOpenNewProgram}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Créer mon programme</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {programs.map((program) => {
            const isExpanded = expandedProgramId === program.id;
            const isFixed = program.type !== 'flexible';
            const summary = getProgramSummary(program);
            const accent = program.color || '#8b5cf6';
            // LOT 9 — 9.7: consistency diagnostics (read-only, purely derived).
            const programDiagnostics = validateProgramConsistency(program, exercises);

            return (
              <div
                key={program.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden backdrop-blur-xl ${
                  program.isActive
                    ? 'bg-violet-950/20 border-violet-500/50 shadow-2xl shadow-violet-950/30 ring-1 ring-violet-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20 shadow-lg'
                }`}
                style={program.isActive ? { borderColor: accent } : undefined}
              >
                {/* Program Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-white">{program.title}</h2>
                      {program.isActive && (
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase bg-violet-600/30 text-violet-200 border border-violet-500/40 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                          Programme Actif
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                          isFixed
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {isFixed ? '📅 Hebdo Fixe' : '⚡ Flexible'}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                        {program.level}
                      </span>
                      <span className="text-[11px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-lg">
                        {program.days.length} séances
                      </span>
                      {programDiagnostics.errors.length > 0 ? (
                        <span
                          data-testid="program-consistency-errors"
                          title={programDiagnostics.errors.map((e) => e.message).join('\n')}
                          className="flex items-center gap-1 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-lg"
                        >
                          <X className="w-3 h-3" /> {programDiagnostics.errors.length} erreur{programDiagnostics.errors.length > 1 ? 's' : ''}
                        </span>
                      ) : programDiagnostics.warnings.length > 0 ? (
                        <span
                          data-testid="program-consistency-warnings"
                          title={programDiagnostics.warnings.map((w) => w.message).join('\n')}
                          className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg"
                        >
                          <Info className="w-3 h-3" /> {programDiagnostics.warnings.length} alerte{programDiagnostics.warnings.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                      {program.description}
                    </p>

                    {/* Program-level aperçu: total exercises, sets, duration, day breakdown */}
                    <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5" data-testid="program-summary">
                      <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <Dumbbell className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-semibold">{summary.totalExercises}</span> exercices
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <Repeat className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-semibold">{summary.totalSets}</span> séries
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-semibold">~{summary.totalDurationMin} min</span> estimées
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        {summary.days.length} séance{summary.days.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Répartition des jours: mini bar showing each day's workload */}
                    {summary.days.length > 0 && (
                      <div className="flex items-end gap-1 pt-1.5" data-testid="program-day-distribution">
                        {summary.days.map((d, di) => {
                          const pct = summary.totalSets > 0 ? Math.round((d.sets / summary.totalSets) * 100) : 0;
                          return (
                            <div key={d.day.id || di} className="flex-1 min-w-0">
                              <div
                                className="rounded-t-md"
                                style={{ height: `${Math.max(4, pct || 4)}px`, backgroundColor: accent, opacity: 0.85 }}
                                title={`${d.day.name} — ${d.sets} séries / ~${d.durationMin} min`}
                              />
                              <div className="text-[9px] text-zinc-500 text-center truncate mt-1">
                                Jour {di + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    {!program.isActive && (
                      <button
                        onClick={() => onSelectActiveProgram(program.id)}
                        data-testid="program-select-active"
                        className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow"
                      >
                        Définir comme actif
                      </button>
                    )}

                    <button
                      onClick={(e) => handleOpenEditProgram(program, e)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all"
                      title="Modifier le programme"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDuplicateProgram(program, e)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all"
                      title="Dupliquer le programme"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteProgram(program.id, e)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all"
                      title="Supprimer le programme"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedProgramId(isExpanded ? '' : program.id)}
                      className="p-2 rounded-xl bg-white/5 text-zinc-300 hover:text-white border border-white/10 transition-colors ml-1"
                      aria-label={isExpanded ? 'Réduire' : 'Déplier'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              {/* Expanded Sessions Section */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-black/30 backdrop-blur-md p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                        Séances du programme ({program.days.length})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicateWeek(program)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-all"
                        title="Dupliquer toutes les séances"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                        <span>Dupliquer la semaine</span>
                      </button>

                      <button
                        onClick={() => handleOpenNewSession(program)}
                        data-testid="session-add"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter une séance</span>
                      </button>
                    </div>
                  </div>

                  {/* Sessions Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {program.days.map((day, idx) => {
                      const exerciseConfigs: ProgramExerciseConfig[] =
                        day.exercises && day.exercises.length > 0
                          ? day.exercises
                          : day.exerciseIds.map((id) => ({
                              id: id,
                              exerciseId: id,
                              exerciseName: getExerciseObj(id)?.name || id,
                              sets: 4,
                              reps: 10,
                              targetWeightKg: 0,
                              restSec: 90,
                            }));

                      // LOT 9 — 9.7: per-day diagnostics used to block launching.
                      const dayDiagnostics = validateDay(program, day, exercises);
                      const dayBlocked = dayDiagnostics.errors.length > 0;

                      return (
                        <div
                          key={day.id}
                          className="bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all"
                        >
                          <div className="space-y-3">
                            {/* Session Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-lg">
                                    {day.dayOfWeek && day.dayOfWeek !== 'Flexible'
                                      ? `📅 ${day.dayOfWeek}`
                                      : `Jour ${idx + 1}`}
                                  </span>
                                  {day.scheduledTime && (
                                    <span className="text-[11px] text-zinc-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-violet-400" />
                                      {day.scheduledTime}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-base text-white mt-1.5">
                                  {day.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => startDayRename(day)}
                                    data-testid="day-rename-open"
                                    aria-label={`Renommer la séance ${day.name}`}
                                    title="Renommer la séance"
                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  {dayIssueCount(program.id, day.id) > 0 && (
                                    <span
                                      data-testid="day-issues"
                                      title={`${dayIssueCount(program.id, day.id)} contrôle(s) de cohérence`}
                                      className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5 font-semibold"
                                    >
                                      {dayIssueCount(program.id, day.id)} contrôle(s)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveDay(program, day.id, 'up')}
                                  disabled={idx === 0}
                                  data-testid="day-move-up"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30"
                                  title="Déplacer la séance vers le haut"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveDay(program, day.id, 'down')}
                                  disabled={idx === program.days.length - 1}
                                  data-testid="day-move-down"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30"
                                  title="Déplacer la séance vers le bas"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditSession(program, day)}
                                  data-testid="day-edit"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5"
                                  title="Modifier la séance"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateSession(program, day)}
                                  data-testid="day-duplicate"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5"
                                  title="Dupliquer la séance"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(program, day.id)}
                                  data-testid="day-delete"
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  title="Supprimer la séance"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* LOT D — inline day rename (name only, content preserved) */}
                            {renamingDayId === day.id && (
                              <div
                                className="bg-black/40 border border-violet-500/40 rounded-xl p-2.5 space-y-2"
                                data-testid="day-rename-panel"
                              >
                                <label
                                  htmlFor={`day-rename-${day.id}`}
                                  className="block text-[10px] font-semibold text-zinc-300"
                                >
                                  Renommer la séance
                                </label>
                                <input
                                  id={`day-rename-${day.id}`}
                                  type="text"
                                  value={renameValue}
                                  autoFocus
                                  maxLength={60}
                                  onChange={(e) => {
                                    setRenameValue(e.target.value);
                                    if (renameError) setRenameError('');
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitDayRename(program, day.id);
                                    if (e.key === 'Escape') cancelDayRename();
                                  }}
                                  data-testid="day-rename-input"
                                  aria-label={`Renommer la séance ${day.name}`}
                                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                                />
                                {renameError && (
                                  <p className="text-[10px] text-rose-400" role="alert" data-testid="day-rename-error">
                                    {renameError}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => commitDayRename(program, day.id)}
                                    data-testid="day-rename-save"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold"
                                  >
                                    <Check className="w-3 h-3" />
                                    Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelDayRename}
                                    data-testid="day-rename-cancel"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold"
                                  >
                                    <X className="w-3 h-3" />
                                    Annuler
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-500">
                                  Seuls les exercices, séries, repos et étirements sont conservés tels quels.
                                </p>
                              </div>
                            )}

                            {/* Day-level preview: exercise count, sets, duration */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400" data-testid="day-summary">
                              <span className="flex items-center gap-1">
                                <Dumbbell className="w-3 h-3 text-violet-400" />
                                {getDayExerciseCount(day)} exercice{getDayExerciseCount(day) > 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Repeat className="w-3 h-3 text-violet-400" />
                                {getDayTotalSets(day)} séries
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-violet-400" />~{estimateDayDurationMin(day)} min
                              </span>
                              {!dayBlocked && dayDiagnostics.warnings.length > 0 && (
                                <span
                                  data-testid="day-consistency-warnings"
                                  title={dayDiagnostics.warnings.map((w) => w.message).join('\n')}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300"
                                >
                                  <Info className="w-3 h-3" /> {dayDiagnostics.warnings.length}
                                </span>
                              )}
                            </div>

                            {/* Muscles tags */}
                            {day.muscleGroups && day.muscleGroups.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {day.muscleGroups.map((mg) => (
                                  <span
                                    key={mg}
                                    className="text-[10px] bg-white/5 text-zinc-300 px-2 py-0.5 rounded-md border border-white/5"
                                  >
                                    {mg}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Exercise Items List */}
                            <div className="space-y-1.5 pt-1">
                              {exerciseConfigs.map((exCfg, exIdx) => {
                                const found = getExerciseObj(exCfg.exerciseId);
                                return (
                                  <div
                                    key={exCfg.id || exIdx}
                                    className="flex items-center justify-between text-xs bg-black/30 border border-white/5 px-3 py-2 rounded-xl"
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <span className="text-violet-400 font-mono text-[10px]">
                                        {exIdx + 1}.
                                      </span>
                                      <span className="font-medium text-zinc-200 truncate">
                                        {exCfg.exerciseName || found?.name || exCfg.exerciseId}
{exCfg.groupId && (
  <span className="text-[0.65em] align-baseline bg-violet-500/20 border border-violet-500/40 px-1.5 py-0.5 rounded text-[0.65em] font-semibold">
    {exCfg.groupType === 'superset' ? 'Superset' : 'Circuit'}
  </span>
)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
                                      <span className="text-violet-300 font-semibold">
                                        {exCfg.sets} × {exCfg.mode === 'timer' || (exCfg.mode !== 'reps' && (Number(exCfg.durationSec) || 0) > 0)
                                        ? formatDuration(getDurationPlan(exCfg)[0] || Number(exCfg.durationSec) || 0)
                                        : `${getRepsPlan(exCfg)[0] ?? exCfg.reps} reps`}
                                      </span>
                                      {exCfg.targetWeightKg > 0 && (
                                        <span className="text-zinc-300">
                                          @{exCfg.targetWeightKg}kg
                                        </span>
                                      )}
                                      <span className="text-zinc-500">{Number.isFinite(exCfg.restSec) && exCfg.restSec >= 0 ? exCfg.restSec : 30}s · après {exCfg.transitionRestSec ?? globalTransitionRestSec}s</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* End-of-session stretches — displayed individually like exercises */}
                              {(() => {
                                const dayStretches = day.stretches || getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups);
                                return (
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between px-1 pb-0.5">
                                      <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-violet-400" />
                                        Étirements de fin ({dayStretches.length})
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-medium">Inclus</span>
                                    </div>

                                    {dayStretches.map((s, stretchIdx) => (
                                      <div
                                        key={s.id || stretchIdx}
                                        className="flex items-center justify-between text-xs bg-black/30 border border-white/5 px-3 py-2 rounded-xl"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 truncate pr-2">
                                          <span className="text-violet-400 font-mono text-[10px] shrink-0">
                                            {stretchIdx + 1}.
                                          </span>
                                          <span className="font-medium text-zinc-200 truncate">
                                            {s.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
                                          <span className="text-violet-300 font-semibold">
                                            {s.durationSec}s
                                          </span>
                                          {s.hasSides && (
                                            <span className="text-zinc-500">/ côté</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <button
                            disabled={dayBlocked}
                            onClick={() => !dayBlocked && onStartSessionWithDay(day, program)}
                            data-testid="day-launch-session"
                            aria-disabled={dayBlocked}
                            title={
                              dayBlocked
                                ? dayDiagnostics.errors.map((e) => e.message).join('\n')
                                : 'Lancer cette séance'
                            }
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md mt-2 ${
                              dayBlocked
                                ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                            }`}
                          >
                            {dayBlocked ? <X className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                            <span>{dayBlocked ? 'Séance incohérente' : 'Lancer cette séance'}</span>
                          </button>

                          {dayBlocked && (
                            <ul className="mt-2 space-y-1 text-[11px] text-rose-300" data-testid="day-consistency-errors">
                              {dayDiagnostics.errors.map((e, ei) => (
                                <li key={`${e.code}-${ei}`} className="flex items-start gap-1.5">
                                  <X className="w-3 h-3 mt-0.5 shrink-0" />
                                  {e.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ================= PROGRAM CREATION / EDIT MODAL ================= */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProgramForm}
            className="bg-[#12111a] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-violet-300 font-bold text-base">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span>{editingProgramId ? 'Modifier le programme' : 'Nouveau Programme'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nom du programme *
                </label>
                <input
                  type="text"
                  required
                  value={progTitle}
                  onChange={(e) => setProgTitle(e.target.value)}
                  placeholder="Ex: Push Pull Legs Hebdomadaire"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Program Type: Fixed vs Flexible */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Type de structure
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProgType('fixed')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      progType === 'fixed'
                        ? 'bg-violet-600/20 border-violet-500 text-white'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-violet-300">📅 Hebdomadaire Fixe</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Séances assignées aux jours (Lundi, Mercredi...) avec horaires.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProgType('flexible')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      progType === 'flexible'
                        ? 'bg-violet-600/20 border-violet-500 text-white'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-purple-300">⚡ Routine Flexible</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Séances cycliques (Jour 1, 2...) sans jour fixe imposé.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Séances / semaine
                  </label>
                  <select
                    value={progDaysCount}
                    onChange={(e) => setProgDaysCount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value={2} className="bg-[#0f0f15]">2 séances</option>
                    <option value={3} className="bg-[#0f0f15]">3 séances</option>
                    <option value={4} className="bg-[#0f0f15]">4 séances</option>
                    <option value={5} className="bg-[#0f0f15]">5 séances</option>
                    <option value={6} className="bg-[#0f0f15]">6 séances</option>
                    <option value={7} className="bg-[#0f0f15]">7 séances</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Niveau</label>
                  <select
                    value={progLevel}
                    onChange={(e) => setProgLevel(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Débutant" className="bg-[#0f0f15]">Débutant</option>
                    <option value="Intermédiaire" className="bg-[#0f0f15]">Intermédiaire</option>
                    <option value="Avancé" className="bg-[#0f0f15]">Avancé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description / Objectif
                </label>
                <textarea
                  rows={2}
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  placeholder="Ex: Prise de masse musculaire, progression en force..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Program color selector (uses the existing `color` field, no migration) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-violet-400" />
                  <span>Couleur du programme</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap" data-testid="program-color-picker">
                  {PROGRAM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProgColor(c)}
                      data-testid={`program-color-${c.slice(1)}`}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        progColor === c
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                data-testid="program-save"
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl transition-all shadow-md"
              >
                {editingProgramId ? 'Enregistrer les modifications' : 'Créer le programme'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= FULL SESSION BUILDER / MODAL ================= */}
      {isSessionModalOpen && currentProgramForSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveSessionForm}
            className="bg-[#12111a] border border-white/15 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col p-5 sm:p-7 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-violet-400" />
                  <span>
                    {editingSessionId ? 'Modifier la séance' : 'Créer une séance complète'}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Programme : <span className="text-violet-300">{currentProgramForSession.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto space-y-5 py-4 flex-1 pr-1">
              {/* Session Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nom de la séance *
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Ex: Push — Pectoraux / Triceps"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Jour planifié
                  </label>
                  <select
                    value={sessionDayOfWeek}
                    onChange={(e) => setSessionDayOfWeek(e.target.value as DayOfWeek)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d} className="bg-[#0f0f15]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Heure prévue (ex: 18:00)
                  </label>
                  <input
                    type="time"
                    value={sessionScheduledTime}
                    onChange={(e) => setSessionScheduledTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Notes ou focus de la séance
                  </label>
                  <input
                    type="text"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Ex: Accent sur l'étirement et tempo lent"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Exercise List & Reordering */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 text-violet-400" />
                      <span>Exercices de la séance ({sessionExercises.length})</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Modifiez les séries, répétitions, poids cible, repos et réorganisez par glisser-déposer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    data-testid="exercise-add"
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un exercice</span>
                  </button>
                </div>

                {/* Exercises Table / Cards */}
                <div className="space-y-2.5">
                  {sessionExercises.map((exCfg, idx) => {
                    return (
                      <div
                        key={exCfg.id || idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white/5 border border-white/10 rounded-2xl p-3.5 transition-all space-y-2.5 ${
                          draggedIndex === idx ? 'opacity-50 border-violet-500 scale-[0.99]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 truncate">
                            <span className="cursor-grab text-zinc-500 hover:text-zinc-300">
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <span className="text-violet-400 font-mono text-xs font-bold w-5">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-sm text-white truncate">
                              {exCfg.exerciseName}
                            </span>
                          </div>

                          {/* Reorder and Delete Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30"
                              title="Monter"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(idx, 'down')}
                              disabled={idx === sessionExercises.length - 1}
                              className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30"
                              title="Descendre"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExerciseFromSession(idx)}
                              className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 ml-1"
                              title="Supprimer cet exercice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {currentProgramForSession && currentProgramForSession.days.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cfgId = sessionExercises[idx].id;
                                  setMoveFromDayId(editingSessionId || currentProgramForSession.days[0]?.id);
                                  setMoveFromCfgId(cfgId);
                                  setMoveToDayId('');
                                }}
                                data-testid="exercise-move-to-day"
                                className="p-1 rounded-lg text-zinc-500 hover:text-sky-400 ml-1"
                                title="Déplacer vers une autre séance"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* LOT D — real exercise replacement (only meaningful on a persisted slot) */}
                            {editingSessionId && (
                              <button
                                type="button"
                                onClick={() =>
                                  replaceCfgIndex === idx ? closeReplacePanel() : openReplacePanel(idx)
                                }
                                data-testid="exercise-replace"
                                aria-expanded={replaceCfgIndex === idx}
                                aria-label={`Remplacer l'exercice ${exCfg.exerciseName}`}
                                title="Remplacer cet exercice (configuration conservée)"
                                className={`ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  replaceCfgIndex === idx
                                    ? 'bg-violet-500/25 text-violet-200'
                                    : 'text-zinc-500 hover:bg-violet-500/15 hover:text-violet-300'
                                }`}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Exercise Parameters Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Séries</label>
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={exCfg.sets}
                              onChange={(e) =>
                                handleUpdateSets(idx, Number(e.target.value))
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white text-center"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Mode & objectif par série</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="grid grid-cols-2 gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExerciseParam(idx, 'mode', 'reps')}
                                  className={`rounded-xl px-2 py-1 text-[10px] font-bold border ${exCfg.mode !== 'timer' ? 'bg-violet-600/30 text-violet-200 border-violet-500/50' : 'bg-black/40 text-zinc-400 border-white/10'}`}
                                >
                                  <Repeat className="inline w-3 h-3 mr-1" />Reps
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExerciseParam(idx, 'mode', 'timer')}
                                  className={`rounded-xl px-2 py-1 text-[10px] font-bold border ${exCfg.mode === 'timer' ? 'bg-violet-600/30 text-violet-200 border-violet-500/50' : 'bg-black/40 text-zinc-400 border-white/10'}`}
                                >
                                  <Timer className="inline w-3 h-3 mr-1" />Timer
                                </button>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {exCfg.mode === 'timer'
                                  ? getDurationPlan(exCfg).map((dur, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-0.5" title={`Série ${sIdx + 1} — durée (sec)`}>
                                        <span className="text-[9px] text-zinc-500 w-3 text-right">{sIdx + 1}</span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={3600}
                                          step={1}
                                          value={dur}
                                          onChange={(e) => handleUpdatePlanValue(idx, sIdx, 'durationPlan', Number(e.target.value) || 0)}
                                          className="w-12 bg-black/40 border border-white/10 rounded-xl px-1 py-1 text-xs text-white text-center"
                                        />
                                      </div>
                                    ))
                                  : getRepsPlan(exCfg).map((rep, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-0.5" title={`Série ${sIdx + 1} — répétitions`}>
                                        <span className="text-[9px] text-zinc-500 w-3 text-right">{sIdx + 1}</span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={1000}
                                          step={1}
                                          value={rep}
                                          onChange={(e) => handleUpdatePlanValue(idx, sIdx, 'repsPlan', Number(e.target.value) || 0)}
                                          className="w-12 bg-black/40 border border-white/10 rounded-xl px-1 py-1 text-xs text-white text-center"
                                        />
                                      </div>
                                    ))}
                              </div>
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-1">
                              {exCfg.mode === 'timer' ? (
                                <span>
                                  Série N → durée (sec). Répétitions conservées indépendamment.
                                </span>
                              ) : (
                                <span>
                                  Série N → répétitions. Durée Timer conservée indépendamment.
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-0.5 flex items-center justify-between">
                              Poids cible (kg)
                              <button
                                type="button"
                                onClick={() => handleOpenOneRMModal(getExerciseObj(exCfg.exerciseId)!, exCfg, 'percentage')}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 text-zinc-400 hover:text-violet-400 transition-colors"
                                aria-label="Calculateur 1RM"
                                title="Calculateur 1RM"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                              </button>
                            </label>
                            <input
                              type="number"
                              step={0.5}
                              min={0}
                              value={exCfg.targetWeightKg}
                              onChange={(e) =>
                                handleUpdateExerciseParam(idx, 'targetWeightKg', Number(e.target.value))
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white text-center"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Repos entre séries</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={Number.isFinite(exCfg.restSec) && exCfg.restSec >= 0 ? exCfg.restSec : ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  handleUpdateExerciseParam(
                                    idx,
                                    'restSec',
                                    v === '' ? 0 : Math.max(0, Math.round(Number(v) || 0))
                                  );
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white text-center"
                              />
                              <span className="text-[10px] text-zinc-500 shrink-0">secondes</span>
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-1">Entre chaque série de cet exercice (ex. 20 s).</div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-zinc-400 mb-0.5">Repos après l'exercice</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={Number.isFinite(exCfg.transitionRestSec) && (exCfg.transitionRestSec ?? 0) >= 0
                                  ? exCfg.transitionRestSec
                                  : globalTransitionRestSec}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  handleUpdateExerciseParam(
                                    idx,
                                    'transitionRestSec',
                                    v === '' ? undefined : Math.max(0, Math.round(Number(v) || 0))
                                  );
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white text-center"
                              />
                              <span className="text-[10px] text-zinc-500 shrink-0">secondes</span>
                            </div>
                            <div className="text-[9px] text-zinc-500 mt-1">Récupération avant l'exercice suivant. 0 = aucun repos.</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Cross-day exercise move panel */}
                  {moveFromCfgId && currentProgramForSession && (
                    <div
                      className="rounded-2xl bg-sky-950/30 border border-sky-500/30 p-4 space-y-3"
                      data-testid="exercise-move-panel"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                          <MoveRight className="w-3.5 h-3.5" />
                          <span>Déplacer l'exercice vers une autre séance</span>
                        </span>
                        <button
                          type="button"
                          onClick={resetMoveState}
                          className="text-zinc-400 hover:text-white p-1"
                          data-testid="exercise-move-cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        La configuration complète (séries, reps/timer, plans par série, poids, repos) sera conservée.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentProgramForSession.days
                          .filter((d) => d.id !== moveFromDayId)
                          .map((targetDay, tdIdx) => (
                            <button
                              key={targetDay.id}
                              type="button"
                              onClick={() => setMoveToDayId(targetDay.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                moveToDayId === targetDay.id
                                  ? 'bg-sky-600/40 text-sky-100 border-sky-500/60'
                                  : 'bg-black/30 text-zinc-300 border-white/10 hover:border-sky-500/40'
                              }`}
                              data-testid={`exercise-move-target-${tdIdx}`}
                            >
                              {targetDay.name || `Jour ${tdIdx + 1}`}
                            </button>
                          ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleMoveExerciseToDay(currentProgramForSession);
                            setIsSessionModalOpen(false);
                            setSessionExercises([]);
                          }}
                          disabled={!moveToDayId}
                          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-40 transition-all"
                          data-testid="exercise-move-confirm"
                        >
                          <Check className="inline w-3.5 h-3.5 mr-1" />
                          Déplacer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* LOT D — replacement feedback: exactly what was kept, and what changed */}
                  {replaceOutcome && (
                    <div
                      className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3 space-y-1"
                      data-testid="replace-outcome"
                      role="status"
                    >
                      <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {replaceOutcome.previousName} → {replaceOutcome.nextName}
                      </p>
                      <p className="text-[11px] text-zinc-300">
                        Conservé : {replaceOutcome.preservedFields.join(', ')}.
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {replaceOutcome.modeChanged
                          ? `Mode ${replaceOutcome.modeBefore === 'reps' ? 'Répétitions' : 'Minuteur'} → ${replaceOutcome.modeAfter === 'reps' ? 'Répétitions' : 'Minuteur'} — nouvelle cible ${replaceOutcome.activeTarget} ${
                              replaceOutcome.modeAfter === 'timer' ? 's' : 'reps'
                            } (défaut de l'exercice, sans conversion).`
                          : `Mode inchangé (${
                              replaceOutcome.modeBefore === 'reps' ? 'Répétitions' : 'Minuteur'
                            }) — objectif par série conservé : ${replaceOutcome.activeTarget} ${
                              replaceOutcome.modeBefore === 'reps' ? 'reps' : 's'
                            }.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplaceOutcome(null)}
                        data-testid="replace-outcome-close"
                        aria-label="Masquer le résumé du remplacement"
                        className="text-zinc-400 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* LOT D — replacement panel: metadata suggestions + explicit mode choice */}
                  {replaceCfgIndex != null && replaceConfig && (
                    <div
                      className="rounded-2xl bg-violet-950/30 border border-violet-500/30 p-4 space-y-3"
                      data-testid="replace-panel"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Remplacer « {replaceConfig.exerciseName} »</span>
                          </span>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Suggestions classées à partir des métadonnées de la bibliothèque (muscle, partie du
                            corps, matériel, difficulté, mode). La configuration est conservée.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeReplacePanel}
                          data-testid="replace-cancel"
                          aria-label="Fermer le remplacement d'exercice"
                          className="text-zinc-400 hover:text-white p-1 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {replaceSuggestions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="replace-suggestions">
                          {replaceSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.exercise.id}
                              type="button"
                              onClick={() => chooseReplacement(suggestion.exercise)}
                              data-testid={`replace-suggestion-${suggestion.exercise.id}`}
                              className="text-left bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 rounded-xl p-2.5 transition-all space-y-1"
                            >
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white">
                                  {suggestion.exercise.name}
                                </span>
                                <span className="text-[10px] bg-violet-600/30 text-violet-200 px-1.5 py-0.5 rounded">
                                  {suggestion.exercise.primaryMuscle}
                                </span>
                                {suggestion.sameMode && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                                    Mode compatible
                                  </span>
                                )}
                                {suggestion.alreadyInDay && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                                    Déjà dans la séance
                                  </span>
                                )}
                              </span>
                              <span className="block text-[10px] text-zinc-400">
                                <Lightbulb className="inline w-3 h-3 mr-0.5" />
                                {suggestion.reasons.slice(0, 3).join(' · ')}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400">
                          Aucune suggestion automatique — choisissez un exercice dans la bibliothèque ci-dessous.
                        </p>
                      )}

                      {/* Explicit REPS <-> TIMER decision: no automatic conversion */}
                      {replacePending && (
                        <div
                          className="rounded-xl bg-black/40 border border-amber-500/40 p-3 space-y-2"
                          data-testid="replace-mode-choice"
                          role="group"
                          aria-label="Choix du mode après remplacement"
                        >
                          <p className="text-[11px] font-semibold text-amber-200">
                            « {replacePending.name} » se fait normalement en{' '}
                            {getExerciseNaturalMode(replacePending) === 'timer' ? 'minuteur' : 'répétitions'},
                            alors que la configuration est en{' '}
                            {replaceConfig.mode === 'timer' ? 'minuteur' : 'répétitions'}.
                          </p>
                          <p className="text-[11px] text-zinc-300">
                            Aucune conversion automatique : choisissez explicitement ce que vous conservez.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => applyExerciseReplacement(replacePending, 'keep')}
                              data-testid="replace-keep-mode"
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-100 border border-emerald-500/40 text-[11px] font-semibold text-left"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              Garder{' '}
                              {replaceConfig.mode === 'timer' ? 'le minuteur' : 'les répétitions'} — configuration
                              intégralement conservée
                            </button>
                            <button
                              type="button"
                              onClick={() => applyExerciseReplacement(replacePending, 'adopt')}
                              data-testid="replace-adopt-mode"
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 border border-amber-500/40 text-[11px] font-semibold text-left"
                            >
                              {getExerciseNaturalMode(replacePending) === 'timer' ? (
                                <Timer className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Repeat className="w-3.5 h-3.5 shrink-0" />
                              )}
                              Passer en{' '}
                              {getExerciseNaturalMode(replacePending) === 'timer' ? 'minuteur' : 'répétitions'} —
                              cible = défaut de l'exercice
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Fallback: whole library, searched by name or muscle */}
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <label
                          htmlFor="replace-search"
                          className="block text-[10px] font-semibold text-zinc-400"
                        >
                          Autre exercice de la bibliothèque
                        </label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="replace-search"
                            type="text"
                            value={replaceSearch}
                            onChange={(e) => setReplaceSearch(e.target.value)}
                            placeholder="Rechercher par nom ou muscle..."
                            data-testid="replace-search"
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {replaceLibraryResults.map((ex) => (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => chooseReplacement(ex)}
                              data-testid={`replace-option-${ex.id}`}
                              className="w-full text-left bg-white/5 hover:bg-violet-600/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 flex items-center justify-between gap-2 transition-all"
                            >
                              <span className="truncate">
                                {ex.name}
                                <span className="text-zinc-500"> · {ex.equipment}</span>
                              </span>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {ex.primaryMuscle}
                              </span>
                            </button>
                          ))}
                          {replaceLibraryResults.length === 0 && (
                            <p className="text-[11px] text-zinc-500">Aucun exercice trouvé.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {sessionExercises.length === 0 && (
                    <div className="text-center py-8 bg-black/20 border border-dashed border-white/10 rounded-2xl space-y-2">
                      <p className="text-xs text-zinc-400">Aucun exercice dans cette séance.</p>
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        className="text-xs text-violet-400 hover:text-violet-300 font-semibold underline"
                      >
                        Sélectionner des exercices dans la bibliothèque
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* End of Session Stretches Configuration */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span>Étirements de fin de séance ({sessionStretches.length})</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Routines recommandées pour la récupération active et le relâchement musculaire.
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSessionStretches([...CORE_STRETCHES])}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 transition-colors"
                    >
                      Core (Abdos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionStretches([...LOWER_BODY_STRETCHES])}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 transition-colors"
                    >
                      Bas du corps
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionStretches([...UPPER_BODY_STRETCHES])}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 transition-colors"
                    >
                      Haut du corps
                    </button>
                  </div>
                </div>

                {/* Stretches List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sessionStretches.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="bg-black/30 border border-violet-500/20 rounded-xl p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-violet-400 font-mono">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-white truncate">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Zone : <span className="text-zinc-300 font-medium">{s.targetArea}</span> • {s.durationSec}s {s.hasSides ? '/côté' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
              <span className="text-xs text-zinc-400">
                {sessionExercises.length} exercices configurés
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  data-testid="session-save"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl transition-all shadow-md"
                >
                  {editingSessionId ? 'Enregistrer la séance' : 'Créer la séance'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= EXERCISE PICKER MODAL ================= */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="bg-[#151420] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-violet-400" />
                <span>Sélectionner un exercice à ajouter</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and muscle filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Rechercher par nom ou muscle..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos', 'Full Body'].map(
                  (mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setPickerMuscle(mg)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold shrink-0 transition-all ${
                        pickerMuscle === mg
                          ? 'bg-violet-600 text-white'
                          : 'bg-black/30 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mg}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Exercise List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1 max-h-[50vh]">
              {filteredPickerExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleAddExerciseToSession(ex)}
                  className="bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{ex.name}</span>
                      <span className="text-[10px] bg-violet-600/30 text-violet-200 px-2 py-0.5 rounded-md">
                        {ex.primaryMuscle}
                      </span>
                      <span className="text-[10px] text-zinc-400">{ex.equipment}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{ex.description}</p>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOT E.1 — 1RM Calculator Modal */}
      {oneRMModalOpen && oneRMModalExercise && (
        <OneRMModal
          isOpen={oneRMModalOpen}
          onClose={() => {
            setOneRMModalOpen(false);
            setOneRMModalConfig(null);
          }}
          initialMode={oneRMModalMode}
          onApplyWeight={handleOneRMApply}
          applyLabel="Appliquer au poids cible"
        />
      )}
    </div>
  );
};
