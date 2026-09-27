'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Camera, Check, Clock3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CaptureReadiness, GuestAccessPreview } from '@/lib/api/generated/index.schemas';

type StepControls = { onBack: () => void; onContinue: () => void; busy: boolean };

export function GuestWelcome({ preview, formatTime, onContinue }: { preview: GuestAccessPreview; formatTime: (value?: string | null) => string; onContinue: () => void }) {
  const t = useTranslations('guest');
  const phase = preview.capture_state === 'OPEN' ? t('phaseOpen') : preview.capture_state === 'CLOSED' ? t('phaseClosed') : t('phaseNotStarted');
  return <>
    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{t('eventInvitation')}</p>
    <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{preview.event_name}</h1>
    {preview.event_location && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{preview.event_location}</p>}
    <p className="mt-4 flex items-center gap-2 text-sm"><Clock3 size={16} />{preview.capture_start ? `${formatTime(preview.capture_start)}${preview.capture_end ? ` – ${formatTime(preview.capture_end)}` : ''}` : phase}</p>
    <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{phase}</p>
    <Button onClick={onContinue} className="mt-6 w-full">{t('welcomeContinue')}</Button>
  </>;
}

export function GuestJoinForm({ displayName, setDisplayName, pin, setPin, pinRequired, nameValid, error, onBack, onContinue, busy }: StepControls & {
  displayName: string; setDisplayName: (value: string) => void; pin: string; setPin: (value: string) => void;
  pinRequired: boolean; nameValid: boolean; error: string; onContinue: () => void;
}) {
  const t = useTranslations('guest');
  return <>
    <h1 className="font-[var(--font-display)] text-2xl font-bold">{t('joinTitle')}</h1>
    <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onContinue(); }}>
      <label className="block text-sm font-medium">{t('name')}<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" className="mt-1.5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3" /></label>
      {pinRequired && <label className="block text-sm font-medium">{t('pin')}<input required type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3" /></label>}
      {error && <p role="alert" className="text-sm text-[var(--color-destructive)]">{error}</p>}
      <div className="flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={onBack}>{t('back')}</Button><Button type="submit" loading={busy} disabled={!nameValid || (pinRequired && !pin)} className="flex-1">{t('continue')}</Button></div>
    </form>
  </>;
}

export function GuestConsent({ checked, setChecked, error, onBack, onContinue, busy }: StepControls & {
  checked: boolean; setChecked: (value: boolean) => void; error: string; onContinue: () => void;
}) {
  const t = useTranslations('guest');
  return <>
    <h1 className="font-[var(--font-display)] text-2xl font-bold">{t('consentTitle')}</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('consentDescription')}</p>
    <label className="mt-5 flex items-start gap-3 text-sm leading-6">
      <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]" />
      <span>{t.rich('consentCheckbox', {
        privacy: (chunks) => <Link className="underline underline-offset-2" href="/kebijakan-privasi">{chunks}</Link>,
        terms: (chunks) => <Link className="underline underline-offset-2" href="/syarat-ketentuan">{chunks}</Link>,
      })}</span>
    </label>
    {error && <p role="alert" className="mt-4 text-sm text-[var(--color-destructive)]">{error}</p>}
    <div className="mt-6 flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={onBack}>{t('back')}</Button><Button loading={busy} disabled={!checked} onClick={onContinue} className="flex-1">{t('agreeContinue')}</Button></div>
  </>;
}

export function OfflineNotice() {
  const t = useTranslations('guest');
  return <p role="status" className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-sm">{t('offline')}</p>;
}

export function CaptureWaitingState({ readiness, isOffline, revalidating, cameraError, onOpenCamera, formatTime }: {
  readiness: CaptureReadiness | null; isOffline: boolean; revalidating: boolean; cameraError: string;
  onOpenCamera: () => void; formatTime: (value?: string | null) => string;
}) {
  const t = useTranslations('guest');
  const waiting = readiness?.state === 'WAITING';
  return <div className="space-y-4">
    <p className="text-sm text-[var(--color-muted-foreground)]">{readiness?.can_capture ? t('captureReady') : t('captureWait')}</p>
    {waiting && readiness?.capture_start && <p className="text-sm">{t('photosBeginAt')}: {formatTime(readiness.capture_start)}</p>}
    {readiness?.state === 'QUOTA_FULL' && <p role="status">{t('quotaFull')}</p>}
    {readiness?.state === 'GUEST_LIMIT_REACHED' && <p role="status">{t('guestLimit')}</p>}
    <Button onClick={onOpenCamera} loading={revalidating} disabled={!readiness?.can_capture || isOffline || revalidating} className="w-full"><Camera size={18} />{t('startCamera')}</Button>
    {cameraError && <p role="alert" className="text-sm text-[var(--color-destructive)]">{cameraError}</p>}
  </div>;
}

export function CameraViewfinder({ videoRef, isReady, isBusy, isOffline, onSwitch, onShutter, cameraError }: {
  videoRef: RefObject<HTMLVideoElement | null>; isReady: boolean; isBusy: boolean; isOffline: boolean;
  onSwitch: () => void; onShutter: () => void; cameraError: string;
}) {
  const t = useTranslations('guest');
  return <div className="mt-5 space-y-4">
    <video ref={videoRef} playsInline muted aria-label={t('camera')} className="aspect-[3/4] w-full rounded-xl bg-black object-cover" />
    <div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={onSwitch}><RotateCcw size={16} />{t('switchCamera')}</Button><Button className="flex-1" loading={isBusy} disabled={!isReady || isOffline} onClick={onShutter}><Camera size={18} />{t('shutter')}</Button></div>
    {cameraError && <p role="alert" className="text-sm text-[var(--color-destructive)]">{cameraError}</p>}
  </div>;
}

export function CaptureReview({ photoUrl, isBusy, onRetake, onUse }: { photoUrl: string; isBusy: boolean; onRetake: () => void; onUse: () => void }) {
  const t = useTranslations('guest');
  return <div className="mt-5 space-y-4"><Image src={photoUrl} alt={t('previewAlt')} width={600} height={800} unoptimized className="aspect-[3/4] w-full rounded-xl bg-black object-contain" /><div className="flex gap-3"><Button variant="secondary" className="flex-1" loading={isBusy} onClick={onRetake}><RotateCcw size={16} />{t('retake')}</Button><Button className="flex-1" loading={isBusy} onClick={onUse}><Check size={18} />{t('usePhoto')}</Button></div></div>;
}

export function UploadStatus({ saved, canCapture, onNext }: { saved: boolean; canCapture: boolean; onNext: () => void }) {
  const t = useTranslations('guest');
  return <div role="status" className="mt-6 rounded-lg bg-[var(--color-muted)] p-4 text-center">{saved ? t('saved') : t('saving')}{saved && canCapture && <Button className="mt-4 w-full" onClick={onNext}>{t('startCamera')}</Button>}</div>;
}
