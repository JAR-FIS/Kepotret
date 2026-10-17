import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthPreferences } from '@/features/auth/components/auth-preferences';
import { InvitationInvalidState } from '@/features/auth/components/invitation-invalid-state';

export default async function InvalidInvitationPage({ searchParams }: PageProps<'/undangan/kolaborator/tidak-valid'>) {
  const query = await searchParams;
  const state = query.state === 'expired' || query.state === 'used' ? query.state : 'invalid';
  return <AuthPageFrame headerControls={<AuthPreferences compact />}><InvitationInvalidState reason={state} /></AuthPageFrame>;
}
