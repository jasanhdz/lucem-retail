import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  return children;
}
