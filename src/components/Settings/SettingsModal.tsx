import { useAppContext } from '../../context/AppContext';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useAppContext();
  const { darkMode, units } = settings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Settings rows */}
        <div className="px-5 py-4 space-y-5">

          {/* Appearance */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Appearance</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Light or dark theme</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {(['light', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ darkMode: mode === 'dark' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    (mode === 'dark') === darkMode
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Units */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Units</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Metric or imperial measurements</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {(['metric', 'imperial'] as const).map(sys => (
                <button
                  key={sys}
                  onClick={() => updateSettings({ units: sys })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    units === sys
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
