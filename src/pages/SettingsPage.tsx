import React, { useState, useRef } from 'react';
import { UserProfile, WorkoutSettings } from '../types';
import { SportTrackStorage } from '../db/indexedDb';
import { parseBackup, BackupError } from '../db/backup';
import {
  loadWorkoutSettings,
  updateWorkoutSettings,
  resetWorkoutSettings,
  SUPPORTED_REST_OPTIONS,
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
} from 'lucide-react';

interface SettingsPageProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onReloadAllData: () => void;
  onSettingsChange?: (settings: WorkoutSettings) => void;
}

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
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      // LOT E — importAllData overwrites every store, but nothing warned the
      // user before the click. Validate the payload first, then ask explicitly.
      let counts: Record<string, number>;
      try {
        const preview = parseBackup(content);
        const n = (k: string) => (Array.isArray(preview.data[k]) ? preview.data[k].length : 0);
        counts = { programs: n('programs'), sessions: n('sessions'), records: n('records'), goals: n('goals'), measurements: n('measurements') };
      } catch (err) {
        setStatusMessage('Erreur : fichier JSON invalide ou corrompu' + (err instanceof BackupError ? ' (' + err.message + ')' : '') + '.');
        return;
      }
      const confirmed = window.confirm(
        'Cette sauvegarde va REMPLACER toutes vos donnees actuelles :\n' +
          '- ' + counts.programs + ' programme(s)\n' +
          '- ' + counts.sessions + ' seance(s)\n' +
          '- ' + counts.records + ' record(s)\n' +
          '- ' + counts.goals + ' objectif(s)\n' +
          '- ' + counts.measurements + ' mesure(s)\n\n' +
          'Continuer ? Cette action est irreversible.',
      );
      if (!confirmed) {
        setStatusMessage('Importation annulee : vos donnees actuelles sont intactes.');
        return;
      }
      const success = await SportTrackStorage.importAllData(content);
      if (success) {
        setStatusMessage('Importation réussie ! Vos données ont été restaurées.');
        onReloadAllData();
      } else {
        setStatusMessage('Erreur : le fichier JSON est invalide ou corrompu.');
      }
    };
    reader.onerror = () => {
      setStatusMessage('Erreur : le fichier sélectionné n’a pas pu être lu.');
    };
    reader.readAsText(file);
    // LOT E — clearing the input lets the user re-select the same file after a
    // cancel, instead of the change event never firing again.
    input.value = '';
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        'Attention : cette action SUPPRIME definitivement vos seances, records, objectifs, mesures et ' +
          'programmes personnalises, puis restaure le programme et la bibliotheque par defaut.\n\n' +
          "Elle est irreversible. Continuez ?"
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

      {/* LOT H — Segment Données / Réglages (reset preferences only, never data) */}
      <section aria-labelledby="settings-section-settings-reset" className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm" id="settings-section-settings-reset">
          <RefreshCw className="w-4 h-4 text-zinc-400" />
          <span>Réinitialiser les réglages</span>
        </div>
        <p className="text-xs text-zinc-400">
          Remet toutes les préférences (sons, voix, vibrations, repos, affichage) aux valeurs par défaut.
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
          Efface definitivement vos seances, records, objectifs, mesures et programmes personnalises, puis
          restaure le programme et la bibliotheque par defaut. Exportez d'abord une sauvegarde JSON.
        </p>

        <button
          onClick={handleResetData}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Effacer mes donnees et restaurer les valeurs par defaut</span>
        </button>
      </div>
    </div>
  );
};
