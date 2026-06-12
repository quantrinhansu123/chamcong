import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  currentEmployee,
  getStoredEmployee,
  syncEmployeeFromUrl,
  type EmployeeIdentity,
} from '../lib/attendanceService';

const EmployeeContext = createContext<EmployeeIdentity>(currentEmployee);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const [employee, setEmployee] = useState<EmployeeIdentity>(() => {
    const fromUrl = syncEmployeeFromUrl(`?${new URLSearchParams(window.location.search).toString()}`);
    if (fromUrl) return { ...fromUrl };
    const stored = getStoredEmployee();
    if (stored) return { ...stored };
    return { ...currentEmployee };
  });

  useEffect(() => {
    const query = searchParams.toString();
    const synced = syncEmployeeFromUrl(query ? `?${query}` : '');
    if (synced) {
      setEmployee({ ...synced });
      return;
    }

    const stored = getStoredEmployee();
    if (stored) {
      setEmployee({ ...stored });
    }
  }, [searchParams]);

  return <EmployeeContext.Provider value={employee}>{children}</EmployeeContext.Provider>;
}

export function useEmployee() {
  return useContext(EmployeeContext);
}
