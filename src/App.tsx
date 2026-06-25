/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import DesktopLayout from './components/DesktopLayout';
import WideLayout from './components/WideLayout';
import EmployeeIdentityGate from './components/EmployeeIdentityGate';
import Home from './screens/Home';
import History from './screens/History';
import Reports from './screens/Reports';
import AttendanceSheet from './screens/AttendanceSheet';
import Settings from './screens/Settings';
import DesktopChamCong from './screens/DesktopChamCong';

export default function App() {
  return (
    <BrowserRouter>
      <EmployeeIdentityGate>
        <Routes>
          <Route element={<DesktopLayout />}>
            <Route path="/desktop/cham-cong" element={<DesktopChamCong />} />
          </Route>
          <Route element={<WideLayout />}>
            <Route path="/bang-cong" element={<AttendanceSheet />} />
            <Route path="/bao-cao" element={<Reports />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/cai-dat" element={<Settings />} />
            <Route path="/lich-su" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </EmployeeIdentityGate>
    </BrowserRouter>
  );
}
