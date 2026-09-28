import { AdminWorkspace } from '@/features/admin/auth';

export default function AdminWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminWorkspace>{children}</AdminWorkspace>;
}
