import { LuWaves } from 'react-icons/lu';

// Small tag marking a station as a stream gauge (it reports water level). Uses the
// map's water-level blue so the tag and the Water Level map mode read as one idea.
export default function StreamGaugeTag() {
  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-none bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
      <LuWaves size={11} aria-hidden="true" />
      Stream gauge
    </span>
  );
}
