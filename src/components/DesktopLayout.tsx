import { Outlet } from 'react-router-dom';

export default function DesktopLayout() {
  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col items-center">
      <div className="w-full max-w-3xl min-h-screen bg-surface relative flex flex-col shadow-sm">
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
