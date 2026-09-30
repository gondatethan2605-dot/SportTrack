import React, { useMemo, useState, useCallback } from 'react';
import { Clock3, Search, Sparkles } from 'lucide-react';
import { StretchItem } from '../types';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES, ALL_INDIVIDUAL_STRETCHES } from '../data/stretchesData';
import { StretchDetailModal } from '../components/StretchDetailModal';

const allStretches: StretchItem[] = Array.from(
  new Map(
    [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES, ...ALL_INDIVIDUAL_STRETCHES].map((s) => [s.id, s])
  ).values()
);

const categoryFor = (s: StretchItem) => {
  const a = s.targetArea.toLowerCase();
  if (a.includes('jambe') || a.includes('quadriceps') || a.includes('mollet') || a.includes('fessier') || a.includes('ischio') || a.includes('hanche') || a.includes('cuisse') || a.includes('adduct') || a.includes('abduct') || a.includes('cheville') || a.includes('lombaire')) return 'Bas du corps';
  if (a.includes('pector') || a.includes('dos') || a.includes('épaule') || a.includes('triceps') || a.includes('biceps') || a.includes('avant-bras') || a.includes('cou') || a.includes('trapèze') || a.includes('poignet') || a.includes('thorax')) return 'Haut du corps';
  return 'Core & tronc';
};

// LOT 13 — memoized stretch card: during a timer tick (modal open) or while the
// user types in the search box, the ~74 grid cells keep their DOM node and are
// only reconciled when the filtered list actually changes.
const StretchCard = React.memo(function StretchCard({
  s,
  onOpen,
}: {
  s: StretchItem;
  onOpen: (s: StretchItem) => void;
}) {
  return (
    <button
      onClick={() => onOpen(s)}
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
  );
});

export const StretchesPage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');
  const [selected, setSelected] = useState<StretchItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStretches.filter((s) => {
      const matchesQ = !q || `${s.name} ${s.targetArea} ${s.instruction}`.toLowerCase().includes(q);
      const matchesCat = category === 'Tous' || categoryFor(s) === category;
      return matchesQ && matchesCat;
    });
  }, [query, category]);

  const openStretch = useCallback((s: StretchItem) => {
    setSelected(s);
  }, []);

  const closeStretch = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-6xl mx-auto space-y-6 pb-10'}>
      {!embedded && (
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
      )}

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
          <StretchCard key={s.id} s={s} onOpen={openStretch} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14 bg-white/5 border border-dashed border-white/10 rounded-2xl">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300">Aucun étirement trouvé</p>
          <p className="text-xs text-zinc-500 mt-1">Essaie une autre recherche ou un autre filtre.</p>
        </div>
      )}

      {selected && <StretchDetailModal stretch={selected} onClose={closeStretch} />}
    </div>
  );
};