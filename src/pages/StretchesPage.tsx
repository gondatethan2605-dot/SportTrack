import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Search, Sparkles, Play, Pause, RotateCcw, X, Info } from 'lucide-react';
import { StretchItem } from '../types';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES } from '../data/stretchesData';

const allStretches: StretchItem[] = Array.from(
  new Map(
    [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES].map((s) => [s.id, s])
  ).values()
);

const categoryFor = (s: StretchItem) => {
  const a = s.targetArea.toLowerCase();
  if (a.includes('jambe') || a.includes('quadriceps') || a.includes('mollet') || a.includes('fessier') || a.includes('ischio')) return 'Bas du corps';
  if (a.includes('pector') || a.includes('dos') || a.includes('épaule') || a.includes('triceps') || a.includes('biceps') || a.includes('avant-bras')) return 'Haut du corps';
  return 'Core & tronc';
};

export const StretchesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');
  const [selected, setSelected] = useState<StretchItem | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStretches.filter((s) => {
      const matchesQ = !q || `${s.name} ${s.targetArea} ${s.instruction}`.toLowerCase().includes(q);
      const matchesCat = category === 'Tous' || categoryFor(s) === category;
      return matchesQ && matchesCat;
    });
  }, [query, category]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && seconds === 0) setRunning(false);
  }, [seconds, running]);

  const openStretch = (s: StretchItem) => {
    setSelected(s);
    setSeconds(s.durationSec);
    setRunning(false);
  };

  const closeStretch = () => {
    setSelected(null);
    setRunning(false);
  };

  const resetTimer = () => {
    if (selected) setSeconds(selected.durationSec);
    setRunning(false);
  };

  const format = (n: number) => `00:${String(Math.max(0, n)).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles className="w-4 h-4" /> Bibliothèque
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Étirements</h1>
          <p className="text-sm text-zinc-400 mt-1">Recherche, filtres et fiches détaillées, comme pour les exercices.</p>
        </div>
        <div className="text-xs text-zinc-500">{filtered.length} étirement{filtered.length > 1 ? 's' : ''}</div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un étirement, un muscle ou une zone..."
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['Tous', 'Core & tronc', 'Bas du corps', 'Haut du corps'].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors ${category === c ? 'bg-violet-600/25 text-violet-200 border-violet-500/40' : 'bg-black/20 text-zinc-400 border-white/10 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => openStretch(s)}
            className="text-left bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/30 rounded-2xl p-4 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{categoryFor(s)}</span>
            </div>
            <h2 className="text-sm font-bold text-white mt-3 group-hover:text-violet-200 transition-colors">{s.name}</h2>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{s.instruction}</p>
            <div className="flex items-center gap-3 mt-4 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {s.durationSec}s{s.hasSides ? ' / côté' : ''}</span>
              <span className="truncate">{s.targetArea}</span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14 bg-white/5 border border-dashed border-white/10 rounded-2xl">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300">Aucun étirement trouvé</p>
          <p className="text-xs text-zinc-500 mt-1">Essaie une autre recherche ou un autre filtre.</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onMouseDown={closeStretch}>
          <div className="w-full max-w-2xl bg-[#111118] border border-white/10 rounded-3xl shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Fiche étirement</div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{selected.name}</h2>
                <p className="text-xs text-zinc-400 mt-1">Zone ciblée : <span className="text-zinc-200">{selected.targetArea}</span></p>
              </div>
              <button onClick={closeStretch} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-bold">Durée</div>
                  <div className="text-lg font-bold text-white mt-1">{selected.durationSec}s{selected.hasSides ? ' / côté' : ''}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-bold">Type</div>
                  <div className="text-lg font-bold text-white mt-1">{selected.hasSides ? 'Unilatéral' : 'Bilatéral'}</div>
                </div>
              </div>

              <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-300 mb-2"><Info className="w-4 h-4" /> Comment faire</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.instruction}</p>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-2xl p-5 text-center">
                <div className="text-4xl font-mono font-bold text-white tracking-wider">{format(seconds)}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{selected.hasSides ? 'par côté' : 'maintien'}</div>
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setRunning((v) => !v)} className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2">
                    {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {running ? 'Pause' : 'Démarrer'}
                  </button>
                  <button onClick={resetTimer} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
