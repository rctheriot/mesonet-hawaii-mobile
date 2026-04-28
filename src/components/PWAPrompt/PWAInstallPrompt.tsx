import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

type Platform = 'ios' | 'android' | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

const STORAGE_KEY = 'pwa-prompt-dismissed';

export default function PWAInstallPrompt() {
  const { installPromptOpen, closeInstallPrompt } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null);

  // Auto-show logic: fires once on mount for mobile devices
  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const p = detectPlatform();
    if (!p) return;
    setPlatform(p);

    if (p === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as Event & { prompt: () => void });
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    } else {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Force-open from Help modal — bypasses sessionStorage check
  useEffect(() => {
    if (installPromptOpen) {
      const p = detectPlatform() ?? 'ios'; // default to iOS instructions on desktop
      setPlatform(p);
      setVisible(true);
    }
  }, [installPromptOpen]);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    closeInstallPrompt();
  }

  async function handleAndroidInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white text-sm font-bold">M</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Hawaii Mesonet</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Add to Home Screen</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {platform === 'ios' && (
            <>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Install this app on your iPhone for quick access — no App Store needed.
              </p>
              <div className="space-y-2">
                <Step number={1}>
                  Tap the <strong>Share</strong> button{' '}
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold">⎙</span>{' '}
                  at the bottom of Safari
                </Step>
                <Step number={2}>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </Step>
                <Step number={3}>
                  Tap <strong>"Add"</strong> in the top right
                </Step>
              </div>
            </>
          )}

          {platform === 'android' && (
            <>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Install this app on your Android device for quick access — no Play Store needed.
              </p>
              {deferredPrompt ? (
                <button
                  onClick={handleAndroidInstall}
                  className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors"
                >
                  Install App
                </button>
              ) : (
                <div className="space-y-2">
                  <Step number={1}>
                    Tap the <strong>menu</strong> button{' '}
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold">⋮</span>{' '}
                    in Chrome's top right
                  </Step>
                  <Step number={2}>
                    Tap <strong>"Add to Home screen"</strong>
                  </Step>
                  <Step number={3}>
                    Tap <strong>"Add"</strong> to confirm
                  </Step>
                </div>
              )}
            </>
          )}

          <button
            onClick={dismiss}
            className="w-full py-2 rounded-xl text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 text-xs font-semibold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">{children}</p>
    </div>
  );
}
