import React from 'react';
import { NavPage } from '../types';
import {
  Home,
  Layers,
  Dumbbell,
  StretchHorizontal,
  PlayCircle,
  Calendar,
  BarChart3,
  Target,
  TrendingUp,
  Settings,
  Users,
  X,
  Sparkles,
} from 'lucide-react';

interface NavigationProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const navItems: NavItem[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'programme', label: 'Programme', icon: Layers },
  { id: 'exercices', label: 'Exercices', icon: Dumbbell },
  { id: 'etirements', label: 'Étirements', icon: StretchHorizontal },
  { id: 'seance', label: 'Séance', icon: PlayCircle, badge: 'Direct' },
  { id: 'calendrier', label: 'Calendrier', icon: Calendar },
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'progression', label: 'Progression', icon: TrendingUp },
  { id: 'profil', label: 'Profil', icon: Users },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  mobileMenuOpen,
  onCloseMobileMenu,
}) => {
  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-col w-64 shrink-0 bg-white/5 backdrop-blur-xl border-r border-white/10 min-h-[calc(100vh-65px)] p-4 justify-between"
      >
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-violet-400/90">
            Menu Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                data-testid={item.id === 'parametres' ? 'settings-nav' : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-900/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-violet-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-lg ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/10 text-violet-300 border border-white/10'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Motivational Card in sidebar */}
        <div className="mt-6 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-2 text-violet-300 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Discipline & Focus</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Chaque répétition compte. Aucun serveur, aucune pub, 100% votre performance.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 core shortcuts) */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/85 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around"
      >
        <button
          id="mobile-nav-accueil"
          onClick={() => onNavigate('accueil')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentPage === 'accueil' ? 'text-violet-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Accueil</span>
        </button>

        <button
          id="mobile-nav-programme"
          onClick={() => onNavigate('programme')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentPage === 'programme' ? 'text-violet-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Programme</span>
        </button>

        {/* Highlighted Workout Action */}
        <button
          id="mobile-nav-seance"
          onClick={() => onNavigate('seance')}
          className="flex flex-col items-center -mt-5 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-violet-900/60 group-hover:scale-105 transition-transform border border-white/20">
            <PlayCircle className="w-6 h-6 fill-white/20 text-white" />
          </div>
          <span className="text-[10px] font-bold text-violet-300 mt-0.5">Séance</span>
        </button>

        <button
          id="mobile-nav-statistiques"
          onClick={() => onNavigate('statistiques')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentPage === 'statistiques' ? 'text-violet-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Stats</span>
        </button>

        <button
          id="mobile-nav-all-menu"
          onClick={() => onNavigate('parametres')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentPage === 'parametres' ? 'text-violet-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Réglages</span>
        </button>
      </nav>

      {/* Mobile Drawer / Slide-Over for full access to all 9 pages */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in">
<div
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-drawer-title"
              className="w-4/5 max-w-sm bg-[#08080c]/90 backdrop-blur-2xl border-l border-white/10 h-full p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center">
                      <img src="/icon-192.png" alt="Logo SportTrack" className="w-full h-full object-cover" draggable={false} />
                    </div>
                    <span id="mobile-drawer-title" className="font-display text-xl font-bold tracking-wider text-white uppercase">
                      Navigation
                    </span>
                  </div>
                <button
                  onClick={onCloseMobileMenu}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-white/5 border border-white/10"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      data-testid={item.id === 'parametres' ? 'settings-nav' : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        onNavigate(item.id);
                        onCloseMobileMenu();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-sm'
                          : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-lg bg-violet-600 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-violet-300/90 font-medium">SportTrack • PWA 100% Hors Ligne</p>
              <p className="text-[10px] text-zinc-500 mt-1">Données sauvegardées sur votre appareil</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
