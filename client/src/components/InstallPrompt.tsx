import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if already dismissed recently
    const lastDismissed = localStorage.getItem('fitpro-install-dismissed');
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Don't show again for 7 days
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setTimeout(() => setShowIOS(true), 3000);
      return;
    }

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowAndroid(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    setDismissed(true);
    localStorage.setItem('fitpro-install-dismissed', Date.now().toString());
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  // Android install prompt
  if (showAndroid) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/icon-192x192_e5bd9dd9.png"
            alt="FITPRO"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Instalar FITPRO</p>
          <p className="text-xs text-muted-foreground">Adicionar à tela inicial</p>
        </div>
        <Button size="sm" onClick={handleInstallAndroid} className="shrink-0 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Instalar
        </Button>
        <button onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // iOS install instructions
  if (showIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663385249362/5UbJ997E6SHYZid72bThxF/icon-192x192_e5bd9dd9.png"
              alt="FITPRO"
              className="w-8 h-8 rounded-xl"
            />
            <p className="text-sm font-semibold text-foreground">Instalar FITPRO</p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Toque em{' '}
          <span className="inline-flex items-center gap-1 text-primary font-medium">
            <Share className="h-3 w-3" /> Compartilhar
          </span>
          {' '}e depois em{' '}
          <span className="font-medium text-foreground">"Adicionar à Tela de Início"</span>
          {' '}para instalar o app.
        </p>
      </div>
    );
  }

  return null;
}
