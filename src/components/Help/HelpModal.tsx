interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Help</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 text-sm">

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Add to Home Screen</h3>
            <div className="space-y-2 text-slate-500 dark:text-slate-400 leading-relaxed">
              <p>
                <span className="font-medium text-slate-700 dark:text-slate-300">iPhone / iPad:</span> Tap the{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">Share</span> button in Safari, then select{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">Add to Home Screen</span>.
              </p>
              <p>
                <span className="font-medium text-slate-700 dark:text-slate-300">Android:</span> Tap the{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">⋮ menu</span> in Chrome, then select{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">Add to Home Screen</span>.
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Location Access</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
              Used for <span className="font-medium text-slate-700 dark:text-slate-300">Near Me</span> sorting in the station list. If you previously denied access, re-enable it in your device settings:
            </p>
            <div className="space-y-1 text-slate-500 dark:text-slate-400">
              <p><span className="font-medium text-slate-700 dark:text-slate-300">iPhone:</span> Settings → Safari → Location → Allow</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-300">Android:</span> Settings → Apps → Chrome → Permissions → Location</p>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Saved Stations</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Your home screen shows your saved stations. Tap any station card to see its full readings and history.
              Use the variable selector at the top to compare the same measurement across all your saved stations at once.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Saving & Removing Stations</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Tap <span className="font-medium text-slate-700 dark:text-slate-300">Explore</span> to browse all stations on the map or list.
              Open any station and tap <span className="font-medium text-green-600 dark:text-green-400">Save</span> to add it to your home screen.
              To remove it, tap <span className="font-medium text-red-600 dark:text-red-400">Unsave</span> from the station page or the map panel.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Explore</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Switch between <span className="font-medium text-slate-700 dark:text-slate-300">Map</span> and <span className="font-medium text-slate-700 dark:text-slate-300">List</span> views using the toggle in the top bar.
              In the list, filter by status or island, and use <span className="font-medium text-slate-700 dark:text-slate-300">Near Me</span> to sort stations by distance from your location.
              On the map, tap the crosshair button in the top-left to center on your location.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
