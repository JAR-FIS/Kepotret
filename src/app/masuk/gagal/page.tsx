import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { AuthContent } from '@/features/auth/components/auth-content';

export default function SignInFailedPage() {
  return <AuthPageFrame><AuthContent kind="failed" /></AuthPageFrame>;
}
