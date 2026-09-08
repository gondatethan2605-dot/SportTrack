import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Pour installer SportTrack sur votre appareil : ouvrez le menu de votre navigateur (trois petits points ou bouton de partage) et appuyez sur 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
      return;
    }
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div
      id="pwa-install-banner"
      className="bg-violet-950/40 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 text-white shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-violet-600/30 border border-violet-500/30 text-violet-300 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">Installez SportTrack sur votre écran d’accueil</span>
            <span className="hidden sm:inline text-zinc-400 ml-2 text-xs">
              — Accès direct, plein écran et fonctionnement 100% hors ligne garanti.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-install-pwa"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer</span>
          </button>
          <button
            id="btn-dismiss-install-banner"
            onClick={() => setShowBanner(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            aria-label="Fermer la bannière"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
