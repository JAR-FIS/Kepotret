import { getLocale } from 'next-intl/server';
import { CollaboratorGuideContent } from '@/features/help/collaborator-guide';
import type { HelpLocale } from '@/features/help/content';

export default async function CollaboratorHelpPage() {
  const locale = await getLocale() as HelpLocale;
  return <CollaboratorGuideContent locale={locale} />;
}
