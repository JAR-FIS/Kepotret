'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Clock3, RotateCcw } from 'lucide-react';
import Image from 'next/image';
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
import type { CaptureReadiness, GuestAccessPreview, GuestContext } from '@/lib/api/generated/index.schemas';
import { createUuidV7 } from '@/features/guest/lib/idempotency';
import { MAX_CAPTURE_BYTES, processCapture } from '@/features/guest/capture/capture-processor';

type Stage = 'loading' | 'entry' | 'ready' | 'camera' | 'review' | 'uploading' | 'saved' | 'closed' | 'error';
type Attempt = { attemptId: string; blob: Blob };
const copy = {
  id: { title: 'Kepotret', subtitle: 'Satu kamera untuk momen bersama.', name: 'Nama tampilan', pin: 'PIN acara', consent: 'Saya menyetujui persetujuan foto acara untuk album ini (versi {version}).', consentReview: 'CONTENT REVIEW REQUIRED', join: 'Lanjutkan', wait: 'Belum waktunya mengambil foto', start: 'Buka kamera', camera: 'Kamera acara', shutter: 'Ambil foto', use: 'Gunakan foto', retake: 'Ambil ulang', retry: 'Coba lagi', saved: 'Foto tersimpan', closed: 'Sesi foto telah ditutup', unavailable: 'Tautan atau akses acara ini tidak tersedia.', generic: 'Kami belum dapat memproses permintaan. Periksa koneksi lalu coba lagi.', permission: 'Izin kamera diperlukan untuk mengambil foto.', offline: 'Koneksi internet diperlukan sebelum mengambil foto.', quota: 'Kuota foto untuk sesi ini telah tercapai.', guestLimit: 'Batas foto peserta telah tercapai.', tooLarge: 'Foto belum dapat diproses. Silakan ambil ulang.',
  },
  en: { title: 'Kepotret', subtitle: 'One camera for a shared moment.', name: 'Display name', pin: 'Event PIN', consent: 'I agree to the event photo-sharing consent for this album (version {version}).', consentReview: 'CONTENT REVIEW REQUIRED', join: 'Continue', wait: 'It is not time to take photos yet', start: 'Open camera', camera: 'Event camera', shutter: 'Take photo', use: 'Use photo', retake: 'Retake', retry: 'Try again', saved: 'Photo saved', closed: 'The photo session is closed', unavailable: 'This event link or access is unavailable.', generic: 'We could not complete that request. Check your connection and try again.', permission: 'Camera permission is needed to take a photo.', offline: 'An internet connection is required before taking a photo.', quota: 'The photo quota for this session has been reached.', guestLimit: 'The guest photo limit has been reached.', tooLarge: 'This photo could not be processed. Please retake it.',
  },
};
const displayNameLength = (value: string) => Array.from(value.trim()).length;

export function GuestEntryFlow({ linkId }: { linkId: string }) {
  const lang = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
  const t = copy[lang];
  const [stage, setStage] = useState<Stage>('loading');
  const [preview, setPreview] = useState<GuestAccessPreview | null>(null);
  const [context, setContext] = useState<GuestContext | null>(null);
  const [readiness, setReadiness] = useState<CaptureReadiness | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const linkSecretRef = useRef<string | null>(null);
  const joinKeyRef = useRef<string | null>(null);
  const reservationKeyRef = useRef<string | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const pendingRef = useRef(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const loadReadiness = useCallback(async (albumId: string) => {
    const result = await getApiV1AlbumsAlbumIdCaptureReadiness(albumId);
    if (result.status !== 200) throw new Error('readiness');
    setElapsedSeconds(0);
    setReadiness(result.data.data);
    return result.data.data;
  }, []);

  const restoreGuest = useCallback(async () => {
    const result = await getApiV1GuestMe();
    if (result.status !== 200) throw new Error('guest');
    const restored = result.data.data;
    setContext(restored);
    const current = await loadReadiness(restored.guest_session.album_id);
    if (current.state === 'CLOSED') setStage('closed');
    else if (current.state === 'UNAVAILABLE') { setMessage(t.unavailable); setStage('error'); }
    else setStage('ready');
  }, [loadReadiness, t.unavailable]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const fragment = window.location.hash.slice(1);
        if (!fragment) {
          await restoreGuest();
          return;
        }
        linkSecretRef.current = fragment;
        const result = await postApiV1GuestAccessResolve({ link_id: linkId, access_secret: fragment });
        if (!active) return;
        if (result.status !== 200) throw new Error('resolve');
        setPreview(result.data.data);
        setStage('entry');
      } catch {
        if (active) { setMessage(t.unavailable); setStage('error'); }
      }
    })();
    return () => { active = false; stopCamera(); };
  }, [linkId, restoreGuest, stopCamera, t.unavailable]);

  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (stage !== 'camera' || !video || !stream) return;
    video.srcObject = stream;
    void video.play().then(() => setCameraReady(true)).catch(() => setCameraError(t.generic));
    return () => setCameraReady(false);
  }, [stage, facing, t.generic]);

  useEffect(() => {
    if (!context) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadReadiness(context.guest_session.album_id).then((r) => {
        if (r.state === 'CLOSED') { stopCamera(); setStage('closed'); }
        else if (r.state === 'UNAVAILABLE') { stopCamera(); setMessage(t.unavailable); setStage('error'); }
        else if (r.state === 'READY' && stage === 'closed') setStage('ready');
      }).catch(() => setMessage(t.generic));
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [context, loadReadiness, stage, stopCamera, t.generic, t.unavailable]);

  useEffect(() => {
    if (stage !== 'closed' || !readiness?.reveal_at) return;
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage, readiness?.reveal_at]);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!preview || !consented || displayNameLength(name) < 1 || displayNameLength(name) > 50 || (preview.pin_required && !pin)) return;
    if (!linkSecretRef.current) { setMessage(t.unavailable); return; }
    setBusy(true); setMessage(''); joinKeyRef.current ??= createUuidV7();
    try {
      const result = await postApiV1GuestSessions({ link_id: linkId, access_secret: linkSecretRef.current, display_name: name, ...(preview.pin_required ? { pin } : {}), accepted_consent_version: preview.consent_version }, { headers: { 'Idempotency-Key': joinKeyRef.current } });
      if (result.status !== 201) { if (result.status !== 429) joinKeyRef.current = null; setMessage(t.generic); return; }
      window.history.replaceState(null, '', window.location.pathname);
      linkSecretRef.current = null; setPin('');
      await restoreGuest();
    } catch { setMessage(t.generic); }
    finally { setBusy(false); }
  }

  async function openCamera(mode: 'environment' | 'user' = facing) {
    if (!context || !navigator.mediaDevices?.getUserMedia) { setCameraError(lang === 'id' ? 'Peramban ini tidak mendukung kamera.' : 'This browser does not support camera access.'); return; }
    setBusy(true); setCameraError('');
    try {
      const current = await loadReadiness(context.guest_session.album_id);
      if (!current.can_capture) {
        stopCamera();
        if (current.state === 'CLOSED') setStage('closed');
        else if (current.state === 'UNAVAILABLE') { setMessage(t.unavailable); setStage('error'); }
        else setStage('ready');
        return;
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: mode } } });
      streamRef.current = stream;
      setStage('camera');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setCameraError(name === 'NotFoundError' ? (lang === 'id' ? 'Kamera tidak ditemukan pada perangkat ini.' : 'No camera was found on this device.') : name === 'NotAllowedError' ? t.permission : name === 'NotReadableError' ? (lang === 'id' ? 'Kamera sedang digunakan aplikasi lain.' : 'The camera is busy in another app.') : t.generic);
    } finally { setBusy(false); }
  }

  async function shutter() {
    if (!context || !videoRef.current || pendingRef.current) return;
    if (!navigator.onLine) { setMessage(t.offline); return; }
    pendingRef.current = true; setBusy(true); setMessage('');
    reservationKeyRef.current ??= createUuidV7();
    try {
      const current = await loadReadiness(context.guest_session.album_id);
      if (!current.can_capture) {
        stopCamera();
        if (current.state === 'CLOSED') setStage('closed');
        else if (current.state === 'UNAVAILABLE') { setMessage(t.unavailable); setStage('error'); }
        else setStage('ready');
        return;
      }
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new Error('csrf');
      const reservation = await postApiV1AlbumsAlbumIdCaptureAttempts(context.guest_session.album_id, {}, { headers: { 'Idempotency-Key': reservationKeyRef.current, 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (reservation.status !== 201 || reservation.data.data.status !== 'ACTIVE') {
        reservationKeyRef.current = null;
        if (reservation.status === 409) {
          const updated = await loadReadiness(context.guest_session.album_id).catch(() => null);
          setMessage(updated?.state === 'GUEST_LIMIT_REACHED' ? t.guestLimit : updated?.state === 'QUOTA_FULL' ? t.quota : t.generic);
          if (updated?.state === 'CLOSED') setStage('closed');
        } else setMessage(t.generic);
        return;
      }
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) throw new Error('camera-frame');
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context2d = canvas.getContext('2d', { alpha: false });
      if (!context2d) throw new Error('camera-frame');
      context2d.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('camera-frame')), 'image/jpeg', 0.95));
      canvas.width = 0; canvas.height = 0;
      stopCamera();
      const next = { attemptId: reservation.data.data.attempt_id, blob: frame };
      attemptRef.current = next; setAttempt(next); setPhotoUrl(URL.createObjectURL(frame)); setStage('review');
    } catch { setMessage(t.generic); }
    finally { pendingRef.current = false; setBusy(false); }
  }

  async function retake() {
    if (!attempt) return;
    setBusy(true);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new Error('csrf');
      const result = await postApiV1CaptureAttemptsAttemptIdRelease(attempt.attemptId, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status !== 200) throw new Error('release');
      attemptRef.current = null; setAttempt(null); setPhotoUrl(''); reservationKeyRef.current = null; setStage('ready');
    } catch { setMessage(t.generic); }
    finally { setBusy(false); }
  }

  async function upload() {
    if (!attempt) return;
    setStage('uploading'); setBusy(true); setMessage('');
    try {
      const finalJpeg = await processCapture(attempt.blob);
      if (finalJpeg.type !== 'image/jpeg' || finalJpeg.size > MAX_CAPTURE_BYTES) throw new Error('size');
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) throw new Error('csrf');
      const headers = { 'X-CSRF-Token': csrf.data.data.csrf_token };
      const authorization = await postApiV1CaptureAttemptsAttemptIdUploadAuthorization(attempt.attemptId, { content_type: 'image/jpeg', size_bytes: finalJpeg.size }, { headers });
      if (authorization.status !== 200) throw new Error('authorization');
      const uploadData = authorization.data.data;
      const put = await fetch(uploadData.upload_url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: finalJpeg });
      if (!put.ok) throw new Error('put');
      let committed = false;
      try {
        const commit = await postApiV1CaptureAttemptsAttemptIdCommit(attempt.attemptId, {}, { headers });
        committed = commit.status === 201 && commit.data.data.status === 'COMMITTED';
      } catch {
        committed = false;
      }
      if (!committed) {
        const recovered = await getApiV1CaptureAttemptsAttemptId(attempt.attemptId);
        if (recovered.status !== 200 || recovered.data.data.status !== 'COMMITTED') throw new Error('commit');
      }
      attemptRef.current = null; setAttempt(null); setPhotoUrl(''); reservationKeyRef.current = null;
      if (context) await loadReadiness(context.guest_session.album_id).catch(() => null);
      setStage('saved');
    } catch {
      setStage('review'); setMessage(t.generic);
    } finally { setBusy(false); }
  }

  const event = preview ?? context?.event;
  const format = (value?: string | null) => value ? new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: event?.timezone }).format(new Date(value)) : '';
  const revealRemaining = readiness?.reveal_at ? Math.max(0, Date.parse(readiness.reveal_at) - Date.parse(readiness.server_time) - elapsedSeconds * 1000) : 0;
  const revealCountdown = `${Math.floor(revealRemaining / 86_400_000)}d ${Math.floor((revealRemaining % 86_400_000) / 3_600_000)}h ${Math.floor((revealRemaining % 3_600_000) / 60_000)}m ${Math.floor((revealRemaining % 60_000) / 1000)}s`;

  return <main className="min-h-screen bg-[var(--color-background)] px-4 py-7 text-[var(--color-foreground)] sm:py-12">
    <div className="mx-auto flex min-h-[78vh] w-full max-w-lg flex-col justify-center">
      <header className="mb-6 text-center"><p className="font-[var(--font-display)] text-2xl font-bold">{t.title}</p><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t.subtitle}</p></header>
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-7">
        {stage === 'loading' && <p role="status">{lang === 'id' ? 'Memeriksa undangan…' : 'Checking your invitation…'}</p>}
        {stage === 'error' && <p role="alert">{message || t.unavailable}</p>}
        {stage === 'entry' && preview && <>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{lang === 'id' ? 'Undangan acara' : 'Event invitation'}</p>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{preview.event_name}</h1>
          {preview.event_location && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{preview.event_location}</p>}
          <p className="mt-4 flex items-center gap-2 text-sm"><Clock3 size={16} />{preview.capture_start ? `${format(preview.capture_start)}${preview.capture_end ? ` – ${format(preview.capture_end)}` : ''}` : preview.capture_state}</p>
          <form onSubmit={join} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">{t.name}<input required value={displayName} onChange={(e) => { joinKeyRef.current = null; setDisplayName(e.target.value); }} autoComplete="nickname" className="mt-1.5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3" /></label>
            {preview.pin_required && <label className="block text-sm font-medium">{t.pin}<input required type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => { joinKeyRef.current = null; setPin(e.target.value); }} className="mt-1.5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3" /></label>}
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" /><span>{t.consent.replace('{version}', preview.consent_version)}<span className="mt-1 block text-xs font-semibold text-[var(--color-destructive)]">{t.consentReview}</span></span></label>
            {message && <p role="alert" className="text-sm text-[var(--color-destructive)]">{message}</p>}
            <Button type="submit" loading={busy} disabled={!consented || displayNameLength(displayName) < 1 || displayNameLength(displayName) > 50} className="w-full">{t.join}</Button>
          </form>
        </>}
          {(stage === 'ready' || stage === 'closed' || stage === 'camera' || stage === 'review' || stage === 'uploading' || stage === 'saved') && <>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{lang === 'id' ? 'Acara' : 'Event'}</p>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{event?.event_name}</h1>
          {stage === 'closed' && <div className="mt-6 rounded-lg bg-[var(--color-muted)] p-4"><p className="font-semibold">{t.closed}</p>{readiness?.reveal_at && <><p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{lang === 'id' ? 'Foto dibuka' : 'Photos reveal'}: {format(readiness.reveal_at)}</p><p className="mt-1 font-mono text-sm" aria-live="off">{revealCountdown}</p></>}</div>}
          {stage === 'ready' && <div className="mt-6 space-y-4"><p className="text-sm text-[var(--color-muted-foreground)]">{readiness?.can_capture ? (lang === 'id' ? 'Kamera acara siap.' : 'The event camera is ready.') : t.wait}</p>{readiness?.state === 'QUOTA_FULL' && <p role="status">{t.quota}</p>}{readiness?.state === 'GUEST_LIMIT_REACHED' && <p role="status">{t.guestLimit}</p>}<Button onClick={() => void openCamera()} loading={busy} disabled={!readiness?.can_capture} className="w-full"><Camera size={18} />{t.start}</Button>{cameraError && <p role="alert" className="text-sm text-[var(--color-destructive)]">{cameraError}</p>}</div>}
          {stage === 'camera' && <div className="mt-5 space-y-4"><video ref={videoRef} playsInline muted aria-label={t.camera} className="aspect-[3/4] w-full rounded-xl bg-black object-cover" /><div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => { const next = facing === 'environment' ? 'user' : 'environment'; setStage('ready'); setCameraReady(false); setFacing(next); void openCamera(next); }}><RotateCcw size={16} />{lang === 'id' ? 'Balik kamera' : 'Switch camera'}</Button><Button className="flex-1" loading={busy} disabled={!cameraReady} onClick={() => void shutter()}><Camera size={18} />{t.shutter}</Button></div>{cameraError && <p role="alert" className="text-sm text-[var(--color-destructive)]">{cameraError}</p>}</div>}
          {stage === 'review' && photoUrl && <div className="mt-5 space-y-4"><Image src={photoUrl} alt={lang === 'id' ? 'Pratinjau foto acara' : 'Event photo preview'} width={600} height={800} unoptimized className="aspect-[3/4] w-full rounded-xl bg-black object-contain" />{message && <p role="alert" className="text-sm text-[var(--color-destructive)]">{message}</p>}<div className="flex gap-3"><Button variant="secondary" className="flex-1" loading={busy} onClick={() => void retake()}><RotateCcw size={16} />{t.retake}</Button><Button className="flex-1" loading={busy} onClick={() => void upload()}><Check size={18} />{t.use}</Button></div></div>}
          {(stage === 'uploading' || stage === 'saved') && <div role="status" className="mt-6 rounded-lg bg-[var(--color-muted)] p-4 text-center">{stage === 'saved' ? t.saved : (lang === 'id' ? 'Menyimpan foto…' : 'Saving your photo…')}{stage === 'saved' && readiness?.can_capture && <Button className="mt-4 w-full" onClick={() => setStage('ready')}>{t.start}</Button>}</div>}
          {message && stage !== 'review' && <p role="alert" className="mt-4 text-sm text-[var(--color-destructive)]">{message}</p>}
        </>}
      </section>
      <p className="mt-5 text-center text-xs text-[var(--color-muted-foreground)]">{lang === 'id' ? 'Foto diambil menggunakan kamera perangkat.' : 'Photos are taken with your device camera.'}</p>
    </div>
  </main>;
}
