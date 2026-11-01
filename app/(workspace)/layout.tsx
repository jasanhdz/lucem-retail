import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  return <WorkspaceShell businessName={auth.business?.name ?? 'Mi negocio'} role={auth.membership?.role ?? 'SELLER'} userName={auth.user.name} userEmail={auth.user.email}>{children}</WorkspaceShell>;
}
