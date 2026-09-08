import React, { useState, useRef } from 'react';
import { UserProfile, WorkoutSettings } from '../types';
import { SportTrackStorage } from '../db/indexedDb';
import {
  loadWorkoutSettings,
  updateWorkoutSettings,
  resetWorkoutSettings,
  SUPPORTED_REST_OPTIONS,
  THEME_MODES,
  ACCENT_COLORS,
  DASHBOARD_BLOCK_KEYS,
  DASHBOARD_BLOCK_LABELS,
  DEFAULT_DASHBOARD_BLOCKS,
} from '../utilsSettings';
import {
  Settings,
  User,
  Download,
  Upload,
  RefreshCw,
  Smartphone,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Mic,
  Vibrate,
  Timer,
  Ruler,
  Eye,
  Palette,
  LayoutDashboard,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Check,
  Bell,
} from 'lucide-react';

interface SettingsPageProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onReloadAllData: () => void;
  onSettingsChange?: (settings: WorkoutSettings) => void;
}

// Swatch colour for each accent (mirrors the accent palettes in index.css).
const ACCENT_SWATCH: Record<string, string> = {
  violet: '#8b5cf6',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  rose: '#f43f5e',
};

// Accessible ON/OFF toggle row: works with mouse, keyboard (button) and touch,
// exposes a clear ON/OFF state both visually and via aria-pressed + text label,
// so the state is never communicated by colour alone.
const ToggleRow: React.FC<{
  testid: string;
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ testid, label, description, checked, onToggle }) => {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-200">{label}</div>
        {description && <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        data-testid={testid}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors ${
          checked
            ? 'bg-violet-600/30 border-violet-500/50 text-violet-200'
            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${checked ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
        <span>{checked ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  onUpdateProfile,
  onReloadAllData,
  onSettingsChange,
}) => {
  const [name, setName] = useState(profile.name);
  const [weeklyTarget, setWeeklyTarget] = useState(profile.weeklyTargetSessions);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LOT H — global workout preferences (localStorage-backed, immediate feedback).
  const [settings, setSettings] = useState<WorkoutSettings>(() => loadWorkoutSettings());
  const [settingsResetOpen, setSettingsResetOpen] = useState(false);

  const applySettings = (patch: Partial<WorkoutSettings>) => {
    const next = updateWorkoutSettings(patch);
    setSettings(next);
    onSettingsChange?.(next);
  };

  const handleResetSettings = () => {
    const next = resetWorkoutSettings();
    setSettings(next);
    onSettingsChange?.(next);
    setSettingsResetOpen(false);
    setStatusMessage('Réglages réinitialisés aux valeurs par défaut.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Athlète',
      weeklyTargetSessions: Number(weeklyTarget),
    };
    onUpdateProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = async () => {
    try {
      const jsonStr = await SportTrackStorage.exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `SportTrack-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Exportation réussie ! Votre sauvegarde JSON a été téléchargée.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Erreur lors de l’exportation des données.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await SportTrackStorage.importAllData(content);
      if (success) {
        setStatusMessage('Importation réussie ! Vos données ont été restaurées.');
        onReloadAllData();
      } else {
        setStatusMessage('Erreur : le fichier JSON est invalide ou corrompu.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'Attention : Voulez-vous réinitialiser toutes les données aux valeurs par défaut ? Vos séances personnalisées seront remplacées.'
      )
    ) {
      await SportTrackStorage.resetToDefault();
      onReloadAllData();
      setStatusMessage('Application réinitialisée aux données de base.');
    }
  };

  return (
    <div id="page-settings" data-testid="settings-page" className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
            Paramètres & Données
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Gérez votre profil, vos sauvegardes locales JSON et vos préférences de l'application.
        </p>
      </div>

      {statusMessage && (
        <div className="bg-violet-950/40 border border-violet-500/40 p-4 rounded-2xl flex items-center justify-between text-xs text-violet-200 animate-in fade-in backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      {/* LOT H — Segment Séance */}
      <section aria-labelledby="settings-section-seance" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-seance">
          <Timer className="w-5 h-5 text-violet-400" />
          <span>Séance</span>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="settings-default-rest" className="block text-xs font-semibold text-zinc-300 mb-2">
              Repos par défaut
            </label>
            <div
              id="settings-default-rest"
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Repos par défaut entre les séries"
            >
              {SUPPORTED_REST_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={settings.defaultRestSec === opt}
                  onClick={() => applySettings({ defaultRestSec: opt })}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                    settings.defaultRestSec === opt
                      ? 'bg-violet-600/30 border-violet-500/50 text-violet-200'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt} s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Repos utilisé par défaut pour les nouvelles séances. Les repos déjà configurés dans vos programmes restent inchangés.
            </p>
          </div>

          <div>
            <label htmlFor="settings-exercise-transition-rest" className="block text-xs font-semibold text-zinc-300 mb-2">
              Repos entre les exercices
            </label>
            <div
              id="settings-exercise-transition-rest"
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Repos entre les exercices"
            >
              {SUPPORTED_REST_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={settings.exerciseTransitionRestSec === opt}
                  onClick={() => applySettings({ exerciseTransitionRestSec: opt })}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                    settings.exerciseTransitionRestSec === opt
                      ? 'bg-violet-600/30 border-violet-500/50 text-violet-200'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt} s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Temps de récupération avant de passer à l'exercice suivant.
            </p>
          </div>
        </div>
      </section>

      {/* LOT H — Segment Audio */}
      <section aria-labelledby="settings-section-audio" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-audio">
          <Volume2 className="w-5 h-5 text-violet-400" />
          <span>Audio</span>
        </div>
        <ToggleRow
          testid="settings-sound-toggle"
          label="Sons de séance"
          description="Sons du compte à rebours, début et fin de repos, fin de série."
          checked={settings.soundEnabled}
          onToggle={() => applySettings({ soundEnabled: !settings.soundEnabled })}
        />
        <ToggleRow
          testid="settings-voice-toggle"
          label="Annonces vocales"
          description="Annonces vocales en français pendant la séance guidée."
          checked={settings.voiceEnabled}
          onToggle={() => applySettings({ voiceEnabled: !settings.voiceEnabled })}
        />
      </section>

      {/* LOT H — Segment Vibrations */}
      <section aria-labelledby="settings-section-vibrations" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-vibrations">
          <Vibrate className="w-5 h-5 text-violet-400" />
          <span>Vibrations</span>
        </div>
        <ToggleRow
          testid="settings-vibration-toggle"
          label="Vibrations"
          description="Vibration du téléphone pendant la séance guidée (si l'appareil est compatible)."
          checked={settings.vibrationEnabled}
          onToggle={() => applySettings({ vibrationEnabled: !settings.vibrationEnabled })}
        />
      </section>

      {/* LOT 6 — item 17: per-event feedback toggles + volume (sons et vibrations) */}
      <section aria-labelledby="settings-section-feedback" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div id="settings-section-feedback" className="flex items-center gap-2 text-violet-300 font-bold">
          <Bell className="w-5 h-5 text-violet-400" />
          <span>Sons et vibrations</span>
        </div>
        <p className="text-xs text-zinc-400">
          Volume et feedbacks par événement. Les interrupteurs « Sons de séance »
          et « Vibrations » restent l'interrupteur général de chaque canal ; chaque
          réglage ci-dessous couvre le son ET la vibration de son événement.
        </p>

        <div>
          <label htmlFor="settings-feedback-volume" className="block text-xs font-semibold text-zinc-300 mb-2">
            Volume des sons de séance
          </label>
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
            <input
              id="settings-feedback-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.feedbackVolume * 100)}
              onChange={(e) => applySettings({ feedbackVolume: Number(e.target.value) / 100 })}
              className="flex-1 accent-violet-500 min-h-[36px]"
              aria-valuetext={`${Math.round(settings.feedbackVolume * 100)} pour cent`}
            />
            <span
              data-testid="settings-volume-value"
              className="text-xs font-bold text-zinc-300 w-10 text-right tabular-nums"
            >
              {Math.round(settings.feedbackVolume * 100)}%
            </span>
          </div>
        </div>

        <ToggleRow
          testid="settings-series-feedback"
          label="Signaux de série"
          description="Signal au début et à la fin de chaque série."
          checked={settings.seriesFeedbackEnabled}
          onToggle={() => applySettings({ seriesFeedbackEnabled: !settings.seriesFeedbackEnabled })}
        />
        <ToggleRow
          testid="settings-rest-feedback"
          label="Signaux de repos"
          description="Signal au début et à la fin du repos."
          checked={settings.restFeedbackEnabled}
          onToggle={() => applySettings({ restFeedbackEnabled: !settings.restFeedbackEnabled })}
        />
        <ToggleRow
          testid="settings-countdown-feedback"
          label="Compte à rebours 3-2-1"
          description="Bip à chaque seconde du compte à rebours."
          checked={settings.countdownFeedbackEnabled}
          onToggle={() => applySettings({ countdownFeedbackEnabled: !settings.countdownFeedbackEnabled })}
        />
        <ToggleRow
          testid="settings-end-feedback"
          label="Fin de séance"
          description="Signal quand la séance est validée."
          checked={settings.workoutEndFeedbackEnabled}
          onToggle={() => applySettings({ workoutEndFeedbackEnabled: !settings.workoutEndFeedbackEnabled })}
        />
        <ToggleRow
          testid="settings-record-feedback"
          label="Nouveau record (PR)"
          description="Signal quand un nouveau record personnel est battu."
          checked={settings.recordFeedbackEnabled}
          onToggle={() => applySettings({ recordFeedbackEnabled: !settings.recordFeedbackEnabled })}
        />
      </section>

      {/* LOT H — Segment Affichage */}
      <section aria-labelledby="settings-section-display" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-display">
          <Eye className="w-5 h-5 text-violet-400" />
          <span>Affichage</span>
        </div>
        <div className="space-y-4">
          <ToggleRow
            testid="settings-display-animations"
            label="Animations"
            description="Animations fluides pendant la séance. Respecte votre préférence système de réduction des animations."
            checked={settings.animationsEnabled}
            onToggle={() => applySettings({ animationsEnabled: !settings.animationsEnabled })}
          />
          <div>
            <label htmlFor="settings-units" className="block text-xs font-semibold text-zinc-300 mb-2">Unités</label>
            <div
              id="settings-units"
              role="radiogroup"
              aria-label="Unités"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.units === 'metric'}
                onClick={() => applySettings({ units: 'metric' })}
                className="px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors bg-violet-600/30 border-violet-500/50 text-violet-200"
              >
                Métrique (kg)
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Les données internes restent stockées telles quelles (aucune conversion).
            </p>
          </div>
        </div>
      </section>

      {/* LOT 6 — item 16: visual appearance (theme + accent) */}
      <section aria-labelledby="settings-section-appearance" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-appearance">
          <Palette className="w-5 h-5 text-violet-400" />
          <span>Apparence</span>
        </div>

        <div>
          <label id="settings-theme-label" className="block text-xs font-semibold text-zinc-300 mb-2">
            Thème
          </label>
          <div
            role="radiogroup"
            aria-labelledby="settings-theme-label"
            className="flex flex-wrap gap-2"
          >
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={settings.themeMode === mode}
                data-testid={`settings-theme-${mode}`}
                onClick={() => applySettings({ themeMode: mode })}
                className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                  settings.themeMode === mode
                    ? 'bg-violet-600/30 border-violet-500/50 text-violet-200'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {mode === 'system' ? 'Système' : mode === 'light' ? 'Clair' : 'Sombre'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            « Système » suit la préférence clair/sombre de votre appareil en temps réel.
          </p>
        </div>

        <div>
          <label id="settings-accent-label" className="block text-xs font-semibold text-zinc-300 mb-2">
            Couleur d'accent
          </label>
          <div role="radiogroup" aria-labelledby="settings-accent-label" className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((accent) => {
              const selected = settings.accentColor === accent;
              const label = accent.charAt(0).toUpperCase() + accent.slice(1);
              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={label}
                  data-testid={`settings-accent-${accent}`}
                  onClick={() => applySettings({ accentColor: accent })}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    selected ? 'border-violet-400 scale-110' : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: ACCENT_SWATCH[accent] }}
                >
                  {selected && <Check className="w-5 h-5 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            Appliquée aux boutons, liens, barres de progression et points de focus.
          </p>
        </div>
      </section>

      {/* LOT 6 — item 18: customisable dashboard (show/hide + reorder blocks) */}
      <section aria-labelledby="settings-section-dashboard" className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold" id="settings-section-dashboard">
          <LayoutDashboard className="w-5 h-5 text-violet-400" />
          <span>Tableau de bord</span>
        </div>
        <p className="text-xs text-zinc-400">
          Choisissez les blocs affichés sur l'accueil et leur ordre. Le bouton
          « Commencer la séance » reste toujours en haut. Vos données ne sont jamais
          supprimées, les blocs masqués restent simplement sur la page concernée.
        </p>

        <div className="space-y-2">
          {settings.dashboardBlocks.map((key, index) => (
            <div
              key={key}
              data-testid={`settings-dashboard-row-${key}`}
              className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/10"
            >
              <span className="text-sm font-semibold text-zinc-200 truncate">
                {DASHBOARD_BLOCK_LABELS[key] ?? key}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid={`settings-dashboard-${key}-up`}
                  aria-label={`Déplacer le bloc ${DASHBOARD_BLOCK_LABELS[key] ?? key} vers le haut`}
                  disabled={index === 0}
                  onClick={() => {
                    if (index === 0) return;
                    const next = [...settings.dashboardBlocks];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    applySettings({ dashboardBlocks: next });
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid={`settings-dashboard-${key}-down`}
                  aria-label={`Déplacer le bloc ${DASHBOARD_BLOCK_LABELS[key] ?? key} vers le bas`}
                  disabled={index === settings.dashboardBlocks.length - 1}
                  onClick={() => {
                    if (index >= settings.dashboardBlocks.length - 1) return;
                    const next = [...settings.dashboardBlocks];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    applySettings({ dashboardBlocks: next });
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid={`settings-dashboard-${key}-hide`}
                  aria-label={`Masquer le bloc ${DASHBOARD_BLOCK_LABELS[key] ?? key}`}
                  onClick={() => applySettings({ dashboardBlocks: settings.dashboardBlocks.filter((b) => b !== key) })}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold"
                >
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Masquer</span>
                </button>
              </div>
            </div>
          ))}

          <div className="pt-1">
            <div className="text-xs font-semibold text-zinc-500 mb-2">Blocs masqués</div>
            {DASHBOARD_BLOCK_KEYS.filter((key) => !settings.dashboardBlocks.includes(key)).length === 0 ? (
              <p className="text-[11px] text-zinc-500">Tous les blocs sont affichés.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DASHBOARD_BLOCK_KEYS.filter((key) => !settings.dashboardBlocks.includes(key)).map((key) => (
                  <div
                    key={key}
                    data-testid={`settings-dashboard-hidden-${key}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 opacity-70"
                  >
                    <span className="text-sm font-semibold text-zinc-300 truncate">
                      {DASHBOARD_BLOCK_LABELS[key]}
                    </span>
                    <button
                      type="button"
                      data-testid={`settings-dashboard-${key}-show`}
                      aria-label={`Réafficher le bloc ${DASHBOARD_BLOCK_LABELS[key] ?? key}`}
                      onClick={() => applySettings({ dashboardBlocks: [...settings.dashboardBlocks, key] })}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Afficher</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-zinc-500">
            Ordre par défaut&nbsp;: {DEFAULT_DASHBOARD_BLOCKS.length} blocs.
          </p>
          <button
            type="button"
            data-testid="settings-dashboard-reset"
            onClick={() => applySettings({ dashboardBlocks: [...DEFAULT_DASHBOARD_BLOCKS] })}
            className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
          >
            Restaurer l'ordre par défaut
          </button>
        </div>
      </section>

      {/* LOT H — Segment Données / Réglages (reset preferences only, never data) */}
      <section aria-labelledby="settings-section-settings-reset" className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm" id="settings-section-settings-reset">
          <RefreshCw className="w-4 h-4 text-zinc-400" />
          <span>Réinitialiser les réglages</span>
        </div>
        <p className="text-xs text-zinc-400">
          Remet toutes les préférences (sons, voix, vibrations, volume et feedbacks, repos, affichage,
          thème et tableau de bord) aux valeurs par défaut.
          Vos programmes, séances, records, objectifs et statistiques ne sont <strong>jamais</strong> supprimés.
        </p>
        <button
          type="button"
          data-testid="settings-reset"
          onClick={() => setSettingsResetOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Réinitialiser les réglages</span>
        </button>

        {settingsResetOpen && (
          <div
            className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="settings-reset-title"
          >
            <div className="sport-card p-6 sm:p-7 max-w-md w-full text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 id="settings-reset-title" className="font-display text-lg sm:text-xl font-bold text-white">
                Réinitialiser les réglages ?
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Toutes les préférences reviendront aux valeurs par défaut. Vos données de séance et de programme sont conservées.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  data-testid="settings-reset-confirm"
                  onClick={handleResetSettings}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors"
                >
                  Oui, réinitialiser
                </button>
                <button
                  type="button"
                  data-testid="settings-reset-cancel"
                  onClick={() => setSettingsResetOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Profil de l'athlète */}
      <form
        onSubmit={handleSaveProfile}
        className="sport-card rounded-3xl p-6 sm:p-7 space-y-4"
      >
        <div className="flex items-center gap-2 text-violet-300 font-bold">
          <User className="w-5 h-5 text-violet-400" />
          <span>Profil Athlète</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Prénom ou Pseudo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Objectif séances par semaine
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées
            </span>
          ) : <span />}

          <button
            type="submit"
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl shadow-md transition-all"
          >
            Mettre à jour le profil
          </button>
        </div>
      </form>

      {/* Sauvegardes & Confidentialité */}
      <div className="sport-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-violet-300 font-bold">
          <HardDrive className="w-5 h-5 text-violet-400" />
          <span>Stockage Local IndexedDB & Sauvegardes JSON</span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Toutes vos données sont stockées <strong>exclusivement</strong> dans votre navigateur via IndexedDB. Aucune donnée n'est envoyée à un serveur tiers. Pour transférer vos données vers un autre téléphone ou ordinateur, utilisez l'exportation JSON ci-dessous.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            id="btn-export-backup"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-violet-200 transition-all"
          >
            <Download className="w-4 h-4 text-violet-400" />
            <span>Exporter mes données (JSON)</span>
          </button>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              id="btn-import-backup"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-violet-200 transition-all"
            >
              <Upload className="w-4 h-4 text-violet-400" />
              <span>Importer une sauvegarde (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PWA & Architecture Info */}
      <div className="sport-card rounded-3xl p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-violet-300 font-bold">
          <Smartphone className="w-5 h-5 text-violet-400" />
          <span>Engagement SportTrack : 100% Libre & Gratuit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-300 pt-1">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">✓ Zéro Abonnement</div>
            <p className="text-[11px] text-zinc-400">Application gratuite à vie sans frais cachés ni publicités.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">✓ Sans IA & Sans Serveur</div>
            <p className="text-[11px] text-zinc-400">Calculs 100% exécutés sur votre processeur local.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400">✓ PWA Hors Ligne</div>
            <p className="text-[11px] text-zinc-400">Service Worker actif avec mise en cache complète.</p>
          </div>
        </div>
      </div>

      {/* Zone de Danger / Réinitialisation */}
      <div className="rounded-3xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-xl p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Zone de Réinitialisation</span>
        </div>
        <p className="text-xs text-zinc-400">
          Remettre l'application dans son état d'origine avec les séances types.
        </p>

        <button
          onClick={handleResetData}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Réinitialiser les données d'exemple</span>
        </button>
      </div>
    </div>
  );
};
