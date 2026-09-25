'use client';

import { Camera, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ReauthState, ForbiddenState, PermissionDeniedState } from '@/components/ui/access-state';
import { ConfirmationPanel } from '@/components/ui/confirmation-panel';
import { Container } from '@/components/ui/container';
import { Disclosure } from '@/components/ui/disclosure';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { LocaleControl } from '@/components/ui/locale-control';
import { MediaFrame } from '@/components/ui/media-frame';
import { Section } from '@/components/ui/section';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Surface } from '@/components/ui/surface';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Toast } from '@/components/ui/toast';
import { Cluster, ContentShell, FooterShell, Grid, HeaderShell, PageShell, Stack } from '@/components/ui/layout';
import en from '@/messages/en.json';
import id from '@/messages/id.json';
import { useAppLocale } from '@/providers/locale-provider';

export default function UiReferencePage() {
  const { locale } = useAppLocale();
  const copy = (locale === 'id' ? id : en).reference;
  const reduceMotion = useReducedMotion();
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [demoToast, setDemoToast] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  return (
    <PageShell>
      <Section>
        <Container>
          <HeaderShell className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" aria-label="Kepotret home" className="inline-flex items-center gap-3">
              <Image src="/brand/icon.svg" alt="" width={36} height={36} className="h-9 w-9 dark:invert" priority />
              <span className="font-[var(--font-display)] text-xl font-bold tracking-tight">Kepotret</span>
            </Link>
            <Cluster className="gap-2">
              <LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} />
              <ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} />
            </Cluster>
          </HeaderShell>

          <Grid className="gap-8 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-24">
            <div>
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-focus)]">{copy.eyebrow}</p>
              <h1 className="max-w-3xl font-[var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{copy.title}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-muted-foreground)] sm:text-lg">{copy.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button><Camera size={18} aria-hidden="true" />{copy.primaryAction}</Button>
                <Button variant="secondary">{copy.secondaryAction}</Button>
                <Button variant="ghost">{copy.secondaryAction}</Button>
                <Button loading>{copy.loading}</Button>
                <Button disabled>{copy.disabledAction}</Button>
              </div>
            </div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Surface className="p-6 sm:p-8">
                <CheckCircle2 className="text-[var(--color-focus)]" aria-hidden="true" />
                <p className="mt-5 font-[var(--font-display)] text-2xl font-bold">{copy.status}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.motionDescription}</p>
              </Surface>
            </motion.div>
          </Grid>

          <ContentShell className="px-0">
            <Stack aria-labelledby="shared-foundation-title" className="gap-8">
              <h2 id="shared-foundation-title" className="font-[var(--font-display)] text-2xl font-bold">{copy.shell}</h2>
              <LoadingState label={copy.loading} description={copy.loadingDescription} />
              <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} icon={<ImageIcon />} />
              <ErrorState title={copy.errorTitle} description={copy.errorDescription} retryLabel={copy.retry} onRetry={() => setRetryCount((count) => count + 1)} />
              {retryCount > 0 && <p role="status" className="text-sm text-[var(--color-muted-foreground)]">{copy.retry} ({retryCount}); {copy.referenceNote}.</p>}
              <Grid className="sm:grid-cols-2">
                <ReauthState title={copy.reauthTitle} description={copy.reauthDescription} />
                <ForbiddenState title={copy.forbiddenTitle} description={copy.forbiddenDescription} />
                <PermissionDeniedState title={copy.permissionTitle} description={copy.permissionDescription} />
                <StatusIndicator status="success">{copy.success}</StatusIndicator>
                <StatusIndicator status="info">{copy.info}</StatusIndicator>
                <StatusIndicator status="warning">{copy.warning}</StatusIndicator>
                <StatusIndicator status="error">{copy.error}</StatusIndicator>
              </Grid>
              {showConfirmation ? (
                <ConfirmationPanel
                  title={copy.confirmationTitle}
                  description={copy.confirmationDescription}
                  confirmLabel={copy.confirm}
                  cancelLabel={copy.cancel}
                  onConfirm={() => { setShowConfirmation(false); setDemoToast(true); }}
                  onCancel={() => setShowConfirmation(false)}
                />
              ) : <Button variant="secondary" onClick={() => { setShowConfirmation(true); setDemoToast(false); }}>{copy.confirmationTitle}</Button>}
              {demoToast && <Toast status="info">{copy.referenceNote}: {copy.toast}</Toast>}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4">
                <Disclosure title={copy.disclosureTitle}>{copy.disclosureDescription}</Disclosure>
              </div>
              <Grid className="sm:grid-cols-2 lg:grid-cols-3">
                <MediaFrame aspectRatio="1 / 1" className="flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">{copy.mediaAlt}</MediaFrame>
                <MediaFrame aspectRatio="4 / 3" className="flex items-center justify-center bg-[linear-gradient(135deg,var(--color-primary),var(--color-surface-muted))]">
                  <span className="sr-only">{copy.mediaAlt}</span>
                </MediaFrame>
              </Grid>
            </Stack>
          </ContentShell>

          <FooterShell className="mt-12 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-muted-foreground)]">
            <p>{copy.motion} · {copy.referenceNote}</p>
          </FooterShell>
        </Container>
      </Section>
    </PageShell>
  );
}
