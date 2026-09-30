import React, { useEffect, useRef } from 'react';
import { NavPage } from '../types';
import {
  Home,
  Layers,
  Dumbbell,
  PlayCircle,
  Calendar,
  BarChart3,
  Target,
  TrendingUp,
  Settings,
  Users,
  X,
  Sparkles,
  Menu,
  BookOpen,
} from 'lucide-react';

interface NavigationProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onOpenMobileMenu?: () => void;
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
  { id: 'seance', label: 'Séance', icon: PlayCircle, badge: 'Direct' },
  { id: 'calendrier', label: 'Calendrier', icon: Calendar },
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'objectifs', label: 'Objectifs', icon: Target },
  { id: 'progression', label: 'Progression', icon: TrendingUp },
  { id: 'profil', label: 'Profil', icon: Users },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = React.memo(function Navigation({
  currentPage,
  onNavigate,
  mobileMenuOpen,
  onCloseMobileMenu,
  onOpenMobileMenu,
}) {
  // LOT 11 — intuitive UX: the desktop sidebar is split into three labelled
  // groups ("Entraînement" / "Suivi" / "Profil") so the user finds each page by
  // intent, not by scrolling an undifferentiated list. Routes are UNCHANGED.
  const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Entraînement',
      items: [
        navItems[0], // accueil
        navItems[1], // programme
        navItems[2], // exercices
        navItems[3], // seance
      ],
    },
    {
      label: 'Suivi',
      items: [
        navItems[6], // progression
        navItems[4], // statistiques
        navItems[5], // objectifs
        navItems[7], // calendrier
      ],
    },
    {
      label: 'Profil',
      items: [
        navItems[8], // profil
        navItems[9], // parametres
      ],
    },
  ];

  // Refonte mobile — the slide-over menu groups the same pages in the order the
  // mobile spec expects (Entraînement / Suivi / Profil). The sidebar above keeps
  // its historical order untouched (Desktop 1440 preserved 1:1).
  const drawerGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Entraînement',
      items: [navItems[0], navItems[1], navItems[3], { ...navItems[2], label: 'Bibliothèque' }],
    },
    {
      label: 'Suivi',
      items: [navItems[7], navItems[6], navItems[5], navItems[4]],
    },
    {
      label: 'Profil',
      items: [navItems[8], navItems[9]],
    },
  ];

  // Mobile drawer accessibility: Escape closes, Tab is trapped, the close button
  // receives initial focus, focus is restored to the trigger on close and the
  // page behind is locked against scrolling while the drawer is open.
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
    }, 40);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseMobileMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      const scope = drawerRef.current;
      if (!scope) return;
      const focusables: HTMLElement[] = [];
      scope
        .querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        .forEach((el) => {
          if (!el.hasAttribute('disabled')) focusables.push(el);
        });
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!scope.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [mobileMenuOpen, onCloseMobileMenu]);

  const renderNavButton = (item: NavItem, onClick?: () => void) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        id={`nav-link-${item.id}`}
        data-testid={item.id === 'parametres' ? 'settings-nav' : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          onNavigate(item.id);
          onClick?.();
        }}
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
  };

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-col w-64 shrink-0 bg-white/5 backdrop-blur-xl border-r border-white/10 min-h-[calc(100vh-65px)] p-4 justify-between overflow-y-auto"
      >
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-400/90">
                {group.label}
              </div>
              <div className="space-y-1">{group.items.map((item) => renderNavButton(item))}</div>
            </div>
          ))}
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
          aria-current={currentPage === 'accueil' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 px-3 rounded-xl transition-colors ${
            currentPage === 'accueil' ? 'text-violet-400' : 'text-zinc-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className={`text-[10px] ${currentPage === 'accueil' ? 'font-bold' : ''}`}>Accueil</span>
        </button>

        <button
          id="mobile-nav-programme"
          onClick={() => onNavigate('programme')}
          aria-current={currentPage === 'programme' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 px-3 rounded-xl transition-colors ${
            currentPage === 'programme' ? 'text-violet-400' : 'text-zinc-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className={`text-[10px] ${currentPage === 'programme' ? 'font-bold' : ''}`}>Programme</span>
        </button>

        {/* Highlighted Workout Action */}
        <button
          id="mobile-nav-seance"
          onClick={() => onNavigate('seance')}
          aria-label="Séance"
          aria-current={currentPage === 'seance' ? 'page' : undefined}
          className="flex flex-col items-center justify-center min-h-11 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-violet-900/60 group-hover:scale-105 transition-transform border border-white/20">
            <PlayCircle className="w-6 h-6 fill-white/20 text-white" />
          </div>
          <span className="text-[10px] font-bold text-violet-300 mt-0.5">Séance</span>
        </button>

        <button
          id="mobile-nav-bibliotheque"
          onClick={() => onNavigate('exercices')}
          aria-current={currentPage === 'exercices' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 px-3 rounded-xl transition-colors ${
            currentPage === 'exercices' ? 'text-violet-400' : 'text-zinc-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className={`text-[10px] ${currentPage === 'exercices' ? 'font-bold' : ''}`}>Bibliothèque</span>
        </button>

        <button
          id="mobile-nav-all-menu"
          onClick={() => onOpenMobileMenu?.()}
          aria-label="Ouvrir le menu de navigation"
          className="flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11 px-3 rounded-xl transition-colors text-zinc-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer / Slide-Over — full access to all 9 pages, grouped by
          intent (Entraînement / Suivi / Profil). Accessibility: backdrop click
          closes, Escape closes, Tab is trapped, body scroll is locked, focus
          moves to the close button then returns to the trigger on close. */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseMobileMenu();
          }}
        >
          <div
            ref={drawerRef}
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-drawer-title"
            className="w-4/5 max-w-sm bg-[#08080c]/90 backdrop-blur-2xl border-l border-white/10 h-full flex flex-col justify-between overflow-y-auto"
          >
            <div className="p-5 pb-1">
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
                  data-drawer-close
                  onClick={onCloseMobileMenu}
                  className="w-11 h-11 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white bg-white/5 border border-white/10"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {drawerGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-400/90">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
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
                            className={`w-full flex items-center justify-between min-h-11 px-3.5 rounded-xl text-sm font-semibold transition-colors ${
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
                ))}
              </div>
            </div>

            <div className="pt-4 pb-2 border-t border-white/10 text-center px-5">
              <p className="text-xs text-violet-300/90 font-medium">SportTrack • PWA 100% Hors Ligne</p>
              <p className="text-[10px] text-zinc-500 mt-1">Données sauvegardées sur votre appareil</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
