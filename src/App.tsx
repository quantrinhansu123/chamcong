/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Screen } from './types';
import BottomNav from './components/BottomNav';
import Home from './screens/Home';
import History from './screens/History';
import Employees from './screens/Employees';
import Reports from './screens/Reports';
import Settings from './screens/Settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home setScreen={setCurrentScreen} />;
      case 'history':
        return <History />;
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Home setScreen={setCurrentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center">
      <div className="w-full max-w-lg min-h-screen bg-surface relative flex flex-col">
        <main className="flex-1 px-5 pt-2 pb-24 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {renderScreen()}
          </AnimatePresence>
        </main>
        
        <BottomNav 
          currentScreen={currentScreen} 
          setScreen={setCurrentScreen} 
        />
      </div>
    </div>
  );
}
