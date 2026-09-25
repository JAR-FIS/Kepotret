'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { setupSteps, type SetupStep, hostRoutes } from '@/features/host/routes';
import { GuestLimitForm } from '@/features/host/components/guest-limit-form';
import { CollaboratorSetup } from '@/features/host/components/collaborator-setup';
import { AccessPinForm } from '@/features/host/components/access-pin-form';

export default function SetupStepPage() {
  const params = useParams<{ albumId: string; step: string }>();
  const t = useTranslations('host.steps');
  if (!setupSteps.includes(params.step as SetupStep)) notFound();
  const currentStep = params.step as SetupStep;
  return <>
    <HostPageTitle title={t('title')} description={t(currentStep)} />
    <nav aria-label={t('title')} className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {setupSteps.map((step, index) => <li key={step} className="min-w-0"><Link aria-current={step === currentStep ? 'step' : undefined} href={hostRoutes.setup(params.albumId, step)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm ${step === currentStep ? 'bg-[var(--color-muted)] font-semibold' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'}`}><span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-xs">{index + 1}</span><span className="truncate">{t(step)}</span></Link></li>)}
      </ol>
    </nav>
    {currentStep === 'moderasi' ? <GuestLimitForm albumId={params.albumId} /> : currentStep === 'kolaborator' ? <CollaboratorSetup albumId={params.albumId} /> : currentStep === 'akses' ? <AccessPinForm albumId={params.albumId} /> : <section className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7" aria-live="polite"><h2 className="font-semibold">{t(currentStep)}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('unavailable')}</p></section>}
  </>;
}
