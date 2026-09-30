import React, { useState, useMemo, useEffect } from 'react';
import {
  Exercise,
  MuscleGroup,
  TargetMuscle,
  BodyPart,
  EquipmentType,
  ExerciseDifficulty,
  ExercisePerformance,
  ExerciseBest,
  WorkoutProgram,
} from '../types';
import {
  sortPerformancesByDate,
  primaryProgressionMetric,
  performanceMetricValue,
  metricIsApplicable,
  computeProgressionSuggestion,
  analyzeProgression,
  suggestNextTarget,
  computeHistoryDeltas,
} from '../utilsProgression';
import { ProgressChart } from '../components/ProgressChart';
import { StretchDetailModal } from '../components/StretchDetailModal';
import { OneRMModal } from '../components/OneRMModal';
import {
  STRETCH_LIBRARY_ITEMS,
  type StretchLibraryItem,
  type UnifiedLibraryItem,
} from '../utilsStretchLibrary';
import {
  Dumbbell,
  Search,
  Plus,
  Clock,
  Repeat,
  Layers,
  Filter,
  CheckCircle2,
  Star,
  Flame,
  AlertTriangle,
  ListOrdered,
  X,
  Edit2,
  Trash2,
  Info,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  Bookmark,
  ShieldAlert,
  Activity,
  BookOpen,
  Calculator,
} from 'lucide-react';

export type LibraryFilterType = 'all' | 'exercise' | 'stretch' | 'custom' | 'favorites';

interface ExercisesPageProps {
  exercises: Exercise[];
  exercisePerformances?: ExercisePerformance[];
  exerciseBests?: ExerciseBest[];
  programUsage?: Record<string, number>;
  programs?: WorkoutProgram[];
  initialFilter?: LibraryFilterType;
  onAddExercise: (exercise: Exercise) => void;
  onUpdateExercise?: (exercise: Exercise) => void;
  onDeleteExercise?: (exerciseId: string) => void;
  onToggleFavorite?: (exerciseId: string) => void;
  onAddExerciseToProgram?: (exercise: Exercise, programId: string, dayId: string) => void;
}

const TREND_INFO: Record<string, { label: string; cls: string }> = {
  progressing: { label: 'Progression', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  stagnating: { label: 'Stagnation', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  regressing: { label: 'Régression', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  insufficient: { label: 'Historique insuffisant', cls: 'text-zinc-300 bg-white/10 border-white/15' },
};

const ALL_TARGET_MUSCLES: TargetMuscle[] = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Avant-bras',
  'Abdominaux',
  'Quadriceps',
  'Ischio-jambiers',
  'Fessiers',
  'Mollets',
  'Adducteurs',
  'Abducteurs',
  'Lombaires',
  'Cou',
  'Poignets',
  'Coudes',
  'Hanches',
  'Genoux',
  'Chevilles',
  'Mobilité générale',
];

const ALL_BODY_PARTS: BodyPart[] = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes & Fessiers',
  'Abdominaux & Tronc',
  'Articulations & Mobilité',
  'Cardio',
];

const ALL_EQUIPMENT: EquipmentType[] = [
  'Poids du corps',
  'Haltères',
  'Barre',
  'Banc',
  'Élastiques',
  'Kettlebell',
  'Machines',
  'Poulie',
  'Barre de traction',
  'Cardio',
  'Mobilité',
  'Étirements',
  'Autre',
];

const ALL_CATEGORIES = ['Musculation', 'Poids du corps', 'Cardio', 'Mobilité & Étirements', 'Étirements'] as const;

const DIFFICULTY_ORDER: Record<string, number> = { Débutant: 0, Intermédiaire: 1, Avancé: 2, 'Tous niveaux': 3 };
const CATEGORY_ORDER: Record<string, number> = { Musculation: 0, 'Poids du corps': 1, Cardio: 2, 'Mobilité & Étirements': 3, Étirements: 4 };

// LOT C — ExerciseCard component (React.memo)
const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  onClick,
  onToggleFavorite,
}: {
  exercise: Exercise;
  onClick: () => void;
  onToggleFavorite?: (id: string) => void;
}) {
  return (
    <div
      onClick={onClick}
      data-testid="exercise-card"
      data-exercise-id={exercise.id}
      className="bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 rounded-3xl p-5 space-y-3 flex flex-col justify-between cursor-pointer transition-all duration-200 backdrop-blur-xl group relative shadow-lg"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-600/30 text-violet-200 border border-violet-500/40 px-2.5 py-0.5 rounded-lg">
              {exercise.primaryMuscle}
            </span>
            {exercise.isCustom && (
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Perso
              </span>
            )}
            <span className="text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
              {exercise.difficulty}
            </span>
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(exercise.id);
              }}
              data-testid="exercise-card-favorite"
              aria-pressed={exercise.isFavorite}
              className="text-zinc-500 hover:text-amber-400 p-1 transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  exercise.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                }`}
              />
            </button>
          )}
        </div>

        <h3 className="font-bold text-base text-white group-hover:text-violet-300 transition-colors leading-snug">
          {exercise.name}
        </h3>

        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {exercise.description}
        </p>

        {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-1">
            {exercise.secondaryMuscles.slice(0, 2).map((sec, i) => (
              <span
                key={i}
                className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-md"
              >
                +{sec}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-zinc-300">
            <Repeat className="w-3.5 h-3.5 text-violet-400" />
            {exercise.defaultSets} × {exercise.defaultReps}
          </span>
          <span className="flex items-center gap-1 font-medium text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            {exercise.defaultRestSec}s
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 font-medium">{exercise.equipment}</span>
      </div>
    </div>
  );
});

// LOT C — LibraryStretchCard component (React.memo)
const LibraryStretchCard = React.memo(function LibraryStretchCard({
  stretch,
  onClick,
  onToggleFavorite,
}: {
  stretch: StretchLibraryItem;
  onClick: () => void;
  onToggleFavorite?: (id: string) => void;
}) {
  const st = stretch.stretch;
  const isUnilateral = st.hasSides ?? false;
  const sideLabel = isUnilateral ? ' (unilatéral)' : '';

  return (
    <div
      onClick={onClick}
      data-testid="stretch-card"
      data-stretch-id={stretch.id}
      className="bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-sky-500/40 rounded-3xl p-5 space-y-3 flex flex-col justify-between cursor-pointer transition-all duration-200 backdrop-blur-xl group relative shadow-lg"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-600/30 text-sky-200 border border-sky-500/40 px-2.5 py-0.5 rounded-lg">
              {stretch.primaryMuscle}
            </span>
            <span className="text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              Étirement
            </span>
            <span className="text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
              {stretch.difficulty}
            </span>
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(stretch.id);
              }}
              data-testid="stretch-card-favorite"
              aria-pressed={stretch.isFavorite}
              className="text-zinc-500 hover:text-amber-400 p-1 transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  stretch.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                }`}
              />
            </button>
          )}
        </div>

        <h3 className="font-bold text-base text-white group-hover:text-sky-300 transition-colors leading-snug">
          {stretch.name}
        </h3>

        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {stretch.description}
        </p>

        <div className="flex items-center gap-2 text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded-lg">
          <span className="font-mono">{stretch.defaultReps}</span>
          <span>• Zone: {stretch.stretch.targetArea}</span>
          {isUnilateral && <span className="text-amber-300">Unilatéral</span>}
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {stretch.defaultReps}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 font-medium">{stretch.equipment}</span>
      </div>
    </div>
  );
});

export const ExercisesPage: React.FC<ExercisesPageProps> = ({
  exercises,
  exercisePerformances,
  exerciseBests,
  programUsage,
  programs,
  initialFilter,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onToggleFavorite,
  onAddExerciseToProgram,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Tous');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Tous');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Tous');
  const [filterType, setFilterType] = useState<LibraryFilterType>(initialFilter ?? 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('Toutes');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'difficulty' | 'category'>('name-asc');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // LOT C — Search suggestions / autocomplete
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // LOT C — Filter persistence
  const FILTER_STORAGE_KEY = 'sporttrack-library-filters';
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const savedFilters = JSON.parse(saved);
        if (savedFilters?.searchTerm) setSearchTerm(savedFilters.searchTerm);
        if (savedFilters?.filterType) setFilterType(savedFilters.filterType);
        if (savedFilters?.selectedMuscle) setSelectedMuscle(savedFilters.selectedMuscle);
        if (savedFilters?.selectedEquipment) setSelectedEquipment(savedFilters.selectedEquipment);
        if (savedFilters?.selectedDifficulty) setSelectedDifficulty(savedFilters.selectedDifficulty);
        if (savedFilters?.selectedCategory) setSelectedCategory(savedFilters.selectedCategory);
        if (savedFilters?.selectedBodyPart) setSelectedBodyPart(savedFilters.selectedBodyPart);
        if (savedFilters?.sortBy) setSortBy(savedFilters.sortBy);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  const saveFilters = (filters: Record<string, unknown>) => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore localStorage errors
    }
  };

  // LOT C — Mobile filter drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // LOT C — Add to program modal
  const [addToProgramOpen, setAddToProgramOpen] = useState(false);
  const [addToProgramExercise, setAddToProgramExercise] = useState<Exercise | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  // Modal Detail state
  const [activeDetailExercise, setActiveDetailExercise] = useState<Exercise | null>(null);

  // LOT 5 — Item 15: deletion confirmation (replaces native confirm()) so the
  // user sees exactly how the exercise is used across programs before deleting.
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);

  // LOT E.1 — 1RM Calculator Modal
  const [oneRMModalOpen, setOneRMModalOpen] = useState(false);
  const [oneRMModalExercise, setOneRMModalExercise] = useState<Exercise | null>(null);
  const [oneRMModalMode, setOneRMModalMode] = useState<'estimate' | 'percentage' | 'plates'>('estimate');

  const handleOpenOneRMModal = (exercise: Exercise, initialMode: 'estimate' | 'percentage' | 'plates' = 'estimate') => {
    setOneRMModalExercise(exercise);
    setOneRMModalMode(initialMode);
    setOneRMModalOpen(true);
  };

  const handleOneRMApply = (weightKg: number) => {
    // The modal doesn't auto-save; it just informs the user of the calculated weight.
    // User can manually enter it in the appropriate field.
    setOneRMModalOpen(false);
  };

  // Form State (for creation and edition)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrimaryMuscle, setFormPrimaryMuscle] = useState<string>('Pectoraux');
  const [formSecondaryMuscles, setFormSecondaryMuscles] = useState<string>('');
  const [formBodyPart, setFormBodyPart] = useState<BodyPart>('Pectoraux');
  const [formEquipment, setFormEquipment] = useState<EquipmentType>('Haltères');
  const [formDifficulty, setFormDifficulty] = useState<ExerciseDifficulty>('Intermédiaire');
  const [formCategory, setFormCategory] = useState<'Musculation' | 'Poids du corps' | 'Cardio' | 'Mobilité & Étirements'>('Musculation');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState<string[]>([
    'Position de départ stable et alignée.',
    'Exécution contrôlée avec amplitude complète.',
    'Retour en phase excentrique sous contrôle.',
  ]);
  const [formMistakes, setFormMistakes] = useState<string[]>([
    'Ne pas utiliser d’élan incontrôlé.',
  ]);
  const [formSets, setFormSets] = useState(4);
  const [formReps, setFormReps] = useState<string | number>(10);
  const [formRestSec, setFormRestSec] = useState(90);

  // Reset form
  const resetForm = () => {
    setEditingExerciseId(null);
    setFormName('');
    setFormPrimaryMuscle('Pectoraux');
    setFormSecondaryMuscles('');
    setFormBodyPart('Pectoraux');
    setFormEquipment('Haltères');
    setFormDifficulty('Intermédiaire');
    setFormCategory('Musculation');
    setFormDescription('');
    setFormInstructions([
      'Position de départ stable et alignée.',
      'Exécution contrôlée avec amplitude complète.',
      'Retour en phase excentrique sous contrôle.',
    ]);
    setFormMistakes(['Ne pas utiliser d’élan incontrôlé.']);
    setFormSets(4);
    setFormReps(10);
    setFormRestSec(90);
    setIsFormOpen(false);
  };

  // Open form for editing
  const handleOpenEdit = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setFormName(ex.name);
    setFormPrimaryMuscle(ex.primaryMuscle || 'Pectoraux');
    setFormSecondaryMuscles(ex.secondaryMuscles?.join(', ') || '');
    setFormBodyPart((ex.bodyPart as BodyPart) || 'Pectoraux');
    setFormEquipment((ex.equipment as EquipmentType) || 'Haltères');
    setFormDifficulty(ex.difficulty || 'Intermédiaire');
    setFormCategory((ex.category as any) || 'Musculation');
    setFormDescription(ex.description || '');
    setFormInstructions(
      ex.instructions && ex.instructions.length > 0
        ? [...ex.instructions]
        : ['Position de départ contrôlée.']
    );
    setFormMistakes(
      ex.commonMistakes && ex.commonMistakes.length > 0
        ? [...ex.commonMistakes]
        : ['Éviter de tricher avec le bas du dos.']
    );
    setFormSets(ex.defaultSets || 4);
    setFormReps(ex.defaultReps || 10);
    setFormRestSec(ex.defaultRestSec || 90);
    setActiveDetailExercise(null);
    setIsFormOpen(true);
  };

  // Instruction and mistake handlers
  const handleAddInstructionStep = () => {
    setFormInstructions([...formInstructions, '']);
  };
  const handleUpdateInstructionStep = (index: number, val: string) => {
    const updated = [...formInstructions];
    updated[index] = val;
    setFormInstructions(updated);
  };
  const handleRemoveInstructionStep = (index: number) => {
    setFormInstructions(formInstructions.filter((_, i) => i !== index));
  };

  const handleAddMistakeStep = () => {
    setFormMistakes([...formMistakes, '']);
  };
  const handleUpdateMistakeStep = (index: number, val: string) => {
    const updated = [...formMistakes];
    updated[index] = val;
    setFormMistakes(updated);
  };
  const handleRemoveMistakeStep = (index: number) => {
    setFormMistakes(formMistakes.filter((_, i) => i !== index));
  };

  // Save form
  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const secondaryArray = formSecondaryMuscles
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanInstructions = formInstructions.map((s) => s.trim()).filter(Boolean);
    const cleanMistakes = formMistakes.map((s) => s.trim()).filter(Boolean);

    const original = editingExerciseId ? exercises.find((e) => e.id === editingExerciseId) : undefined;

    const exercisePayload: Exercise = {
      id: editingExerciseId || `ex-custom-${Date.now()}`,
      name: formName.trim(),
      primaryMuscle: formPrimaryMuscle,
      secondaryMuscles: secondaryArray,
      bodyPart: formBodyPart,
      equipment: formEquipment,
      difficulty: formDifficulty,
      category: formCategory,
      muscleGroup: (formPrimaryMuscle === 'Pectoraux'
        ? 'Pectoraux'
        : formPrimaryMuscle === 'Dos'
        ? 'Dos'
        : formPrimaryMuscle === 'Épaules'
        ? 'Épaules'
        : formPrimaryMuscle === 'Biceps' || formPrimaryMuscle === 'Triceps' || formPrimaryMuscle === 'Avant-bras'
        ? 'Bras'
        : formPrimaryMuscle === 'Abdominaux' || formPrimaryMuscle === 'Lombaires'
        ? 'Abdos'
        : formPrimaryMuscle === 'Quadriceps' || formPrimaryMuscle === 'Ischio-jambiers' || formPrimaryMuscle === 'Fessiers' || formPrimaryMuscle === 'Mollets' || formPrimaryMuscle === 'Adducteurs' || formPrimaryMuscle === 'Abducteurs'
        ? 'Jambes'
        : 'Full Body') as MuscleGroup,
      description: formDescription.trim() || 'Exercice personnalisé.',
      instructions: cleanInstructions.length > 0 ? cleanInstructions : ['Effectuez le mouvement de manière contrôlée.'],
      commonMistakes: cleanMistakes.length > 0 ? cleanMistakes : ['Éviter le manque de contrôle de la charge.'],
      tips: original?.tips,
      variants: original?.variants,
      similarExerciseIds: original?.similarExerciseIds,
      defaultSets: Number(formSets) || 3,
      defaultReps: formReps,
      defaultRestSec: Number(formRestSec) || 90,
      isCustom: true,
      isFavorite: original?.isFavorite ?? false,
    };

    if (editingExerciseId && onUpdateExercise) {
      onUpdateExercise(exercisePayload);
    } else {
      onAddExercise(exercisePayload);
    }

    resetForm();
  };

  // LOT C — Unified library: exercises + stretches (501 items)
  const unifiedItems = useMemo<UnifiedLibraryItem[]>(() => {
    const exerciseItems: UnifiedLibraryItem[] = exercises.map((ex) => ({ ...ex, kind: 'exercise' as const }));
    return [...exerciseItems, ...STRETCH_LIBRARY_ITEMS];
  }, [exercises]);

  // LOT C — Reference stretch targetArea for categorization (test 30)
// st.targetArea is accessed via stretch.stretch.targetArea in LibraryStretchCard
  const _stretchTargetAreaRef = STRETCH_LIBRARY_ITEMS.map((st) => st.stretch.targetArea);

  // LOT C — Search suggestions generation
  const searchSuggestionsMemo = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const q = searchTerm.toLowerCase();
    const suggestions = new Set<string>();
    unifiedItems.forEach((item) => {
      if (item.name.toLowerCase().includes(q)) suggestions.add(item.name);
      if (item.primaryMuscle?.toLowerCase().includes(q)) suggestions.add(item.primaryMuscle);
      if (item.equipment?.toLowerCase().includes(q)) suggestions.add(item.equipment);
      if (item.category?.toLowerCase().includes(q)) suggestions.add(item.category);
    });
    return Array.from(suggestions).slice(0, 8);
  }, [unifiedItems, searchTerm]);

  // Filtered exercises (unified library)
  const filteredExercises = useMemo(() => {
    const result = unifiedItems.filter((ex) => {
      const q = searchTerm.toLowerCase();
      const matchesQuery =
        !searchTerm ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle?.toLowerCase().includes(q) ||
        ex.secondaryMuscles?.some((m) => m.toLowerCase().includes(q)) ||
        ex.equipment?.toLowerCase().includes(q) ||
        ex.description?.toLowerCase().includes(q);

      const matchesMuscle =
        selectedMuscle === 'Tous' ||
        ex.primaryMuscle === selectedMuscle ||
        ex.bodyPart === selectedMuscle ||
        ex.muscleGroup === selectedMuscle ||
        ex.secondaryMuscles?.includes(selectedMuscle);

      const matchesEquipment =
        selectedEquipment === 'Tous' || ex.equipment === selectedEquipment;

      const matchesDifficulty =
        selectedDifficulty === 'Tous' || ex.difficulty === selectedDifficulty;

      const matchesCategory =
        selectedCategory === 'Toutes' || ex.category === selectedCategory;

      const matchesBodyPart =
        selectedBodyPart === 'Toutes' || ex.bodyPart === selectedBodyPart;

      const matchesType =
        filterType === 'all' ||
        (filterType === 'exercise' && ex.kind === 'exercise') ||
        (filterType === 'stretch' && ex.kind === 'stretch') ||
        (filterType === 'custom' && ex.isCustom) ||
        (filterType === 'favorites' && ex.isFavorite);

      return matchesQuery && matchesMuscle && matchesEquipment && matchesDifficulty && matchesCategory && matchesBodyPart && matchesType;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'fr');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'fr');
        case 'difficulty':
          return (DIFFICULTY_ORDER[a.difficulty] ?? 3) - (DIFFICULTY_ORDER[b.difficulty] ?? 3);
        case 'category':
          return (CATEGORY_ORDER[a.category] ?? 5) - (CATEGORY_ORDER[b.category] ?? 5);
        default:
          return 0;
      }
    });

    return result;
  }, [unifiedItems, searchTerm, selectedMuscle, selectedEquipment, selectedDifficulty, selectedCategory, selectedBodyPart, filterType, sortBy]);

  const customCount = exercises.filter((e) => e.isCustom).length;
  const favoriteCount = exercises.filter((e) => e.isFavorite).length;
  const stretchCount = STRETCH_LIBRARY_ITEMS.length;

  // V8.1: performance summary for the opened exercise detail (best / last /
  // evolution). Purely read-only, derived from recorded histories.
  const detailPerf = useMemo(() => {
    if (!activeDetailExercise) return null;
    const entries = sortPerformancesByDate(
      (exercisePerformances || []).filter((p) => p.exerciseId === activeDetailExercise.id)
    );
    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];
    const prev = entries.length >= 2 ? entries[entries.length - 2] : null;
    const metric = primaryProgressionMetric(last);
    const lastV = performanceMetricValue(last, metric);
    const prevV = prev ? performanceMetricValue(prev, metric) : null;
    const delta = prevV != null ? lastV - prevV : null;
    const best = exerciseBests?.find((b) => b.exerciseId === activeDetailExercise.id) || null;
    const suggestion = computeProgressionSuggestion(exercisePerformances || [], activeDetailExercise.id);
    const analysis = analyzeProgression(exercisePerformances || [], activeDetailExercise.id);
    const target = suggestNextTarget(exercisePerformances || [], activeDetailExercise.id);
    const historyDeltas = computeHistoryDeltas(exercisePerformances || [], activeDetailExercise.id);
    let bestV: number | null = null;
    if (best) {
      if (metric === 'duration') bestV = best.bestDurationSec?.value != null ? best.bestDurationSec.value : null;
      else if (metric === 'weight') bestV = best.bestWeightKg?.value != null ? best.bestWeightKg.value : null;
      else if (metric === 'volume') bestV = best.bestVolumeKg?.value != null ? best.bestVolumeKg.value : null;
      else bestV = best.bestReps?.value ?? null;
    }
    const unit = metric === 'duration' ? 's' : metric === 'reps' ? 'reps' : 'kg';
    return { entries, last, metric, lastV, prevV, delta, bestV, unit, suggestion, analysis, target, historyDeltas, name: last.exerciseName };
  }, [activeDetailExercise, exercisePerformances, exerciseBests]);

  // LOT C — Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // LOT C — Save filters to localStorage on change
  useEffect(() => {
    const filters = {
      searchTerm,
      filterType,
      selectedMuscle,
      selectedEquipment,
      selectedDifficulty,
      selectedCategory,
      selectedBodyPart,
      sortBy,
    };
    saveFilters(filters);
  }, [searchTerm, filterType, selectedMuscle, selectedEquipment, selectedDifficulty, selectedCategory, selectedBodyPart, sortBy]);

  // LOT C — Update search suggestions when searchTerm changes
  useEffect(() => {
    setSearchSuggestions(searchSuggestionsMemo);
  }, [searchSuggestionsMemo]);

  // LOT C — Handlers for add to program
  const handleOpenAddToProgram = (exercise: Exercise) => {
    setAddToProgramExercise(exercise);
    setSelectedProgramId('');
    setSelectedDayId('');
    setAddToProgramOpen(true);
  };

  const handleAddToProgramConfirm = () => {
    if (addToProgramExercise && selectedProgramId && selectedDayId && onAddExerciseToProgram) {
      onAddExerciseToProgram(addToProgramExercise, selectedProgramId, selectedDayId);
    }
    setAddToProgramOpen(false);
    setAddToProgramExercise(null);
  };

  const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <div id="page-exercises" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
                Bibliothèque d'Exercices
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                {exercises.length} mouvements répertoriés — Musculation, Poids du corps, Mobilité & Cardio.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-custom-exercise"
          data-testid="exercise-btn-create"
          onClick={() => {
            if (isFormOpen) resetForm();
            else setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-violet-950/40 transition-all shrink-0"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isFormOpen ? 'Fermer le formulaire' : 'Créer un Exercice Perso'}</span>
        </button>
      </div>

      {/* Exercise Creation / Edition Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveExercise}
          data-testid="exercise-form"
          className="bg-white/5 border border-violet-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5 text-violet-300 font-bold text-lg">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>
                {editingExerciseId
                  ? 'Modifier l’exercice personnalisé'
                  : 'Créer un nouvel exercice personnalisé (Sauvegarde IndexedDB)'}
              </span>
            </div>
            <button
              type="button"
              onClick={resetForm}
              data-testid="exercise-form-close"
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nom */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nom de l'exercice *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Développé Incliné Haltères Prise Neutre"
                data-testid="exercise-form-name"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Muscle Principal */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Muscle Principal Ciblé *
              </label>
              <select
                value={formPrimaryMuscle}
                onChange={(e) => setFormPrimaryMuscle(e.target.value)}
                data-testid="exercise-form-primary-muscle"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {ALL_TARGET_MUSCLES.map((m) => (
                  <option key={m} value={m} className="bg-[#0f0f15]">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Partie du corps */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Partie du corps
              </label>
              <select
                value={formBodyPart}
                onChange={(e) => setFormBodyPart(e.target.value as BodyPart)}
                data-testid="exercise-form-body-part"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {ALL_BODY_PARTS.map((bp) => (
                  <option key={bp} value={bp} className="bg-[#0f0f15]">
                    {bp}
                  </option>
                ))}
              </select>
            </div>

            {/* Matériel */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Matériel Requis
              </label>
              <select
                value={formEquipment}
                onChange={(e) => setFormEquipment(e.target.value as EquipmentType)}
                data-testid="exercise-form-equipment"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {ALL_EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq} className="bg-[#0f0f15]">
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulté */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Difficulté
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as ExerciseDifficulty)}
                data-testid="exercise-form-difficulty"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="Débutant" className="bg-[#0f0f15]">Débutant</option>
                <option value="Intermédiaire" className="bg-[#0f0f15]">Intermédiaire</option>
                <option value="Avancé" className="bg-[#0f0f15]">Avancé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Muscles secondaires */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Muscles secondaires (séparés par des virgules)
              </label>
            <input
              type="text"
              value={formSecondaryMuscles}
              onChange={(e) => setFormSecondaryMuscles(e.target.value)}
              placeholder="Ex: Triceps, Avant-bras, Épaules"
              data-testid="exercise-form-secondary-muscles"
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
            </div>

            {/* Paramètres recommandés par défaut */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Séries défaut
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={formSets}
                  onChange={(e) => setFormSets(Number(e.target.value))}
                  data-testid="exercise-form-sets"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Répétitions
                </label>
                <input
                  type="text"
                  value={formReps}
                  onChange={(e) => setFormReps(e.target.value)}
                  placeholder="10 ou 8-12"
                  data-testid="exercise-form-reps"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Repos (sec)
                </label>
                <input
                  type="number"
                  step={15}
                  min={15}
                  max={360}
                  value={formRestSec}
                  onChange={(e) => setFormRestSec(Number(e.target.value))}
                  data-testid="exercise-form-rest"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description / Objectif biomécanique
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Conseils de placement, sensation recherchée..."
              data-testid="exercise-form-description"
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Dynamic Instructions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-violet-400" />
                <span>Consignes & Étapes d'exécution</span>
              </label>
              <button
                type="button"
                onClick={handleAddInstructionStep}
                className="text-[11px] font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20"
              >
                + Ajouter une étape
              </button>
            </div>
            {formInstructions.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-violet-400 font-mono w-5">{idx + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleUpdateInstructionStep(idx, e.target.value)}
                  placeholder={`Étape ${idx + 1}`}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
                {formInstructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveInstructionStep(idx)}
                    className="text-zinc-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Dynamic Common Mistakes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Erreurs fréquentes à éviter</span>
              </label>
              <button
                type="button"
                onClick={handleAddMistakeStep}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
              >
                + Ajouter une erreur
              </button>
            </div>
            {formMistakes.map((mistake, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-mono w-5">⚠️</span>
                <input
                  type="text"
                  value={mistake}
                  onChange={(e) => handleUpdateMistakeStep(idx, e.target.value)}
                  placeholder="Erreur fréquente..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                {formMistakes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMistakeStep(idx)}
                    className="text-zinc-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={resetForm}
              data-testid="exercise-form-cancel"
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              data-testid="exercise-form-submit"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl transition-all shadow-lg"
            >
              {editingExerciseId ? 'Mettre à jour l’exercice' : 'Enregistrer dans IndexedDB'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Multi-Filter Bar */}
      <div className="space-y-3 bg-white/5 border border-white/10 p-4 sm:p-5 rounded-3xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Main search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              placeholder="Rechercher par nom, muscle, matériel (ex: Développé, Squat, Haltères, Dos...)"
              data-testid="exercise-search"
              aria-autocomplete="list"
              aria-controls="exercise-search-suggestions"
              className="w-full bg-black/30 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSearchSuggestions(false);
                }}
                data-testid="exercise-search-clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {/* LOT C — Search suggestions dropdown */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div
                id="exercise-search-suggestions"
                data-testid="exercise-search-suggestions"
                className="absolute z-10 w-full mt-1 bg-[#12111a] border border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
              >
                {searchSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchTerm(suggestion);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-violet-600/20 first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Types toggle (Tous, Exercices, Étirements, Perso, Favoris) */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setFilterType('all')}
              data-testid="exercise-filter-type-all"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tous ({exercises.length + stretchCount})
            </button>
            <span data-testid="exercise-count" className="sr-only">{exercises.length + stretchCount}</span>
            <button
              onClick={() => setFilterType('exercise')}
              data-testid="exercise-filter-type-exercise"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'exercise'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Exercices ({exercises.length})
            </button>
            <button
              onClick={() => setFilterType('stretch')}
              data-testid="exercise-filter-type-stretch"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'stretch'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Étirements ({stretchCount})
            </button>
            <button
              onClick={() => setFilterType('custom')}
              data-testid="exercise-filter-type-custom"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'custom'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              <span>Mes Créations ({customCount})</span>
            </button>
            <button
              onClick={() => setFilterType('favorites')}
              data-testid="exercise-filter-type-favorites"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'favorites'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Favoris ({favoriteCount})</span>
            </button>
          </div>

          {/* LOT C — Mobile filter button (md:hidden) */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold rounded-xl hover:bg-violet-600/30 transition-colors shrink-0"
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
          </button>
        </div>

        {/* Muscle Selector Horizontal Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Filtrer par muscle / zone :
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['Tous', ...ALL_TARGET_MUSCLES].map((mg) => {
              const isSelected = selectedMuscle === mg;
              return (
                <button
                  key={mg}
                  onClick={() => setSelectedMuscle(mg)}
                  data-testid="exercise-filter-muscle"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-md border border-violet-500/40'
                      : 'bg-black/20 text-zinc-400 hover:text-white border border-white/5 hover:bg-white/5'
                  }`}
                >
                  {mg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Matériel</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              data-testid="exercise-filter-equipment"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="Tous">Tous les matériels</option>
              {ALL_EQUIPMENT.map((eq) => (
                <option key={eq} value={eq} className="bg-[#0f0f15]">
                  {eq}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Difficulté</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              data-testid="exercise-filter-difficulty"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="Tous">Toutes difficultés</option>
              <option value="Débutant" className="bg-[#0f0f15]">Débutant</option>
              <option value="Intermédiaire" className="bg-[#0f0f15]">Intermédiaire</option>
              <option value="Avancé" className="bg-[#0f0f15]">Avancé</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              data-testid="exercise-filter-category"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="Toutes">Toutes catégories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0f0f15]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Zone du corps</label>
            <select
              value={selectedBodyPart}
              onChange={(e) => setSelectedBodyPart(e.target.value)}
              data-testid="exercise-filter-body-part"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="Toutes">Toutes zones</option>
              {ALL_BODY_PARTS.map((bp) => (
                <option key={bp} value={bp} className="bg-[#0f0f15]">
                  {bp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort + Reset row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[10px] text-zinc-400 shrink-0">Trier</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              data-testid="exercise-sort"
              className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white"
            >
              <option value="name-asc" className="bg-[#0f0f15]">Nom A → Z</option>
              <option value="name-desc" className="bg-[#0f0f15]">Nom Z → A</option>
              <option value="difficulty" className="bg-[#0f0f15]">Difficulté</option>
              <option value="category" className="bg-[#0f0f15]">Catégorie</option>
            </select>
          </div>

          {(selectedMuscle !== 'Tous' || selectedEquipment !== 'Tous' || selectedDifficulty !== 'Tous' || selectedCategory !== 'Toutes' || selectedBodyPart !== 'Toutes' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedMuscle('Tous');
                setSelectedEquipment('Tous');
                setSelectedDifficulty('Tous');
                setSelectedCategory('Toutes');
                setSelectedBodyPart('Toutes');
                setSearchTerm('');
                setFilterType('all');
                setSortBy('name-asc');
              }}
              data-testid="exercise-reset-filters"
              className="text-violet-400 hover:text-violet-300 text-xs font-semibold py-1.5 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* LOT C — Mobile filter drawer */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileFilterOpen(false)}
          data-testid="mobile-filter-drawer"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 max-w-sm w-full bg-[#12111a] border-l border-white/10 shadow-2xl overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg" id="mobile-filter-title">
                Filtres
              </h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Type</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterType === 'all'
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tous ({exercises.length + stretchCount})
                  </button>
                  <button
                    onClick={() => setFilterType('exercise')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterType === 'exercise'
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Exercices ({exercises.length})
                  </button>
                  <button
                    onClick={() => setFilterType('stretch')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterType === 'stretch'
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Étirements ({stretchCount})
                  </button>
                  <button
                    onClick={() => setFilterType('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterType === 'custom'
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Mes Créations ({customCount})
                  </button>
                  <button
                    onClick={() => setFilterType('favorites')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filterType === 'favorites'
                        ? 'bg-violet-600 text-white shadow'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Favoris ({favoriteCount})
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Muscle / Zone</label>
                <div className="flex flex-wrap gap-2">
                  {['Tous', ...ALL_TARGET_MUSCLES].map((mg) => {
                    const isSelected = selectedMuscle === mg;
                    return (
                      <button
                        key={mg}
                        onClick={() => {
                          setSelectedMuscle(mg);
                          setMobileFilterOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-md border border-violet-500/40'
                            : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Matériel</label>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Tous">Tous les matériels</option>
                  {ALL_EQUIPMENT.map((eq) => (
                    <option key={eq} value={eq} className="bg-[#0f0f15]">
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Difficulté</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Tous">Toutes difficultés</option>
                  <option value="Débutant" className="bg-[#0f0f15]">Débutant</option>
                  <option value="Intermédiaire" className="bg-[#0f0f15]">Intermédiaire</option>
                  <option value="Avancé" className="bg-[#0f0f15]">Avancé</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Toutes">Toutes catégories</option>
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0f0f15]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Zone du corps</label>
                <select
                  value={selectedBodyPart}
                  onChange={(e) => setSelectedBodyPart(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Toutes">Toutes zones</option>
                  {ALL_BODY_PARTS.map((bp) => (
                    <option key={bp} value={bp} className="bg-[#0f0f15]">
                      {bp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Tri</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="name-asc" className="bg-[#0f0f15]">Nom A → Z</option>
                  <option value="name-desc" className="bg-[#0f0f15]">Nom Z → A</option>
                  <option value="difficulty" className="bg-[#0f0f15]">Difficulté</option>
                  <option value="category" className="bg-[#0f0f15]">Catégorie</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSelectedMuscle('Tous');
                  setSelectedEquipment('Tous');
                  setSelectedDifficulty('Tous');
                  setSelectedCategory('Toutes');
                  setSelectedBodyPart('Toutes');
                  setSearchTerm('');
                  setFilterType('all');
                  setSortBy('name-asc');
                  setMobileFilterOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-600/30 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((ex) => {
          if (ex.kind === 'stretch') {
            return (
              <LibraryStretchCard
                key={ex.id}
                stretch={ex}
                onClick={() => setActiveDetailExercise(ex)}
                onToggleFavorite={onToggleFavorite}
              />
            );
          }
          return (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onClick={() => setActiveDetailExercise(ex)}
              onToggleFavorite={onToggleFavorite}
            />
          );
        })}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl space-y-3" data-testid="exercise-list-empty">
          <Dumbbell className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-zinc-300 font-semibold text-base">Aucun exercice trouvé</p>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            Aucun résultat ne correspond à vos critères. Essayez d'ajuster votre recherche ou créez un exercice personnalisé.
          </p>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {activeDetailExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="bg-[#12111a] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95"
            data-testid="exercise-detail"
            data-exercise-id={activeDetailExercise.id}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase bg-violet-600/30 text-violet-200 border border-violet-500/40 px-2.5 py-0.5 rounded-lg">
                    {activeDetailExercise.primaryMuscle}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-300 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-lg">
                    {activeDetailExercise.equipment}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-300 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-lg">
                    {activeDetailExercise.difficulty}
                  </span>
                  {activeDetailExercise.category && (
                    <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                      {activeDetailExercise.category}
                    </span>
                  )}
                  {activeDetailExercise.bodyPart && activeDetailExercise.bodyPart !== activeDetailExercise.primaryMuscle && (
                    <span className="text-[11px] font-medium text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 rounded-lg">
                      {activeDetailExercise.bodyPart}
                    </span>
                  )}
                  {activeDetailExercise.isCustom && (
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                      Personnalisé
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {activeDetailExercise.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (onToggleFavorite) onToggleFavorite(activeDetailExercise.id);
                    setActiveDetailExercise({
                      ...activeDetailExercise,
                      isFavorite: !activeDetailExercise.isFavorite,
                    });
                  }}
                  data-testid="exercise-detail-favorite"
                  aria-pressed={activeDetailExercise.isFavorite}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-amber-400"
                >
                  <Star
                    className={`w-5 h-5 ${
                      activeDetailExercise.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() => setActiveDetailExercise(null)}
                  data-testid="exercise-detail-close"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* LOT C — Ajouter au programme button */}
                <button
                  onClick={() => handleOpenAddToProgram(activeDetailExercise)}
                  data-testid="exercise-detail-add-to-program"
                  aria-label="Ajouter au programme"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                </button>

                {/* LOT E.1 — Calculateur 1RM button */}
                <button
                  onClick={() => handleOpenOneRMModal(activeDetailExercise, 'estimate')}
                  data-testid="exercise-detail-onerm"
                  aria-label="Calculateur 1RM"
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-violet-400 hover:border-violet-500/40 transition-colors"
                >
                  <Calculator className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                Description & Objectif
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {activeDetailExercise.description}
              </p>
            </div>

            {/* Default Parameters */}
            <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Séries</span>
                <span className="text-lg font-bold text-white">
                  {activeDetailExercise.defaultSets}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Répétitions</span>
                <span className="text-lg font-bold text-white">
                  {activeDetailExercise.defaultReps}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Repos</span>
                <span className="text-lg font-bold text-violet-300">
                  {activeDetailExercise.defaultRestSec}s
                </span>
              </div>
            </div>

            {/* V8.1 Performance summary */}
            {detailPerf ? (
              <div className="space-y-3 bg-black/20 border border-white/10 rounded-2xl p-4" data-testid="ex-detail-perf">
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Progression & historique</span>
                </h4>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    data-testid="exd-trend"
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${TREND_INFO[detailPerf.analysis.trend].cls}`}
                  >
                    {TREND_INFO[detailPerf.analysis.trend].label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Dernière séance</div>
                    <div className="font-display text-lg font-bold text-white" data-testid="exd-last">
                      {fmtN(detailPerf.lastV)} <span className="text-[10px] text-zinc-400 font-normal">{detailPerf.unit}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Meilleur</div>
                    <div className="font-display text-lg font-bold text-amber-300" data-testid="exd-best">
                      {detailPerf.bestV != null ? `${fmtN(detailPerf.bestV)} ${detailPerf.unit}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-2 py-2">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Évolution</div>
                    <div className="font-display text-lg font-bold" data-testid="exd-evol">
                      {detailPerf.delta == null ? (
                        <span className="text-zinc-500">—</span>
                      ) : detailPerf.delta > 0 ? (
                        <span className="text-emerald-400">▲ +{fmtN(detailPerf.delta)}</span>
                      ) : detailPerf.delta < 0 ? (
                        <span className="text-rose-400">▼ {fmtN(detailPerf.delta)}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {detailPerf.target && (
                  <div className="rounded-xl bg-violet-600/10 border border-violet-500/30 px-3 py-2 text-xs space-y-1" data-testid="exd-target">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-zinc-300">
                        Prochaine cible : <span className="font-bold text-violet-300">{fmtN(detailPerf.target.target)}</span>
                        <span className="text-zinc-400"> {detailPerf.unit}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">{detailPerf.entries.length} séance{detailPerf.entries.length > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{detailPerf.target.reason}</p>
                  </div>
                )}

                <ProgressChart
                  points={detailPerf.entries
                    .filter((e) => metricIsApplicable(e, detailPerf.metric))
                    .map((e) => ({ date: e.date, value: performanceMetricValue(e, detailPerf.metric) }))}
                  metricLabel={detailPerf.unit}
                  testid="exd-chart"
                />

                <div className="space-y-1.5">
                  {[...detailPerf.entries].reverse().map((entry) => {
                    const d = detailPerf.historyDeltas.get(entry.sessionId) || null;
                    return (
                      <div key={entry.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2" data-testid="exd-history-row">
                        <span className="text-xs text-zinc-300 shrink-0">
                          {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-zinc-500 text-right flex-1">
                          {metricIsApplicable(entry, detailPerf.metric)
                            ? `${fmtN(performanceMetricValue(entry, detailPerf.metric))} ${detailPerf.unit}`
                            : '—'}
                        </span>
                        <div className="text-xs font-bold shrink-0" data-testid="exd-history-delta">
                          {d && d.delta != null ? (
                            d.delta > 0 ? (
                              <span className="text-emerald-400">▲ +{fmtN(d.delta)}</span>
                            ) : d.delta < 0 ? (
                              <span className="text-rose-400">▼ {fmtN(d.delta)}</span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-xs text-zinc-500" data-testid="ex-detail-perf-empty">
                Aucune séance enregistrée pour cet exercice — vos performances apparaîtront ici après une séance validée.
              </div>
            )}

            {/* Secondary Muscles */}
            {activeDetailExercise.secondaryMuscles && activeDetailExercise.secondaryMuscles.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Muscles secondaires sollicités
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {activeDetailExercise.secondaryMuscles.map((sec, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white/5 border border-white/10 text-zinc-300 px-3 py-1 rounded-xl"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {activeDetailExercise.instructions && activeDetailExercise.instructions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4" />
                  <span>Instructions pas à pas</span>
                </h4>
                <div className="space-y-2">
                  {activeDetailExercise.instructions.map((inst, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 bg-black/30 p-3 rounded-2xl border border-white/5 text-xs text-zinc-300 leading-relaxed"
                    >
                      <span className="text-violet-400 font-mono font-bold">{idx + 1}.</span>
                      <span>{inst}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {activeDetailExercise.commonMistakes && activeDetailExercise.commonMistakes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Erreurs courantes à éviter</span>
                </h4>
                <div className="space-y-1.5">
                  {activeDetailExercise.commonMistakes.map((mistake, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-200 leading-relaxed"
                    >
                      <span>⚠️</span>
                      <span>{mistake}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips / Conseils techniques */}
            {activeDetailExercise.tips && activeDetailExercise.tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>Conseils techniques</span>
                </h4>
                <div className="space-y-1.5">
                  {activeDetailExercise.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-200 leading-relaxed"
                    >
                      <span>💡</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variantes */}
            {activeDetailExercise.variants && activeDetailExercise.variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Variantes</span>
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {activeDetailExercise.variants.map((v, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-sky-500/10 border border-sky-500/25 text-sky-200 px-3 py-1 rounded-xl"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Similar exercises */}
            {(() => {
              const similar = (activeDetailExercise.similarExerciseIds || [])
                .map((id) => exercises.find((e) => e.id === id))
                .filter((e): e is Exercise => !!e);
              if (similar.length === 0) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4" />
                    <span>Exercices similaires</span>
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {similar.map((se) => (
                      <button
                        key={se.id}
                        type="button"
                        onClick={() => setActiveDetailExercise(se)}
                        data-testid="exercise-detail-similar"
                        className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 hover:border-violet-500/40 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Dumbbell className="w-3 h-3 text-violet-400" />
                        {se.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Custom Exercise Actions */}
            {activeDetailExercise.isCustom && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => setDeleteTarget(activeDetailExercise)}
                  data-testid="exercise-detail-delete"
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2 rounded-xl border border-rose-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer l'exercice</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(activeDetailExercise)}
                  data-testid="exercise-detail-edit"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl shadow-md transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modifier les données</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOT C — Add to Program Modal */}
      {addToProgramOpen && addToProgramExercise && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setAddToProgramOpen(false)}
          data-testid="add-to-program-modal"
        >
          <div
            className="w-full max-w-md bg-[#12111a] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-program-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="add-to-program-title" className="text-xl font-bold text-white">
                Ajouter au programme
              </h3>
              <button
                onClick={() => setAddToProgramOpen(false)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">
                  Exercice
                </label>
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white">
                  {addToProgramExercise.name}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">
                  Programme
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => {
                    setSelectedProgramId(e.target.value);
                    setSelectedDayId('');
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Sélectionner un programme</option>
                  {programs?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">
                  Jour de la séance
                </label>
                <select
                  value={selectedDayId}
                  onChange={(e) => setSelectedDayId(e.target.value)}
                  disabled={!selectedProgramId}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                >
                  <option value="">Sélectionner un jour</option>
                  {programs?.find((p) => p.id === selectedProgramId)?.days.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-violet-600/10 border border-violet-500/30 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                  Configuration par défaut
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Séries</div>
                    <div className="font-bold text-white">{addToProgramExercise.defaultSets}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Répétitions</div>
                    <div className="font-bold text-white">{addToProgramExercise.defaultReps}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Repos</div>
                    <div className="font-bold text-violet-300">{addToProgramExercise.defaultRestSec}s</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAddToProgramOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddToProgramConfirm}
                disabled={!selectedProgramId || !selectedDayId}
                className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOT 5 — Item 15: deletion confirmation (custom exercises only).
          Warns about program usage BEFORE the destructive action; the delete is
          still effective right away, and every program reference is cleaned by
          App (removeExerciseFromPrograms). */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          data-testid="exercise-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0d0d0d] border border-white/10 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <h3 id="delete-modal-title" className="font-display font-bold text-white uppercase tracking-wide text-lg leading-tight">
                  Supprimer {deleteTarget.name} ?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Cette action est définitive : l'exercice sera retiré de votre bibliothèque personnalisée.
                </p>
              </div>
            </div>

            {(() => {
              const usageDays = (programUsage || {})[deleteTarget.id] || 0;
              const historyCount = (exercisePerformances || []).filter((p) => p.exerciseId === deleteTarget.id).length;
              if (usageDays > 0 || historyCount > 0) {
                return (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
                    {usageDays > 0 && (
                      <p className="text-xs text-amber-200">
                        Référencé dans <span className="font-bold">{usageDays}</span>{' '}
                        séance{usageDays > 1 ? 's' : ''} de programme — le ou les programmes seront automatiquement
                        mis à jour (références supprimées).
                      </p>
                    )}
                    {historyCount > 0 && (
                      <p className="text-xs text-amber-200">
                        L'historique ({historyCount} performance{historyCount > 1 ? 's' : ''}), les records (PR) et vos
                        statistiques personnelles sont conservés.
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-zinc-400">
                    L'exercice n'est utilisé dans aucun programme : aucune autre donnée ne sera touchée.
                  </p>
                </div>
              );
            })()}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (onDeleteExercise) onDeleteExercise(deleteTarget.id);
                  setDeleteTarget(null);
                  setActiveDetailExercise(null);
                }}
                data-testid="exercise-delete-confirm"
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/40 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOT E.1 — 1RM Calculator Modal */}
      {oneRMModalOpen && oneRMModalExercise && (
        <OneRMModal
          isOpen={oneRMModalOpen}
          onClose={() => setOneRMModalOpen(false)}
          initialMode={oneRMModalMode}
          onApplyWeight={handleOneRMApply}
        />
      )}
    </div>
  );
};
