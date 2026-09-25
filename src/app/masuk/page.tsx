import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthContent } from '@/features/auth/components/auth-content';

export default function SignInPage() {
  return <AuthPageFrame><AuthContent kind="sign-in" /></AuthPageFrame>;
}
