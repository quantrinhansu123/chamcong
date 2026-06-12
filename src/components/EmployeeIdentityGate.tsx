import type { ReactNode } from 'react';
import { EmployeeProvider } from '../context/EmployeeContext';

interface EmployeeIdentityGateProps {
  children: ReactNode;
}

export default function EmployeeIdentityGate({ children }: EmployeeIdentityGateProps) {
  return <EmployeeProvider>{children}</EmployeeProvider>;
}
