import { Home, BarChart2, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { path: '/', label: 'Trang chủ', icon: Home, end: true },
  { path: '/bao-cao', label: 'Báo cáo', icon: BarChart2, end: false },
  { path: '/cai-dat', label: 'Cài đặt', icon: Settings, end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant/10 px-4 py-2 flex justify-around items-center z-50 shadow-[0_-8px_24px_rgba(6,43,36,0.06)]">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-200 ${
                isActive ? 'text-secondary scale-105' : 'text-on-surface-variant hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-secondary rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] font-bold leading-tight ${isActive ? '' : 'font-medium opacity-70'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
