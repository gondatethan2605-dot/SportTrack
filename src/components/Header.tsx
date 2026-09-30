import React, { useState, useEffect } from 'react';
import { UserProfile, NavPage } from '../types';
import { Flame, Zap, Wifi, WifiOff, Menu } from 'lucide-react';

interface HeaderProps {
  profile: UserProfile;
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(function Header({
  profile,
  currentPage,
  onNavigate,
  onOpenMobileMenu,
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const xpPercentage = Math.min(100, Math.round((profile.currentXp / profile.nextLevelXp) * 100));

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-[#050505]/70 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="btn-brand-home"
            onClick={() => onNavigate('accueil')}
            className="flex items-center gap-2 group sm:gap-2.5 text-left focus:outline-none min-w-0"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-violet-900/30 group-hover:scale-105 transition-transform">
              <img src="/icon-192.png" alt="Logo SportTrack" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base min-[430px]:text-xl sm:text-2xl tracking-wider text-white font-bold uppercase leading-none">
                  Sport<span className="text-violet-400">Track</span>
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold tracking-widest uppercase bg-white/10 backdrop-blur-md text-violet-300 border border-white/15 px-1.5 py-0.5 rounded-lg">
                  PWA
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-zinc-400 font-medium tracking-tight">100% Hors Ligne & Local</p>
            </div>
          </button>
        </div>

        {/* Athletic Gamification HUD / Status Bar */}
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
          {/* Day Streak (desktop only — kept compact on mobile so the header
              stays logo + level + menu; the streak lives on the home page) */}
          <div
            id="hud-streak"
            className="hidden md:flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-white/10 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 shadow-sm"
            title={`${profile.streakDays} jours consécutifs d'entraînement`}
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="font-bold text-amber-200">{profile.streakDays}</span>
            <span className="hidden sm:inline text-zinc-400 text-[11px]">j. série</span>
          </div>

          {/* Level & XP bar — LOT 11: navigates to the progression page (the
              logical destination for level/XP detail) instead of the stats page */}
          <div
            id="hud-level-xp"
            onClick={() => onNavigate('progression')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate('progression');
              }
            }}
            aria-label={`Niveau ${profile.level} - ${profile.currentXp}/${profile.nextLevelXp} XP. Voir ma progression.`}
            className="cursor-pointer flex items-center gap-1.5 sm:gap-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 px-2 sm:px-3 py-1.5 rounded-xl transition-all"
            title={`Niveau ${profile.level} - ${profile.currentXp}/${profile.nextLevelXp} XP`}
          >
            <div className="flex items-center gap-1 text-violet-300">
              <Zap className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />
              <span className="font-bold text-xs">NV.{profile.level}</span>
            </div>
            <div className="hidden md:flex flex-col gap-1 w-24">
              <div className="flex justify-between text-[10px] text-zinc-400 leading-none">
                <span>XP</span>
                <span className="text-violet-300 font-medium">{xpPercentage}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Network / storage indicator — LOT 11 wording: the app is fully local,
              so "online" states that data stays local, "offline" that nothing is
              lost. Shown from sm up (the mobile header stays minimal). */}
          <div
            id="hud-network-status"
            className={`hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xl border font-medium backdrop-blur-md ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
            }`}
            title={isOnline ? 'En ligne — vos données restent stockées localement (IndexedDB)' : 'Aucune connexion — vos données restent disponibles localement'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="hidden min-[520px]:inline">Données locales</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="hidden min-[520px]:inline">Mode hors ligne</span>
              </>
            )}
          </div>

          {/* Mobile All Menu Drawer Button */}
          <button
            id="btn-open-mobile-menu"
            onClick={onOpenMobileMenu}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-md text-zinc-200 border border-white/10 hover:bg-white/10 transition-colors shrink-0"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="w-5 h-5 text-violet-300" />
          </button>
        </div>
      </div>
    </header>
  );
});
