'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getApiV1AuthGoogleStart } from '@/lib/api/browser';
import { getContent, type Locale } from '@/features/marketing/content';

export function GoogleSignInButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const copy = getContent(locale).auth;

  const startSignIn = async () => {
    if (pending) return;
    setPending(true);
    router.push('/auth/google/memproses');
    try {
      const response = await getApiV1AuthGoogleStart();
      if (response.status !== 200) throw new Error('Google sign-in could not start');
      const target = new URL(response.data.data.redirect_url);
      if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com') {
        throw new Error('Unexpected sign-in destination');
      }
      window.location.assign(target.toString());
    } catch {
      router.replace('/masuk/gagal');
    }
  };

  return <Button type="button" loading={pending} onClick={startSignIn} className="w-full min-h-12">
    {!pending && <LogIn size={18} aria-hidden="true" />}{copy.google}
  </Button>;
}
