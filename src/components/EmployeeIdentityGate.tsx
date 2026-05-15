import type { ReactNode } from 'react';

interface EmployeeIdentityGateProps {
  children: ReactNode;
}

export default function EmployeeIdentityGate({ children }: EmployeeIdentityGateProps) {
  return <>{children}</>;
}
