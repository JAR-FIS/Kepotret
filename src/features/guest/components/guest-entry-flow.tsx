'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  getApiV1AlbumsAlbumIdCaptureReadiness,
  getApiV1CaptureAttemptsAttemptId,
  getApiV1GuestMe,
  getApiV1SecurityCsrf,
  postApiV1AlbumsAlbumIdCaptureAttempts,
  postApiV1CaptureAttemptsAttemptIdCommit,
  postApiV1CaptureAttemptsAttemptIdRelease,
  postApiV1CaptureAttemptsAttemptIdUploadAuthorization,
  postApiV1GuestAccessResolve,
  postApiV1GuestSessions,
} from '@/lib/api/browser';
import type { CaptureAttemptStatus, CaptureReadiness, GuestAccessPreview, GuestContext } from '@/lib/api/generated/index.schemas';
import { createUuidV7 } from '@/features/guest/lib/idempotency';
import { guestRoutes } from '@/features/guest/routes';
import { MAX_CAPTURE_BYTES, processCapture } from '@/features/guest/capture/capture-processor';
import {
  CameraViewfinder,
  CaptureReview,
  CaptureWaitingState,
  GuestConsent,
  GuestJoinForm,
  GuestWelcome,
  OfflineNotice,
  UploadStatus,
  CaptureSuccess,
} from './guest-entry-surfaces';

type Stage = 'loading' | 'welcome' | 'join' | 'consent' | 'ready' | 'camera' | 'review' | 'uploading' | 'saved' | 'closed' | 'error';
type Attempt = { attemptId: string; blob: Blob };
type CommittedPhoto = { blob: Blob; url: string };
const MAX_TIMEOUT_CHUNK_MS = 2_147_000_000;

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getOnlineSnapshot() { return navigator.onLine; }
function getServerOnlineSnapshot() { return true; }

class GuestRequestError extends Error {
  constructor(readonly status: number) { super('Guest request failed.'); }
}

function displayNameLength(value: string) { return Array.from(value.trim()).length; }

export function GuestEntryFlow({ linkId }: { linkId: string }) {
  const t = useTranslations('guest');
  const locale = useLocale();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [preview, setPreview] = useState<GuestAccessPreview | null>(null);
  const [context, setContext] = useState<GuestContext | null>(null);
  const [readiness, setReadiness] = useState<CaptureReadiness | null>(null);
  const [readinessFresh, setReadinessFresh] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [onlineRefreshing, setOnlineRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [recoveryRetry, setRecoveryRetry] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [committedPhoto, setCommittedPhoto] = useState<CommittedPhoto | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const linkSecretRef = useRef<string | null>(null);
  const joinKeyRef = useRef<string | null>(null);
  const reservationKeyRef = useRef<string | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const finalJpegRef = useRef<{ attemptId: string; blob: Blob } | null>(null);
  const pendingRef = useRef(false);
  const checkedBoundaryRef = useRef<string | null>(null);
  const checkedRevealRef = useRef(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const clearCommittedPhoto = useCallback(() => setCommittedPhoto(null), []);
  const keepCommittedPhoto = useCallback((attemptId: string) => {
    const final = finalJpegRef.current;
    if (final?.attemptId === attemptId) setCommittedPhoto({ blob: final.blob, url: URL.createObjectURL(final.blob) });
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const failAccess = useCallback(() => {
    stopCamera();
    setReadinessFresh(false);
    setMessage(t('unavailable'));
    setStage('error');
  }, [stopCamera, t]);

  const handleRequestError = useCallback((error: unknown, onDenied?: () => void) => {
    const status = error instanceof GuestRequestError ? error.status : null;
    if (status === 401 || status === 403) {
      onDenied?.();
      failAccess();
    } else setMessage(status === 429 ? t('rateLimited') : t('genericError'));
  }, [failAccess, t]);

  const loadReadiness = useCallback(async (albumId: string) => {
    const result = await getApiV1AlbumsAlbumIdCaptureReadiness(albumId);
    if (result.status !== 200) throw new GuestRequestError(result.status);
    setReadinessFresh(true);
    setElapsedSeconds(0);
    setReadiness(result.data.data);
    return result.data.data;
  }, []);

  const applyReadiness = useCallback((current: CaptureReadiness) => {
    if (current.state === 'CLOSED') {
      stopCamera();
      if (stage !== 'saved') setStage('closed');
    } else if (current.state === 'UNAVAILABLE') failAccess();
    else if (stage === 'closed' || (stage === 'camera' && !current.can_capture)) {
      stopCamera();
      setStage('ready');
    }
  }, [failAccess, stage, stopCamera]);

  const refreshReadiness = useCallback(async () => {
    if (!context) return;
    try { applyReadiness(await loadReadiness(context.guest_session.album_id)); }
    catch (error) { setReadinessFresh(false); handleRequestError(error); }
  }, [applyReadiness, context, handleRequestError, loadReadiness]);

  const restoreGuest = useCallback(async () => {
    const result = await getApiV1GuestMe();
    if (result.status !== 200) throw new GuestRequestError(result.status);
    const restored = result.data.data;
    setContext(restored);
    const current = await loadReadiness(restored.guest_session.album_id);
    if (current.state === 'CLOSED') setStage('closed');
    else if (current.state === 'UNAVAILABLE') failAccess();
    else setStage('ready');
  }, [failAccess, loadReadiness]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const fragmentSecret = window.location.hash.slice(1);
        if (!fragmentSecret) {
          await restoreGuest();
          return;
        }
        linkSecretRef.current = fragmentSecret;
        const result = await postApiV1GuestAccessResolve({ link_id: linkId, access_secret: fragmentSecret });
        if (result.status !== 200) throw new GuestRequestError(result.status);
        if (!active) return;
        setPreview(result.data.data);
        setStage('welcome');
      } catch (error) {
        if (!active) return;
        if (error instanceof GuestRequestError && (error.status === 401 || error.status === 403)) failAccess();
        else {
          handleRequestError(error);
          setRecoveryRetry(true);
          setStage('error');
        }
      }
    })();
    return () => { active = false; stopCamera(); };
  }, [failAccess, handleRequestError, linkId, restoreGuest, stopCamera, t]);

  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  useEffect(() => {
    if (!committedPhoto) return;
    return () => URL.revokeObjectURL(committedPhoto.url);
  }, [committedPhoto]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (stage !== 'camera' || !video || !stream) return;
    video.srcObject = stream;
    void video.play().then(() => setCameraReady(true)).catch(() => setCameraError(t('genericError')));
    return () => setCameraReady(false);
  }, [facing, stage, t]);

  useEffect(() => {
    if (!context || stage === 'error') return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshReadiness();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [context, refreshReadiness, stage]);

  useEffect(() => {
    if (!context || !readiness || stage === 'error') return;
    const boundary = readiness.state === 'WAITING' ? readiness.capture_start : readiness.can_capture ? readiness.capture_end : null;
    if (!boundary) return;
    const key = `${readiness.album_id}:${boundary}`;
    if (checkedBoundaryRef.current === key) return;
    const targetTime = Date.parse(boundary);
    const serverTime = Date.parse(readiness.server_time);
    if (!Number.isFinite(targetTime) || !Number.isFinite(serverTime)) return;
    const remainingAtFetch = targetTime - serverTime;
    const deadline = performance.now() + Math.max(0, remainingAtFetch);
    let timer: number | undefined;
    const scheduleChunk = () => {
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        checkedBoundaryRef.current = key;
        void refreshReadiness();
      } else timer = window.setTimeout(scheduleChunk, Math.min(remaining, MAX_TIMEOUT_CHUNK_MS));
    };
    scheduleChunk();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [context, readiness, refreshReadiness, stage]);

  useEffect(() => {
    if (stage !== 'closed' || !readiness?.reveal_at) return;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [readiness?.reveal_at, stage]);

  useEffect(() => {
    if (stage !== 'closed' || !readiness?.reveal_at || !readiness.server_time) return;
    const remaining = Date.parse(readiness.reveal_at) - Date.parse(readiness.server_time) - elapsedSeconds * 1000;
    if (remaining > 0 || checkedRevealRef.current) return;
    checkedRevealRef.current = true;
    let cancelled = false;
    let retryTimer: number | undefined;
    void getApiV1GuestMe().then((result) => {
      if (cancelled) return;
      if (result.status === 200 && result.data.data.event.reveal_state === 'REVEALED') {
        router.replace(guestRoutes.gallery(linkId));
      } else if (result.status === 410) {
        router.replace(guestRoutes.postEventEnd(linkId));
      } else if (result.status === 401 || result.status === 403) {
        router.replace(guestRoutes.ended(linkId));
      } else {
        checkedRevealRef.current = false;
        retryTimer = window.setTimeout(() => setElapsedSeconds((seconds) => seconds + 1), 15_000);
      }
    }).catch(() => {
      if (!cancelled) {
        checkedRevealRef.current = false;
        retryTimer = window.setTimeout(() => setElapsedSeconds((seconds) => seconds + 1), 15_000);
      }
    });
    return () => { cancelled = true; if (retryTimer !== undefined) window.clearTimeout(retryTimer); };
  }, [context, elapsedSeconds, linkId, readiness, router, stage]);

  useEffect(() => {
    const onOffline = () => { setReadinessFresh(false); };
    const onOnline = () => {
      if (!context) return;
      setOnlineRefreshing(true);
      void refreshReadiness().finally(() => setOnlineRefreshing(false));
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); };
  }, [context, refreshReadiness]);

  function continueToConsent() {
    const nameSize = displayNameLength(displayName);
    if (nameSize < 1 || nameSize > 50 || (preview?.pin_required && !pin)) return;
    setMessage('');
    setStage('consent');
  }

  async function retryEntry() {
    setRecoveryRetry(false);
    setMessage('');
    setStage('loading');
    try {
      if (!linkSecretRef.current) {
        await restoreGuest();
        return;
      }
      const result = await postApiV1GuestAccessResolve({ link_id: linkId, access_secret: linkSecretRef.current });
      if (result.status !== 200) throw new GuestRequestError(result.status);
      setPreview(result.data.data);
      setStage('welcome');
    } catch (error) {
      if (error instanceof GuestRequestError && (error.status === 401 || error.status === 403)) failAccess();
      else {
        handleRequestError(error);
        setRecoveryRetry(true);
        setStage('error');
      }
    }
  }

  async function acceptConsent() {
    if (!preview || !consented || !linkSecretRef.current) return;
    setBusy(true);
    setMessage('');
    joinKeyRef.current ??= createUuidV7();
    try {
      const result = await postApiV1GuestSessions({
        link_id: linkId,
        access_secret: linkSecretRef.current,
        display_name: displayName.trim(),
        ...(preview.pin_required ? { pin } : {}),
        accepted_consent_version: preview.consent_version,
      }, { headers: { 'Idempotency-Key': joinKeyRef.current } });
      if (result.status !== 201) {
        handleRequestError(new GuestRequestError(result.status));
        return;
      }
      window.history.replaceState(null, '', window.location.pathname);
      linkSecretRef.current = null;
      joinKeyRef.current = null;
      setPin('');
      try { await restoreGuest(); }
      catch (error) {
        if (error instanceof GuestRequestError && (error.status === 401 || error.status === 403)) handleRequestError(error);
        else {
          handleRequestError(error);
          setRecoveryRetry(true);
          setStage('error');
        }
      }
    } catch (error) { handleRequestError(error); }
    finally { setBusy(false); }
  }

  async function openCamera(mode: 'environment' | 'user' = facing) {
    if (!isOnline || !navigator.onLine) { setMessage(t('offlineBeforeCapture')); return; }
    if (!context || !navigator.mediaDevices?.getUserMedia) { setCameraError(t('cameraUnsupported')); return; }
    setBusy(true);
    setCameraError('');
    try {
      const current = await loadReadiness(context.guest_session.album_id);
      if (!current.can_capture) {
        applyReadiness(current);
        if (current.state !== 'UNAVAILABLE') setStage(current.state === 'CLOSED' ? 'closed' : 'ready');
        return;
      }
      clearCommittedPhoto();
      stopCamera();
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: mode } } });
      setStage('camera');
    } catch (error) {
      if (error instanceof GuestRequestError) handleRequestError(error);
      else {
        const name = error instanceof DOMException ? error.name : '';
        setCameraError(name === 'NotFoundError' ? t('cameraNotFound') : name === 'NotAllowedError' ? t('cameraPermission') : name === 'NotReadableError' ? t('cameraBusy') : t('genericError'));
      }
    } finally { setBusy(false); }
  }

  async function shutter() {
    if (!context || !videoRef.current || pendingRef.current) return;
    if (!isOnline || !navigator.onLine) { setMessage(t('offlineBeforeCapture')); return; }
    if (!readinessFresh || onlineRefreshing) { setMessage(t('genericError')); return; }
    pendingRef.current = true;
    setBusy(true);
    setMessage('');
    reservationKeyRef.current ??= createUuidV7();
    try {
      const current = await loadReadiness(context.guest_session.album_id);
      if (!current.can_capture) {
        reservationKeyRef.current = null;
        applyReadiness(current);
        if (current.state !== 'CLOSED' && current.state !== 'UNAVAILABLE') setStage('ready');
        return;
      }
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new GuestRequestError(csrf.status);
      const reservation = await postApiV1AlbumsAlbumIdCaptureAttempts(context.guest_session.album_id, {}, {
        headers: { 'Idempotency-Key': reservationKeyRef.current, 'X-CSRF-Token': csrf.data.data.csrf_token },
      });
      if (reservation.status !== 201 || reservation.data.data.status !== 'ACTIVE') {
        if (reservation.status === 409) {
          const updated = await loadReadiness(context.guest_session.album_id);
          reservationKeyRef.current = null;
          applyReadiness(updated);
          setMessage(updated.state === 'WAITING' || updated.state === 'READY' ? t('genericError') : '');
        } else handleRequestError(new GuestRequestError(reservation.status));
        return;
      }
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) throw new Error('camera-frame');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const drawContext = canvas.getContext('2d', { alpha: false });
      if (!drawContext) throw new Error('camera-frame');
      drawContext.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('camera-frame')), 'image/jpeg', 0.95));
      canvas.width = 0;
      canvas.height = 0;
      stopCamera();
      const next = { attemptId: reservation.data.data.attempt_id, blob: frame };
      attemptRef.current = next;
      setAttempt(next);
      setPhotoUrl(URL.createObjectURL(frame));
      setStage('review');
    } catch (error) { handleRequestError(error); }
    finally { pendingRef.current = false; setBusy(false); }
  }

  async function retake() {
    if (!attempt) return;
    setBusy(true);
    try {
      const current = await getApiV1CaptureAttemptsAttemptId(attempt.attemptId);
      if (current.status !== 200) throw new GuestRequestError(current.status);
      if (current.data.data.status === 'EXPIRED' || current.data.data.status === 'RELEASED') {
        await handleTerminalAttempt();
        return;
      }
      if (current.data.data.status === 'COMMITTED') {
        keepCommittedPhoto(attempt.attemptId);
        clearCurrentAttempt();
        setReadinessFresh(false);
        if (context) await loadReadiness(context.guest_session.album_id).catch(() => null);
        setMessage('');
        setStage('saved');
        return;
      }
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new GuestRequestError(csrf.status);
      const result = await postApiV1CaptureAttemptsAttemptIdRelease(attempt.attemptId, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) throw new GuestRequestError(result.status);
      if (result.data.data.status === 'RELEASED' || result.data.data.status === 'EXPIRED') {
        await handleTerminalAttempt();
      } else if (result.data.data.status === 'COMMITTED') {
        keepCommittedPhoto(attempt.attemptId);
        clearCurrentAttempt();
        setReadinessFresh(false);
        if (context) await loadReadiness(context.guest_session.album_id).catch(() => null);
        setMessage('');
        setStage('saved');
      } else throw new Error('attempt-not-released');
    } catch (error) { handleRequestError(error); }
    finally { setBusy(false); }
  }

  function clearCurrentAttempt() {
    attemptRef.current = null;
    finalJpegRef.current = null;
    setAttempt(null);
    setPhotoUrl('');
    reservationKeyRef.current = null;
  }

  async function handleTerminalAttempt() {
    clearCurrentAttempt();
    setReadinessFresh(false);
    setMessage('');
    if (!context) {
      setMessage(t('previousPhotoUnavailable'));
      setStage('ready');
      return;
    }
    try {
      const current = await loadReadiness(context.guest_session.album_id);
      if (current.state === 'CLOSED') {
        setStage('closed');
      } else if (current.state === 'UNAVAILABLE') {
        failAccess();
      } else {
        setStage('ready');
        if (current.state === 'READY' || current.state === 'WAITING') setMessage(t('previousPhotoUnavailable'));
      }
    } catch (error) {
      setStage('ready');
      handleRequestError(error);
    }
  }

  async function upload() {
    if (!attempt) return;
    setStage('uploading');
    setBusy(true);
    setMessage('');
    try {
      const finalJpeg = await processCapture(attempt.blob);
      if (finalJpeg.type !== 'image/jpeg' || finalJpeg.size > MAX_CAPTURE_BYTES) throw new Error('size');
      finalJpegRef.current = { attemptId: attempt.attemptId, blob: finalJpeg };
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new GuestRequestError(csrf.status);
      const headers = { 'X-CSRF-Token': csrf.data.data.csrf_token };
      const authorization = await postApiV1CaptureAttemptsAttemptIdUploadAuthorization(attempt.attemptId, { content_type: 'image/jpeg', size_bytes: finalJpeg.size }, { headers });
      if (authorization.status !== 200) throw new GuestRequestError(authorization.status);
      const put = await fetch(authorization.data.data.upload_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: finalJpeg });
      if (!put.ok) throw new Error('put');
      let recoveredStatus: CaptureAttemptStatus;
      try {
        const commit = await postApiV1CaptureAttemptsAttemptIdCommit(attempt.attemptId, {}, { headers });
        recoveredStatus = commit.status === 201 && commit.data.data.status === 'COMMITTED' ? 'COMMITTED' : 'ACTIVE';
      } catch {
        recoveredStatus = 'ACTIVE';
      }
      if (recoveredStatus !== 'COMMITTED') {
        const recovered = await getApiV1CaptureAttemptsAttemptId(attempt.attemptId);
        if (recovered.status !== 200) throw new GuestRequestError(recovered.status);
        recoveredStatus = recovered.data.data.status;
      }
      if (recoveredStatus === 'ACTIVE') {
        setStage('review');
        setMessage(t('genericError'));
        return;
      }
      if (recoveredStatus === 'EXPIRED' || recoveredStatus === 'RELEASED') {
        await handleTerminalAttempt();
        return;
      }
      keepCommittedPhoto(attempt.attemptId);
      clearCurrentAttempt();
      setReadinessFresh(false);
      if (context) await loadReadiness(context.guest_session.album_id).catch(() => null);
      setStage('saved');
    } catch (error) {
      if (error instanceof GuestRequestError && (error.status === 401 || error.status === 403)) handleRequestError(error);
      else { setStage('review'); setMessage(error instanceof GuestRequestError && error.status === 429 ? t('rateLimited') : t('genericError')); }
    } finally { setBusy(false); }
  }

  const event = preview ?? context?.event;
  function saveToDevice() {
    if (!committedPhoto) return;
    const safeEvent = (event?.event_name ?? 'acara').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'acara';
    const filename = `kepotret-${safeEvent}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    const link = document.createElement('a');
    link.href = committedPhoto.url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
  }
  const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: event?.timezone }).format(new Date(value)) : '';
  const nameValid = displayNameLength(displayName) >= 1 && displayNameLength(displayName) <= 50;
  const revealRemaining = readiness?.reveal_at ? Math.max(0, Date.parse(readiness.reveal_at) - Date.parse(readiness.server_time) - elapsedSeconds * 1000) : 0;
  const revealCountdown = t('countdown', {
    days: Math.floor(revealRemaining / 86_400_000),
    hours: Math.floor((revealRemaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((revealRemaining % 3_600_000) / 60_000),
    seconds: Math.floor((revealRemaining % 60_000) / 1000),
  });

  return <main className="min-h-screen bg-[var(--color-background)] px-4 py-7 text-[var(--color-foreground)] sm:py-12">
    <div className="mx-auto flex min-h-[78vh] w-full max-w-lg flex-col justify-center">
      <header className="mb-6 text-center"><p className="font-[var(--font-display)] text-2xl font-bold">{t('title')}</p><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('subtitle')}</p></header>
      {!isOnline && <OfflineNotice />}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-7">
        {stage === 'loading' && <p role="status">{t('checkingInvitation')}</p>}
        {stage === 'error' && <>
          <p role="alert">{message || t('unavailable')}</p>
          {recoveryRetry && <Button className="mt-4 w-full" loading={busy} onClick={() => void retryEntry()}>{t('retry')}</Button>}
        </>}
        {stage === 'welcome' && preview && <GuestWelcome preview={preview} formatTime={formatTime} onContinue={() => setStage('join')} />}
        {stage === 'join' && preview && <GuestJoinForm
          displayName={displayName} setDisplayName={(value) => { joinKeyRef.current = null; setDisplayName(value); }}
          pin={pin} setPin={(value) => { joinKeyRef.current = null; setPin(value); }}
          pinRequired={preview.pin_required} nameValid={nameValid} error={message}
          onBack={() => { setMessage(''); setStage('welcome'); }} onContinue={continueToConsent} busy={busy}
        />}
        {stage === 'consent' && preview && <GuestConsent
          checked={consented} setChecked={setConsented} error={message}
          onBack={() => { setMessage(''); setStage('join'); }} onContinue={() => void acceptConsent()} busy={busy}
        />}
        {(stage === 'ready' || stage === 'closed' || stage === 'camera' || stage === 'review' || stage === 'uploading' || stage === 'saved') && <>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{locale === 'id' ? 'Acara' : 'Event'}</p>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{event?.event_name}</h1>
          {stage === 'closed' && <div className="mt-6 rounded-lg bg-[var(--color-muted)] p-4"><p className="font-semibold">{t('closed')}</p>{readiness?.reveal_at && <><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('photosReveal')}: {formatTime(readiness.reveal_at)}</p><p className="mt-1 font-mono text-sm" aria-live="off">{revealCountdown}</p></>}</div>}
          {stage === 'ready' && <div className="mt-6"><CaptureWaitingState readiness={readiness} isOffline={!isOnline} revalidating={onlineRefreshing || !readinessFresh} cameraError={cameraError} onOpenCamera={() => void openCamera()} formatTime={formatTime} /></div>}
          {stage === 'camera' && <CameraViewfinder videoRef={videoRef} isReady={cameraReady} isBusy={busy} isOffline={!isOnline || onlineRefreshing} onSwitch={() => { const next = facing === 'environment' ? 'user' : 'environment'; stopCamera(); setStage('ready'); setCameraReady(false); setFacing(next); void openCamera(next); }} onShutter={() => void shutter()} cameraError={cameraError} />}
          {stage === 'review' && photoUrl && <div className="mt-5">{message && <p role="alert" className="mb-4 text-sm text-[var(--color-destructive)]">{message}</p>}<CaptureReview photoUrl={photoUrl} isBusy={busy} onRetake={() => void retake()} onUse={() => void upload()} /></div>}
          {stage === 'uploading' && <UploadStatus />}
          {stage === 'saved' && <CaptureSuccess photoUrl={committedPhoto?.url ?? null} canCapture={Boolean(readiness?.state === 'READY' && readiness.can_capture && readinessFresh && isOnline)} onSave={saveToDevice} onNext={() => void openCamera()} />}
          {message && stage !== 'review' && stage !== 'uploading' && <p role="alert" className="mt-4 text-sm text-[var(--color-destructive)]">{message}</p>}
        </>}
      </section>
      <p className="mt-5 text-center text-xs text-[var(--color-muted-foreground)]">{t('cameraOnly')}</p>
    </div>
  </main>;
}
