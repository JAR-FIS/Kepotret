import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthContent } from '@/features/auth/components/auth-content';

export default function InvalidInvitationPage() {
  return <AuthPageFrame><AuthContent kind="invite-invalid" /></AuthPageFrame>;
}
