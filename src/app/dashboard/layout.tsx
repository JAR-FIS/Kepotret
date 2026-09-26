import { HostShell } from '@/features/host/components/workspace-shell';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <HostShell>{children}</HostShell>;
}
