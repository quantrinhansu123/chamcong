import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center">
      <div className="w-full max-w-lg min-h-screen bg-surface relative flex flex-col">
        <main className="flex-1 px-5 pt-2 pb-24 relative overflow-hidden">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
