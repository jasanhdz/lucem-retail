import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BusinessSelector } from './BusinessSelector';
import { WorkspaceNavigation } from './WorkspaceNavigation';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  return <div className="workspace">
    <WorkspaceNavigation businessName={auth.business?.name ?? 'Lucem Retail'} />
    <div className="workspace-main">
      <div className="workspace-toolbar"><BusinessSelector /></div>
      <main className="workspace-content">{children}</main>
    </div>
  </div>;
}
