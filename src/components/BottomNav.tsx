import { Home, Fingerprint, Users, BarChart2, Settings } from 'lucide-react';
import type { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

export default function BottomNav({ currentScreen, setScreen }: BottomNavProps) {
  const items = [
    { id: 'home' as Screen, label: 'Trang chủ', icon: Home },
    { id: 'attendance' as Screen, label: 'Chấm công', icon: Fingerprint },
    { id: 'employees' as Screen, label: 'Nhân sự', icon: Users },
    { id: 'reports' as Screen, label: 'Báo cáo', icon: BarChart2 },
    { id: 'settings' as Screen, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/10 px-4 py-2 flex justify-around items-center z-50 md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-200 ${
              isActive ? 'text-secondary scale-105' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-secondary rounded-full" />
              )}
            </div>
            <span className={`text-[10px] font-bold leading-tight ${isActive ? '' : 'font-medium opacity-70'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
