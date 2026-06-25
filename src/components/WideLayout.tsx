import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function WideLayout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <main className="flex-1 w-full pb-24">
        <Outlet />
      </main>
      <BottomNav wide />
    </div>
  );
}
