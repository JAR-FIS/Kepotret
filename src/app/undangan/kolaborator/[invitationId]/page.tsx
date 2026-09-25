import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';
import { InvitationAcceptance } from '@/features/auth/components/invitation-acceptance';
import { getContent, type Locale } from '@/features/marketing/content';

export default async function InvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const locale = await getLocale() as Locale;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) redirect('/undangan/kolaborator/tidak-valid');
  const copy = getContent(locale).auth;

  return <AuthPageFrame><h1 className="font-[var(--font-display)] text-3xl font-bold">{copy.inviteTitle}</h1><div className="mt-5"><InvitationAcceptance invitationId={invitationId} locale={locale} /></div></AuthPageFrame>;
}
