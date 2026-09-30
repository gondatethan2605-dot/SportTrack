import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, X, Info } from 'lucide-react';
import { StretchItem } from '../types';

// Fiche d'un étirement réutilisée par la bibliothèque UNIFIÉE (ExercisesPage)
// ET par la page Étirements (StretchesPage) : commencement, durée, pause,
// réinitialisation, type unilatéral/bilatéral et consigne — un seul point de
// vérité pour le lancement d'un étirement depuis sa fiche.
export const StretchDetailModal: React.FC<{
  stretch: StretchItem;
  onClose: () => void;
}> = ({ stretch, onClose }) => {
  const [seconds, setSeconds] = useState(stretch.durationSec);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSeconds(stretch.durationSec);
    setRunning(false);
  }, [stretch]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && seconds === 0) setRunning(false);
  }, [seconds, running]);

  const format = (n: number) => `00:${String(Math.max(0, n)).padStart(2, '0')}`;

  return (
    <div
      data-testid="stretch-detail-modal"
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#111118] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">
              Fiche étirement
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{stretch.name}</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Zone ciblée : <span className="text-zinc-200">{stretch.targetArea}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la fiche étirement"
            className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase text-zinc-500 font-bold">Durée</div>
              <div className="text-lg font-bold text-white mt-1">
                {stretch.durationSec}s{stretch.hasSides ? ' / côté' : ''}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase text-zinc-500 font-bold">Type</div>
              <div className="text-lg font-bold text-white mt-1">
                {stretch.hasSides ? 'Unilatéral' : 'Bilatéral'}
              </div>
            </div>
          </div>

          <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-300 mb-2">
              <Info className="w-4 h-4" /> Comment faire
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{stretch.instruction}</p>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl font-mono font-bold text-white tracking-wider">{format(seconds)}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
              {stretch.hasSides ? 'par côté' : 'maintien'}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setRunning((v) => !v)}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Commencer'}
              </button>
              <button
                onClick={() => {
                  setSeconds(stretch.durationSec);
                  setRunning(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};