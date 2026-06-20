import { Outlet } from 'react-router-dom';

export default function WideLayout() {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <main className="min-h-screen w-full">
        <Outlet />
      </main>
    </div>
  );
}
