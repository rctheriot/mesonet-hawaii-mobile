export default function LandscapeOverlay() {
  return (
    <div className="landscape-overlay fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex-col items-center justify-center gap-5 text-center px-8">
      <div className="w-16 h-16 rounded-full border-2 border-sky-500 dark:border-sky-400 flex items-center justify-center">
        <span className="text-sky-500 dark:text-sky-400 text-4xl font-bold leading-none">!</span>
      </div>
      <p className="text-slate-900 dark:text-zinc-100 text-lg font-semibold leading-snug">
        Please rotate your device
      </p>
      <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">
        This app is designed for portrait mode. Rotate your phone upright to continue.
      </p>
    </div>
  );
}
