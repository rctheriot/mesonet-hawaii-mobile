import { VARIABLE_GLOSSARY } from '../../data/glossary';
import { useAppContext } from '../../context/AppContext';

interface VariableInfoModalProps {
  varId: string;
  onClose: () => void;
}

export default function VariableInfoModal({ varId, onClose }: VariableInfoModalProps) {
  const { settings } = useAppContext();
  const entry = VARIABLE_GLOSSARY[varId];

  // Normalize sensor-numbered IDs (e.g. Tsoil_2_Avg → Tsoil_1_Avg) as a fallback
  // so sensors 2/3/4 still find a definition when their exact ID isn't in the glossary.
  const normalizedId = varId.replace(/_[2-9]_/, '_1_');
  const resolved = entry ?? VARIABLE_GLOSSARY[normalizedId];
  const examples = resolved
    ? (settings.units === 'imperial' ? resolved.examplesImperial : resolved.examplesMetric)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 max-h-[80vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            {resolved?.label ?? varId}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-sm">
          {resolved ? (
            <>
              {/* Description */}
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                {resolved.description}
              </p>

              {/* Examples */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  What the values mean
                </p>
                <ul className="space-y-1.5">
                  {examples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-zinc-300 leading-snug">
                      <span className="text-sky-400 flex-shrink-0 mt-0.5">›</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unit note */}
              <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-xs text-slate-400 dark:text-zinc-500">{resolved.unitNote}</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500 dark:text-zinc-400">
              No definition available for this variable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
