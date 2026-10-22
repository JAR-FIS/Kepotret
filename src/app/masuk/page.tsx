import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthContent } from '@/features/auth/components/auth-content';
import { AuthPreferences } from '@/features/auth/components/auth-preferences';

export default function SignInPage() {
  return <AuthPageFrame headerControls={<AuthPreferences compact />}><AuthContent kind="sign-in" /></AuthPageFrame>;
}
