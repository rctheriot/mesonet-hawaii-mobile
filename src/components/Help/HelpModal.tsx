import { useState } from 'react';
import { LuBookmark, LuRadioTower } from 'react-icons/lu';
import { VARIABLE_GLOSSARY } from '../../data/glossary';
import { GROUP_ORDER, VARIABLE_GROUP } from '../../utils/units';
import VariableInfoModal from '../Glossary/VariableInfoModal';
import pkg from '../../../package.json';

interface HelpModalProps {
  onClose: () => void;
  onInstallApp: () => void;
  initialTab?: Tab;
}

export type Tab = 'howto' | 'glossary' | 'setup' | 'about';

const TABS: { id: Tab; label: string }[] = [
  { id: 'howto',    label: 'How To Use'        },
  { id: 'glossary', label: 'Glossary'          },
  { id: 'setup',    label: 'Install & Location' },
  { id: 'about',    label: 'About'             },
];

// Computed at module level so it runs once, not on every render.
const GLOSSARY_GROUPS = GROUP_ORDER.map(group => ({
  group,
  entries: Object.entries(VARIABLE_GLOSSARY).filter(
    ([varId]) => VARIABLE_GROUP[varId] === group
  ),
})).filter(g => g.entries.length > 0);

export default function HelpModal({ onClose, onInstallApp, initialTab = 'howto' }: HelpModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [infoVarId, setInfoVarId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Force the installed PWA to pull the newest build. Clearing the service
  // worker and its caches (Cache Storage) only; localStorage (saved stations
  // and settings) and cookies are untouched, so nothing the user set is lost.
  async function forceUpdate() {
    if (updating) return;
    setUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // Reload anyway; a normal reload may still pick up a newer build.
    }
    window.location.reload();
  }

  return (
    <>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
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
          <div className="tabs-scroll flex overflow-x-auto border-b border-slate-200 dark:border-zinc-700 flex-shrink-0 px-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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

            {tab === 'howto' && (
              <>
                {/* My Stations */}
                <div className="flex items-center gap-2.5">
                  <LuBookmark size={20} fill="currentColor" strokeWidth={0} className="text-slate-700 dark:text-zinc-200 flex-shrink-0" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">My Stations</h3>
                </div>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Your saved stations</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">My Stations</span> shows only the stations you've saved.
                    View them on the map or switch to the list using the toggle at the top.
                    Tap any station to open its full detail page with current readings and history charts.
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Variable selector</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Use the selector bar below the top bar to color the map and cards by a specific measurement
                    like rainfall, temperature, or wind speed, so you can compare readings across all your saved stations at a glance.
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Saving & removing stations</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    To add a station, go to <span className="font-medium text-slate-700 dark:text-zinc-300">Station Network</span>, tap any station, then tap the{' '}
                    <span className="font-medium text-sky-600 dark:text-sky-400">Save</span> button next to the station name.
                    To remove it, open the station and tap <span className="font-medium text-slate-700 dark:text-zinc-300">Saved</span> to toggle it off.
                  </p>
                </section>

                {/* Station Network */}
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center gap-2.5">
                  <LuRadioTower size={20} strokeWidth={1.8} className="text-slate-700 dark:text-zinc-200 flex-shrink-0" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">Station Network</h3>
                </div>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Browsing all stations</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    <span className="font-medium text-slate-700 dark:text-zinc-300">Station Network</span> shows every station in the Hawaii Mesonet.
                    Switch between <span className="font-medium text-slate-700 dark:text-zinc-300">Map</span> and <span className="font-medium text-slate-700 dark:text-zinc-300">List</span> views using the toggle at the top.
                    Tap any station on the map or in the list to open its full detail page.
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Map view</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Use the selector bar to color stations by a measurement like temperature, rainfall, or wind speed.
                    Tap the crosshair button to center the map on your current location.
                    The map stays at your last position when you navigate away and come back.
                  </p>
                </section>
                <section className="space-y-1.5">
                  <h3 className="font-semibold text-slate-800 dark:text-zinc-200">List view</h3>
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Filter by island, or tap <span className="font-medium text-slate-700 dark:text-zinc-300">Saved</span> to show only your saved stations.
                    Use the <span className="font-medium text-slate-700 dark:text-zinc-300">Sort</span> menu to order by name, distance, or value. Distance uses your current location.
                    Your filter and sort settings are remembered when you return from a station page.
                  </p>
                </section>
              </>
            )}

            {tab === 'glossary' && (
              <div className="space-y-5">
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Tap any variable below for a plain-English explanation and example values.
                </p>
                {GLOSSARY_GROUPS.map(({ group, entries }) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      {group}
                    </p>
                    <div className="space-y-1">
                      {entries.map(([varId, entry]) => (
                        <button
                          key={varId}
                          onClick={() => setInfoVarId(varId)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{entry.label}</p>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 leading-snug line-clamp-1">
                              {entry.description}
                            </p>
                          </div>
                          <span className="text-sky-400 flex-shrink-0 text-base">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'setup' && (
              <>
                {/* Install */}
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Install App</p>
                <section className="space-y-4">
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Add this app to your home screen for quick, full-screen access. No App Store needed.
                  </p>
                  <button
                    onClick={onInstallApp}
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors shadow-sm shadow-sky-500/30"
                  >
                    Add to Home Screen
                  </button>
                  <div className="space-y-2">
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

                {/* Location */}
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-3">Location Access</p>
                </div>
                <section className="space-y-1.5">
                  <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Used for <span className="font-medium text-slate-700 dark:text-zinc-300">Near Me</span> sorting in the station list. If you previously denied access, re-enable it in your device settings:
                  </p>
                  <div className="space-y-1 text-slate-500 dark:text-zinc-400 pt-1">
                    <p><span className="font-medium text-slate-700 dark:text-zinc-300">iPhone:</span> Settings → Safari → Location → Allow</p>
                    <p><span className="font-medium text-slate-700 dark:text-zinc-300">Android:</span> Settings → Apps → Chrome → Permissions → Location</p>
                  </div>
                </section>
              </>
            )}

            {tab === 'about' && (
              <section className="space-y-4">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-zinc-100">Hawaii Mesonet</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Version {pkg.version}</p>
                  <button
                    onClick={forceUpdate}
                    disabled={updating}
                    className="mt-2.5 w-full py-2.5 rounded-xl border border-sky-500 text-sky-600 dark:text-sky-400 text-sm font-semibold hover:bg-sky-50 dark:hover:bg-sky-500/10 disabled:opacity-60 transition-colors"
                  >
                    {updating ? 'Updating…' : 'Check for Updates'}
                  </button>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
                    Reloads the app with the latest version. Your saved stations and settings are kept.
                  </p>
                </div>
                <p className="text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Real-time environmental data from the{' '}
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Hawaii Climate Data Portal (HCDP)</span>{' '}
                  Mesonet network, a statewide system of sensor stations monitoring temperature,
                  rainfall, wind, humidity, and soil conditions across the Hawaiian Islands.
                </p>
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">Website</p>
                  <a
                    href="https://www.hawaii.edu/climate-data-portal/hawaii-mesonet/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 dark:text-sky-400 text-sm hover:underline"
                  >
                    hawaii.edu/climate-data-portal
                  </a>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">Contact</p>
                  <a
                    href="mailto:rtheriot@hawaii.edu"
                    className="text-sky-500 dark:text-sky-400 text-sm hover:underline"
                  >
                    rtheriot@hawaii.edu
                  </a>
                </div>
                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                  <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-1">Funding</p>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">
                    Hawaiʻi EPSCoR is funded by the National Science Foundation under EPSCoR Research
                    Infrastructure Improvement Award <span className="font-medium text-slate-600 dark:text-zinc-300">#OIA-2149133</span>.{' '}
                    <a
                      href="https://hawaii.edu/epscor/change-hi/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 dark:text-sky-400 hover:underline"
                    >
                      hawaii.edu/epscor/change-hi
                    </a>
                  </p>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>

      {infoVarId && (
        <VariableInfoModal varId={infoVarId} onClose={() => setInfoVarId(null)} />
      )}
    </>
  );
}
