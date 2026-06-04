import { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
  onInstallApp: () => void;
}

type Tab = 'stations' | 'explore' | 'install' | 'location';

const TABS: { id: Tab; label: string }[] = [
  { id: 'stations', label: 'Stations' },
  { id: 'explore',  label: 'Explore'  },
  { id: 'install',  label: 'Install'  },
  { id: 'location', label: 'Location' },
];

export default function HelpModal({ onClose, onInstallApp }: HelpModalProps) {
  const [tab, setTab] = useState<Tab>('stations');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Help</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-zinc-700 flex-shrink-0 px-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 px-5 py-5 text-sm space-y-3">

          {tab === 'stations' && (
            <>
              <section className="space-y-1.5">
                <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Saved Stations</h3>
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Your home screen shows your saved stations. Tap any station card to see its full readings and history.
                  Use the variable selector at the top to compare the same measurement across all your saved stations at once.
                </p>
              </section>
              <section className="space-y-1.5">
                <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Saving & Removing</h3>
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Tap <span className="font-medium text-slate-700 dark:text-zinc-300">Explore</span> to browse all stations on the map or list.
                  Open any station and tap <span className="font-medium text-green-600 dark:text-green-400">Save</span> to add it to your home screen.
                  To remove it, tap <span className="font-medium text-red-600 dark:text-red-400">Unsave</span> from the station page or the map panel.
                </p>
              </section>
            </>
          )}

          {tab === 'explore' && (
            <section className="space-y-1.5">
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Map & List</h3>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Switch between <span className="font-medium text-slate-700 dark:text-zinc-300">Map</span> and <span className="font-medium text-slate-700 dark:text-zinc-300">List</span> views using the toggle in the top bar.
              </p>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                In the list, filter by status or island, and use <span className="font-medium text-slate-700 dark:text-zinc-300">Near Me</span> to sort stations by distance from your location.
              </p>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                On the map, tap the crosshair button in the top-left to center on your location.
              </p>
            </section>
          )}

          {tab === 'install' && (
            <section className="space-y-4">
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Add this app to your home screen for quick, full-screen access — no App Store needed.
              </p>
              <button
                onClick={onInstallApp}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors shadow-sm shadow-sky-500/30"
              >
                Add to Home Screen
              </button>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Manual steps</p>
                <div className="space-y-2 text-slate-500 dark:text-zinc-400 leading-relaxed">
                  <p>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">iPhone / iPad:</span> Tap the{' '}
                    <span className="font-medium text-slate-700 dark:text-zinc-300">Share</span> button in Safari → <span className="font-medium text-slate-700 dark:text-zinc-300">Add to Home Screen</span>.
                  </p>
                  <p>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">Android:</span> Tap the{' '}
                    <span className="font-medium text-slate-700 dark:text-zinc-300">⋮ menu</span> in Chrome → <span className="font-medium text-slate-700 dark:text-zinc-300">Add to Home Screen</span>.
                  </p>
                </div>
              </div>
            </section>
          )}

          {tab === 'location' && (
            <section className="space-y-1.5">
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Location Access</h3>
              <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                Used for <span className="font-medium text-slate-700 dark:text-zinc-300">Near Me</span> sorting in the station list. If you previously denied access, re-enable it in your device settings:
              </p>
              <div className="space-y-1 text-slate-500 dark:text-zinc-400 pt-1">
                <p><span className="font-medium text-slate-700 dark:text-zinc-300">iPhone:</span> Settings → Safari → Location → Allow</p>
                <p><span className="font-medium text-slate-700 dark:text-zinc-300">Android:</span> Settings → Apps → Chrome → Permissions → Location</p>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
