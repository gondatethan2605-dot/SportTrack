import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, WorkoutSession, PersonalRecord, Goal } from '../types';
import {
  Users,
  Share2,
  Download,
  Copy,
  Trophy,
  Medal,
  Flame,
  Target,
  Trash2,
  Upload,
  CheckCircle2,
  Info,
  Sparkles,
  ChevronDown,
  UserRoundPlus,
  Zap,
  Dumbbell,
  Clock,
  Activity,
} from 'lucide-react';
import {
  buildSocialProfile,
  serializeSocialProfile,
  parseSocialProfile,
  SocialError,
  loadSocialFriends,
  saveSocialFriends,
  buildFriendEntry,
  upsertFriend,
  removeFriend,
  rankSocialProfiles,
  compareSocialProfiles,
  computeSocialChallengeProgress,
  buildSocialShareText,
  buildSocialChallengeText,
  SOCIAL_CHALLENGES,
  SOCIAL_RANK_METRICS,
  type SocialStats,
  type SocialFriendEntry,
  type SocialRankMetric,
  type SocialChallengeProgress,
} from '../utilsSocial';

interface SocialPageProps {
  profile: UserProfile;
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  goals: Goal[];
}

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  EMPTY: 'Fichier vide.',
  TOO_LARGE: 'Fichier trop volumineux.',
  INVALID_JSON: 'JSON invalide.',
  NOT_OBJECT: 'Format de fichier non reconnu.',
  UNKNOWN_VERSION: 'Version de format inconnue ou non prise en charge.',
  WRONG_TYPE: 'Ce fichier n’est pas un profil social SportTrack.',
  WRONG_APP: 'Ce fichier ne provient pas de SportTrack.',
  BAD_PROFILE: 'Profil invalide : champs manquants ou incorrects.',
  NON_FINITE: 'Profil invalide : valeurs numériques non valides.',
};

export const SocialPage: React.FC<SocialPageProps> = ({ profile, sessions, records, goals }) => {
  const [friends, setFriends] = useState<SocialFriendEntry[]>(() => loadSocialFriends());
  const [rankMetric, setRankMetric] = useState<SocialRankMetric>('level');
  const [compareAlias, setCompareAlias] = useState<string>('');
  const [importAlias, setImportAlias] = useState('');
  const [pendingImport, setPendingImport] = useState<{ level: number; sessions: number; xp: number } | null>(null);
  const [pendingFile, setPendingFile] = useState<ReturnType<typeof parseSocialProfile> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const myFile = useMemo(() => buildSocialProfile({ profile, sessions, records, goals }), [profile, sessions, records, goals]);
  const myStats: SocialStats = myFile.profile;

  const meRow = useMemo(
    () => ({ id: 'moi', alias: 'Moi', stats: myStats, isMe: true }),
    [myStats]
  );

  const leaderboard = useMemo(() => {
    const rows = [meRow, ...friends.map((f) => ({ id: f.id, alias: f.alias, stats: f.profile }))];
    return rankSocialProfiles(rows, rankMetric);
  }, [meRow, friends, rankMetric]);

  const compareFriend = useMemo(
    () => friends.find((f) => f.alias === compareAlias) || friends[0] || null,
    [friends, compareAlias]
  );
  const comparison = useMemo(
    () => (compareFriend ? compareSocialProfiles(myStats, compareFriend.profile) : []),
    [myStats, compareFriend]
  );

  const challenges = useMemo(() => computeSocialChallengeProgress(sessions, records), [sessions, records]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const shareTitle = `Profil SportTrack — Niveau ${myStats.level} · ${myStats.sessions} séances`;

  const handleShare = async () => {
    const text = buildSocialShareText(myStats);
    const nav = navigator as Navigator & { share?: (data: { text: string; title?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: shareTitle, text });
        setToast('Profil partagé.');
        return;
      } catch {
        // share cancelled or unsupported on this device -> clipboard fallback
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('Texte du profil copié.');
    } catch {
      setToast('Impossible de copier (autorisation requise).');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildSocialShareText(myStats));
      setToast('Texte du profil copié.');
    } catch {
      setToast('Impossible de copier (autorisation requise).');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([serializeSocialProfile(myFile)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sporttrack-profil-social-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast('Profil exporté en fichier JSON (léger, non sauvegardé dans l’app).');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      try {
        const parsed = parseSocialProfile(text);
        setPendingFile(parsed);
        setPendingImport({ level: parsed.profile.level, sessions: parsed.profile.sessions, xp: parsed.profile.xp });
        setImportError(null);
        setImportSuccess(false);
      } catch (e) {
        setPendingFile(null);
        setPendingImport(null);
        setImportSuccess(false);
        setImportError(e instanceof SocialError ? SOCIAL_ERROR_MESSAGES[e.code] || 'Fichier invalide.' : 'Fichier invalide ou illisible.');
      }
    };
    reader.onerror = () => {
      setPendingFile(null);
      setPendingImport(null);
      setImportSuccess(false);
      setImportError('Impossible de lire le fichier.');
    };
    reader.readAsText(file);
  };

  const handleAddFriend = () => {
    const alias = importAlias.trim();
    if (!alias || !pendingFile) return;
    const entry = buildFriendEntry(alias, pendingFile);
    const next = upsertFriend(friends, entry);
    if (!saveSocialFriends(next)) setToast('Stockage local indisponible.');
    setFriends(next);
    setPendingFile(null);
    setPendingImport(null);
    setImportAlias('');
    setImportSuccess(true);
    setImportError(null);
    setToast(`Ami « ${entry.alias} » ajouté (affichage uniquement, aucune donnée modifiée).`);
  };

  const handleRemoveFriend = (id: string) => {
    const next = removeFriend(friends, id);
    saveSocialFriends(next);
    setFriends(next);
    if (compareAlias !== '' && !next.some((f) => f.id === id) && friends.find((f) => f.id === id)?.alias === compareAlias) {
      setCompareAlias('');
    }
    setToast('Ami retiré de la liste locale.');
  };

  const handleShareChallenge = async (p: SocialChallengeProgress) => {
    const text = buildSocialChallengeText(p);
    const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text });
        setToast('Défi partagé.');
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('Texte du défi copié.');
    } catch {
      setToast('Impossible de copier (autorisation requise).');
    }
  };

  const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <div id="page-social" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
            Profil Sportif & Social
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Un profil partageable et des défis amicaux, 100% locaux : aucun serveur, aucune donnée personnelle transmise.
        </p>
      </div>

      {/* My profile card */}
      <div className="sport-card rounded-3xl p-6 space-y-5" data-testid="social-my-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-bold tracking-wider text-violet-400">Votre profil</div>
              <div className="font-display text-3xl font-bold text-white" data-testid="social-level">
                Niveau {myStats.level}
              </div>
              <div className="text-xs text-zinc-400">XP totale : {myStats.xp.toLocaleString('fr-FR')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Partage du profil">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-lg transition-all"
              data-testid="social-share"
              aria-label="Partager mon profil (application de partage ou copie)"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager</span>
            </button>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 font-bold text-xs uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all"
              data-testid="social-copy"
              aria-label="Copier la description textuelle de mon profil"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copier</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-violet-300 border border-white/10 font-bold text-xs uppercase tracking-wider px-3 py-2.5 rounded-2xl transition-all"
              data-testid="social-export"
              aria-label="Exporter mon profil en fichier JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricMini label="Séances validées" value={fmtNum(myStats.sessions)} icon={<Target className="w-3.5 h-3.5 text-violet-300" />} />
          <MetricMini label="Records (PR)" value={fmtNum(myStats.records)} icon={<Trophy className="w-3.5 h-3.5 text-amber-300" />} />
          <MetricMini label="Badges" value={fmtNum(myStats.badges)} icon={<Medal className="w-3.5 h-3.5 text-emerald-300" />} />
          <MetricMini label="Volume total" value={`${fmtNum(myStats.volumeKg)} kg`} icon={<Dumbbell className="w-3.5 h-3.5 text-sky-300" />} />
          <MetricMini label="Durée totale" value={`${fmtNum(myStats.durationMinutes)} min`} icon={<Clock className="w-3.5 h-3.5 text-indigo-300" />} />
          <MetricMini label="Série en cours" value={`${fmtNum(myStats.streakDays)} j`} icon={<Flame className="w-3.5 h-3.5 text-amber-300" />} />
          <MetricMini label="Défis hebdo réussis" value={fmtNum(myStats.challengesCompleted)} icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />} />
          <MetricMini label="Séances cette semaine" value={fmtNum(myStats.weeklySessions)} icon={<Activity className="w-3.5 h-3.5 text-violet-300" />} />
        </div>

        <p className="text-[11px] text-zinc-500">
          Le fichier exporté contient uniquement des chiffres sportifs : aucun nom, aucune adresse, aucun email, aucun identifiant interne.
        </p>
      </div>

      {/* Leaderboard */}
      <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="social-leaderboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Classement local</h2>
          </div>
          <div className="relative">
            <select
              value={rankMetric}
              onChange={(e) => setRankMetric(e.target.value as SocialRankMetric)}
              className="appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              aria-label="Métrique du classement"
              data-testid="social-rank-metric"
            >
              {SOCIAL_RANK_METRICS.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-white">{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400">
            Aucun participant pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((row, idx) => (
              <div
                key={row.id}
                data-testid={row.isMe ? 'social-leaderboard-me' : `social-leaderboard-${row.alias}`}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl border ${
                  row.isMe ? 'bg-violet-600/10 border-violet-500/30' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
                    {idx === 0 ? (
                      <Medal className="w-5 h-5 text-amber-400" />
                    ) : idx === 1 ? (
                      <Medal className="w-5 h-5 text-zinc-300" />
                    ) : idx === 2 ? (
                      <Medal className="w-5 h-5 text-orange-400" />
                    ) : (
                      <span className="text-zinc-500">{idx + 1}</span>
                    )}
                  </span>
                  <span className="text-sm font-bold text-zinc-100 truncate">
                    {row.alias}
                    {row.isMe && <span className="text-[10px] text-violet-300 font-semibold uppercase ml-1.5">(vous)</span>}
                  </span>
                </div>
                <span className="font-display text-xl font-bold text-violet-300">
                  {fmtNum(row.stats?.[rankMetric] || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-zinc-500">Tri selon la métrique choisie — données locales uniquement.</p>
      </div>

      {/* Comparison */}
      <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="social-compare">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Comparer avec un ami</h2>
          </div>
          {friends.length > 0 && (
            <div className="relative">
              <select
                value={compareFriend?.alias || ''}
                onChange={(e) => setCompareAlias(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                aria-label="Choisir un ami à comparer"
                data-testid="social-compare-select"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.alias} className="bg-zinc-900 text-white">{f.alias}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {friends.length === 0 || !compareFriend ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
            <p className="font-semibold text-zinc-300 text-sm">Aucun profil ami importé.</p>
            <p className="text-zinc-500">Importez le profil JSON partagé par un(e) ami(e) (ici-bas) pour comparer vos performances.</p>
          </div>
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="Comparaison des performances">
            <table className="w-full text-xs" data-testid="social-compare-table">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="text-left py-2 pr-3 font-semibold">Métrique</th>
                  <th className="text-left py-2 pr-3 font-semibold">Vous</th>
                  <th className="text-left py-2 pr-3 font-semibold">{compareFriend.alias}</th>
                  <th className="text-left py-2 pr-3 font-semibold">Écart</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.key} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-zinc-300">{row.label}</td>
                    <td className="py-2 pr-3 font-bold text-white">
                      {fmtNum(row.mine)}
                      {row.unit && <span className="text-zinc-500 font-normal"> {row.unit}</span>}
                    </td>
                    <td className="py-2 pr-3 font-bold text-zinc-200">
                      {fmtNum(row.friend)}
                      {row.unit && <span className="text-zinc-500 font-normal"> {row.unit}</span>}
                    </td>
                    <td className="py-2 pr-3">
                      {row.delta === null || Math.abs(row.delta) < 1e-9 ? (
                        <span className="text-zinc-500">— égal</span>
                      ) : (
                        <span className={`font-bold ${row.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.delta > 0 ? '▲ +' : '▼ '}{fmtNum(row.delta)}
                          {row.percent !== null && row.percent !== 0 && (
                            <span className="text-[10px]"> ({row.percent > 0 ? '+' : ''}{row.percent}%)</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-zinc-500">
          Comparaison de chiffres sportifs uniquement — elle ne modifie jamais vos données ni votre XP.
        </p>
      </div>

      {/* Social challenges */}
      <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="social-challenges">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Défis amicaux</h2>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/40 text-emerald-300">
            aucune XP
          </span>
        </div>

        <div className="space-y-3">
          {challenges.map((c) => (
            <div key={c.definition.id} data-testid={`social-challenge-${c.definition.id}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className={`text-sm font-bold ${c.completed ? 'text-emerald-300' : 'text-zinc-100'}`}>
                    {c.completed && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />}
                    {c.definition.name}
                  </div>
                  <div className="text-[11px] text-zinc-500">{c.definition.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-300 font-semibold">
                    {Math.min(c.current, c.definition.target)} / {c.definition.target}
                  </span>
                  <button
                    onClick={() => handleShareChallenge(c)}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-bold text-[11px] uppercase tracking-wider px-3 py-2 rounded-xl transition-all"
                    data-testid={`social-challenge-share-${c.definition.id}`}
                    aria-label={`Partager le défi ${c.definition.name}`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Partager</span>
                  </button>
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${c.completed ? 'bg-emerald-400' : 'bg-violet-400'} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${c.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-zinc-500">
          Défis purement fun : les relever ne rapporte aucune XP et n’ajoute aucune source de progression en plus du système existant.
        </p>
      </div>

      {/* Friends + import */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Friend list */}
        <div className="lg:col-span-7 sport-card rounded-3xl p-6 space-y-4" data-testid="social-friends">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Mes amis</h2>
            <span className="text-xs text-zinc-500">({friends.length})</span>
          </div>

          {friends.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400 space-y-2">
              <UserRoundPlus className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
              <p className="font-semibold text-zinc-300 text-sm">Aucun ami enregistré.</p>
              <p className="text-zinc-500">Importez le profil d’un(e) ami(e) via le fichier JSON qu’il/elle vous a partagé.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div
                  key={f.id}
                  data-testid={`social-friend-${f.alias}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-100 truncate">{f.alias}</div>
                    <div className="text-[11px] text-zinc-500">
                      Niveau {f.profile.level} · {f.profile.sessions} séances · {f.profile.records} records · importé le{' '}
                      {new Date(f.importedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(f.id)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                    data-testid={`social-friend-remove-${f.alias}`}
                    aria-label={`Retirer ${f.alias} de ma liste`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Import */}
        <div className="lg:col-span-5 sport-card rounded-3xl p-6 space-y-4" data-testid="social-import">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">Importer un profil</h2>
          </div>

          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Fichier de profil partagé (.json)
          </label>
          <input
            type="file"
            accept=".json,application/json,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.currentTarget.value = '';
            }}
            className="block w-full text-xs text-zinc-300 file:mr-3 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-violet-600 file:text-white file:text-xs file:font-bold file:cursor-pointer"
            aria-label="Choisir un fichier de profil ami"
            data-testid="social-import-input"
          />

          {importError && (
            <div role="alert" className="rounded-2xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 text-xs text-rose-300" data-testid="social-import-error">
              {importError}
            </div>
          )}

          {pendingImport && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300 space-y-1" data-testid="social-import-preview">
              <div className="font-bold uppercase tracking-wider text-[10px]">Profil détecté</div>
              <div>Niveau {pendingImport.level} · {pendingImport.sessions} séances · {pendingImport.xp.toLocaleString('fr-FR')} XP</div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="social-alias" className="block text-xs font-semibold text-zinc-300">
              Surnom local de votre ami(e)
            </label>
            <input
              id="social-alias"
              type="text"
              maxLength={40}
              value={importAlias}
              onChange={(e) => setImportAlias(e.target.value)}
              placeholder="Ex : Nadia"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              data-testid="social-alias-input"
            />
            <button
              onClick={handleAddFriend}
              disabled={!pendingImport || !importAlias.trim()}
              className="w-full flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-2xl shadow transition-all"
              data-testid="social-friend-add"
            >
              <UserRoundPlus className="w-4 h-4" />
              <span>Ajouter cet ami</span>
            </button>
          </div>

          {importSuccess && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300" data-testid="social-import-success">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              Profil importé pour comparaison locale uniquement.
            </div>
          )}

          <div className="flex items-start gap-2 pt-1 text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-400" />
            <p>
              Seuls les fichiers valides (format version 1, app SportTrack, type « social-profile ») sont acceptés. Le profil
              importé n’est jamais écrit dans la base de l’app : il ne peut ni modifier vos séances, records, programmes,
              objectifs ou votre XP.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] bg-white/10 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl"
          data-testid="social-toast"
        >
          {toast}
        </div>
      )}
    </div>
  );
};

function MetricMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display text-lg font-bold text-white">{value}</div>
    </div>
  );
}