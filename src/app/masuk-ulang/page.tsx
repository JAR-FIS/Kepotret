import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthContent } from '@/features/auth/components/auth-content';

export default function ReauthenticationPage() {
  return <AuthPageFrame><AuthContent kind="reauth" /></AuthPageFrame>;
}
