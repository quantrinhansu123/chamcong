import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  currentEmployee,
  getStoredEmployee,
  parseEmployeeFromUrl,
  syncEmployeeFromUrlWithStaff,
  type EmployeeIdentity,
} from '../lib/attendanceService';
import { isAnonymousUserId, isValidQueryUserId, resolveStaffIdentity } from '../lib/staffService';

const EmployeeContext = createContext<EmployeeIdentity & { resolving?: boolean }>(currentEmployee);

async function resolveEmployeeIdentity(identity: EmployeeIdentity) {
  try {
    const resolved = await resolveStaffIdentity(identity);
    if (isValidQueryUserId(resolved.id)) {
      return resolved;
    }
    return identity;
  } catch {
    return identity;
  }
}

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const [employee, setEmployee] = useState<EmployeeIdentity>(() => {
    const fromUrl = parseEmployeeFromUrl(`?${new URLSearchParams(window.location.search).toString()}`);
    if (fromUrl) return { ...fromUrl };
    const stored = getStoredEmployee();
    if (stored) return { ...stored };
    return { ...currentEmployee };
  });
  const [resolving, setResolving] = useState(() => isAnonymousUserId(employee.id));

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setResolving(true);
      const query = searchParams.toString();
      const hasUrlIdentity = Boolean(
        query && (
          searchParams.get('name')
          || searchParams.get('ten')
          || searchParams.get('userId')
          || searchParams.get('user_id')
          || searchParams.get('employeeId')
          || searchParams.get('employee_id')
        ),
      );

      if (hasUrlIdentity) {
        const synced = await syncEmployeeFromUrlWithStaff(query ? `?${query}` : '');
        if (!cancelled && synced) {
          setEmployee({ ...synced });
        }
        if (!cancelled) setResolving(false);
        return;
      }

      const stored = getStoredEmployee();
      const base = stored ?? { ...currentEmployee };
      const resolved = await resolveEmployeeIdentity(base);
      if (!cancelled) {
        currentEmployee.id = resolved.id;
        currentEmployee.name = resolved.name;
        currentEmployee.phone = resolved.phone;
        if (isValidQueryUserId(resolved.id)) {
          localStorage.setItem('employee_info', JSON.stringify(resolved));
        }
        setEmployee({ ...resolved });
        setResolving(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <EmployeeContext.Provider value={{ ...employee, resolving }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee(): EmployeeIdentity & { resolving?: boolean } {
  const employee = useContext(EmployeeContext);
  if (!employee?.id && !employee?.name) {
    return { ...currentEmployee };
  }
  return employee;
}
