import { useNavigate, useLocation } from 'react-router-dom';
import { LuBookmark, LuRadioTower } from 'react-icons/lu';

const TABS = [
  {
    path: '/',
    label: 'My Stations',
    icon: (active: boolean) => (
      <LuBookmark size={22} strokeWidth={active ? 0 : 1.8} fill={active ? 'currentColor' : 'none'} />
    ),
  },
  {
    path: '/explore',
    label: 'Station Network',
    icon: (active: boolean) => (
      <LuRadioTower size={22} strokeWidth={active ? 2.2 : 1.8} />
    ),
  },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-slate-200 dark:border-zinc-800 flex">
      {TABS.map(({ path, label, icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active
                ? 'text-sky-500 dark:text-sky-400'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
          >
            {icon(active)}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
