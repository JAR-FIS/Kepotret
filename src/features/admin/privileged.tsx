'use client';

import { Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DeliveryImage } from '@/features/gallery/components/delivery-image';
import { getApiV1AdminAlbumsAlbumIdOperationalHold, postApiV1AdminAlbumsAlbumIdOperationalHold, deleteApiV1AdminAlbumsAlbumIdOperationalHold } from '@/lib/api/generated/admin-hold/admin-hold';
import { getApiV1AdminAlbumsAlbumIdSensitiveMedia } from '@/lib/api/generated/admin-sensitive-access/admin-sensitive-access';
import { postApiV1AdminAlbumsAlbumIdSensitiveAccessGrants, deleteApiV1AdminSensitiveAccessGrantsGrantId } from '@/lib/api/generated/admin-sensitive/admin-sensitive';
import { postApiV1AdminAuthStepUp } from '@/lib/api/generated/admin-auth/admin-auth';
import type { OperationalHoldState, SensitiveAccessGrant, AdminSensitiveMedia } from '@/lib/api/generated/index.schemas';
import { AdminCard, AdminEmpty, AdminError, AdminFeedback, AdminField, AdminPage, AdminStatus, AdminRequestError, adminCsrfHeaders, adminErrorKey, adminInputClass, formatAdminDate, type AdminLocale, useAdminOnline } from './common';

function useLocaleCopy() {
  const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale;
  return { locale, t: useTranslations('admin.legacyCopy'), commonT: useTranslations('admin.common') };
}

function errorStatus(reason: unknown) {
  return reason instanceof AdminRequestError ? reason.status : 0;
}

function TotpInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const t = useTranslations('admin.legacyCopy');
  const id = useId();
  const [invalidCharacters, setInvalidCharacters] = useState(false);
  return <div className="min-w-0 text-sm">
    <label htmlFor={id} className="block font-semibold">{t('privileged_totp_code')}</label>
    <input
      id={id}
      className={`${adminInputClass} mt-1.5 font-mono tracking-widest`}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      pattern="[0-9]{6,12}"
      minLength={6}
      maxLength={12}
      aria-describedby={`${id}-hint${invalidCharacters ? ` ${id}-warning` : ''}`}
      aria-invalid={invalidCharacters || undefined}
      disabled={disabled}
      value={value}
      onChange={(event) => {
        const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 12);
        setInvalidCharacters(digits.length !== event.target.value.length);
        onChange(digits);
      }}
    />
    <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">{t('privileged_totp_hint')}</p>
    {invalidCharacters && <p id={`${id}-warning`} role="status" className="mt-1 text-xs leading-5 text-[var(--color-destructive)]">{t('privileged_totp_digits_only')}</p>}
  </div>;
}

function GuidanceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <AdminCard><div className="flex items-start gap-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
    <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
    <div className="space-y-2"><h2 className="font-semibold text-[var(--color-foreground)]">{title}</h2>{children}</div>
  </div></AdminCard>;
}

type SensitiveError = { status: number; phase: 'step-up' | 'grant' | 'media' | 'revoke' };

export function AdminSensitiveAccess({ albumId }: { albumId: string }) {
  const { locale, t, commonT } = useLocaleCopy();
  const online = useAdminOnline();
  const [reason, setReason] = useState('');
  const [totp, setTotp] = useState('');
  const [grant, setGrant] = useState<SensitiveAccessGrant | null>(null);
  const [rows, setRows] = useState<AdminSensitiveMedia[]>([]);
  const [cursor, setCursor] = useState('');
  const [error, setError] = useState<SensitiveError | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const grantRef = useRef<SensitiveAccessGrant | null>(null);
  const mediaRequest = useRef(0);
  const operationInFlight = useRef(false);

  const closeGrant = useCallback(() => {
    mediaRequest.current += 1;
    grantRef.current = null;
    setGrant(null);
    setRows([]);
    setCursor('');
    setConfirm(false);
  }, []);

  useEffect(() => () => { mediaRequest.current += 1; grantRef.current = null; }, [albumId]);
  useEffect(() => {
    if (!grant) return;
    const remaining = Math.max(0, Date.parse(grant.expires_at) - Date.now());
    const timer = window.setTimeout(() => {
      if (grantRef.current?.grant_id === grant.grant_id) {
        closeGrant();
        setError({ status: 410, phase: 'media' });
      }
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [grant, closeGrant]);

  async function showMedia(current: SensitiveAccessGrant, next?: string) {
    const request = ++mediaRequest.current;
    setError(null);
    try {
      const response = await getApiV1AdminAlbumsAlbumIdSensitiveMedia(albumId, {
        grant_id: current.grant_id, limit: 20, ...(next ? { cursor: next } : {}),
      });
      if (request !== mediaRequest.current || grantRef.current?.grant_id !== current.grant_id) return;
      if (Date.parse(current.expires_at) <= Date.now()) {
        closeGrant();
        setError({ status: 410, phase: 'media' });
      } else if (response.status === 200) {
        setRows(response.data.data);
        setCursor(response.data.meta.next_cursor ?? '');
      } else {
        setRows([]);
        setCursor('');
        if (response.status === 401 || response.status === 403 || response.status === 410) closeGrant();
        setError({ status: response.status, phase: 'media' });
      }
    } catch (cause) {
      if (request === mediaRequest.current && grantRef.current?.grant_id === current.grant_id) {
        setRows([]);
        setCursor('');
        setError({ status: errorStatus(cause), phase: 'media' });
      }
    }
  }

  async function begin() {
    if (!online || operationInFlight.current || !reason.trim() || totp.length < 6 || totp.length > 12) return;
    operationInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const step = await postApiV1AdminAuthStepUp({ totp_code: totp }, { headers: await adminCsrfHeaders() });
      setTotp('');
      if (step.status !== 200) { setError({ status: step.status, phase: 'step-up' }); return; }
      const created = await postApiV1AdminAlbumsAlbumIdSensitiveAccessGrants(albumId, { reason: reason.trim() }, { headers: await adminCsrfHeaders() });
      if (created.status !== 201) { setError({ status: created.status, phase: 'grant' }); return; }
      const current = created.data.data;
      if (current.album_id !== albumId || current.view_only !== true || !Number.isFinite(Date.parse(current.expires_at))) {
        setError({ status: -1, phase: 'grant' });
        return;
      }
      if (Date.parse(current.expires_at) <= Date.now()) {
        setError({ status: 410, phase: 'grant' });
        return;
      }
      grantRef.current = current;
      setGrant(current);
      setReason('');
      void showMedia(current);
    } catch (cause) {
      setTotp('');
      setError({ status: errorStatus(cause), phase: 'grant' });
    } finally {
      operationInFlight.current = false;
      setBusy(false);
      setConfirm(false);
    }
  }

  async function revoke() {
    const current = grantRef.current;
    if (!current || !online || operationInFlight.current || totp.length < 6 || totp.length > 12) return;
    operationInFlight.current = true;
    mediaRequest.current += 1;
    setRows([]);
    setCursor('');
    setBusy(true);
    setError(null);
    try {
      const step = await postApiV1AdminAuthStepUp({ totp_code: totp }, { headers: await adminCsrfHeaders() });
      setTotp('');
      if (step.status !== 200) { setError({ status: step.status, phase: 'step-up' }); return; }
      const response = await deleteApiV1AdminSensitiveAccessGrantsGrantId(current.grant_id, { headers: await adminCsrfHeaders() });
      if (response.status === 200) closeGrant();
      else {
        if (response.status === 401 || response.status === 403 || response.status === 404) closeGrant();
        setError({ status: response.status, phase: 'revoke' });
      }
    } catch (cause) {
      setTotp('');
      setError({ status: errorStatus(cause), phase: 'revoke' });
    } finally {
      operationInFlight.current = false;
      setBusy(false);
      setConfirm(false);
    }
  }

  const canSubmit = online && !busy && totp.length >= 6 && totp.length <= 12 && (grant ? true : !!reason.trim());
  return <AdminPage title={t('privileged_sensitive_media_access')} description={t('privileged_temporary_album_scoped_view_only_a')} wideDescription>
    <AdminCard title={t('privileged_access_boundaries')}><p className="text-sm leading-6">{t('privileged_no_download_sharing_zip_moderation')}</p></AdminCard>
    {!grant ? <AdminCard title={t('privileged_request_temporary_grant')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label={t('privileged_audit_reason')}><textarea className={adminInputClass} rows={3} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} /></AdminField>
        <TotpInput value={totp} onChange={setTotp} disabled={busy} />
      </div>
      <Button className="mt-4" disabled={!canSubmit} loading={busy} onClick={() => setConfirm(true)}>{t('privileged_continue_to_confirmation')}</Button>
    </AdminCard> : <>
      <AdminCard title={t('privileged_active_grant')}>
        <dl className="min-w-0 text-sm"><dt>{t('privileged_grant_id')}</dt><dd className="break-all font-mono">{grant.grant_id}</dd><dt className="mt-3">{t('privileged_expires')}</dt><dd>{formatAdminDate(grant.expires_at, locale)}</dd><dt className="mt-3">{t('privileged_scope')}</dt><dd>{t('privileged_this_album_view_only')}</dd></dl>
        <div className="mt-4 max-w-sm"><TotpInput value={totp} onChange={setTotp} disabled={busy} /></div>
        <Button className="mt-4" variant="danger" disabled={!canSubmit} loading={busy} onClick={() => setConfirm(true)}>{t('privileged_revoke_access_and_close_workspace')}</Button>
      </AdminCard>
      <AdminCard title={t('privileged_authorized_media')}>
        {rows.length === 0 ? <AdminEmpty>{t('privileged_no_media_in_this_page')}</AdminEmpty> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((photo) => <li key={photo.photo_id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"><DeliveryImage src={photo.media.url} alt={t('privileged_private_photo_under_sensitive_acce')} unavailableLabel={t('privileged_media_is_no_longer_available')} className="aspect-square w-full object-cover" /><p className="break-all p-3 text-xs text-[var(--color-muted-foreground)]">{photo.photo_id}<br />{formatAdminDate(photo.created_at, locale)}</p></li>)}</ul>}
        {cursor && <Button variant="secondary" disabled={busy || !online} className="mt-4" onClick={() => void showMedia(grant, cursor)}>{t('privileged_load_next_page')}</Button>}
      </AdminCard>
    </>}
    {error && <div>
      <AdminFeedback>{error.phase === 'step-up' && error.status === 401 ? t('privileged_step_up_rejected') : error.status === 410 && error.phase === 'media' ? t('privileged_the_grant_expired_or_access_was_re') : commonT(adminErrorKey(error.status))}</AdminFeedback>
      {grant && <Button className="mt-3" variant="secondary" disabled={!online || busy} onClick={() => void showMedia(grant)}>{commonT('reload')}</Button>}
    </div>}
    <GuidanceCard title={t('privileged_sensitive_guidance_title')}>
      <p>{t('privileged_sensitive_guidance_purpose')}</p>
      <p>{t('privileged_sensitive_guidance_grant')}</p>
      <p>{t('privileged_sensitive_guidance_limits')}</p>
      <p>{t('privileged_sensitive_guidance_end')}</p>
    </GuidanceCard>
    <ConfirmDialog open={confirm} title={grant ? t('privileged_revoke_media_grant') : t('privileged_create_temporary_grant')} description={grant ? t('privileged_media_access_and_currently_display') : t('privileged_the_grant_is_temporary_limited_to')} confirmLabel={t('privileged_confirm')} cancelLabel={t('privileged_cancel')} destructive onCancel={() => setConfirm(false)} onConfirm={() => grant ? void revoke() : void begin()} disabled={!canSubmit} />
  </AdminPage>;
}

export function AdminOperationalHold({ albumId }: { albumId: string }) {
  const { locale, t, commonT } = useLocaleCopy();
  const online = useAdminOnline();
  const [state, setState] = useState<OperationalHoldState | null>(null);
  const [reason, setReason] = useState('');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [loadError, setLoadError] = useState<number>();
  const [actionError, setActionError] = useState<{ status: number; stepUp: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const operationInFlight = useRef(false);

  async function load() {
    setBusy(true);
    setLoadError(undefined);
    try {
      const response = await getApiV1AdminAlbumsAlbumIdOperationalHold(albumId);
      if (response.status === 200) setState(response.data.data);
      else { setState(null); setLoadError(response.status); }
    } catch (cause) {
      setState(null);
      setLoadError(errorStatus(cause));
    } finally { setBusy(false); }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- load authoritative hold state after mount or album change
  useEffect(() => { void load(); }, [albumId]);

  async function mutate() {
    if (!online || busy || !state || operationInFlight.current || !reason.trim() || totp.length < 6 || totp.length > 12) return;
    operationInFlight.current = true;
    setMutating(true);
    setActionError(null);
    try {
      const step = await postApiV1AdminAuthStepUp({ totp_code: totp }, { headers: await adminCsrfHeaders() });
      setTotp('');
      if (step.status !== 200) { setActionError({ status: step.status, stepUp: true }); return; }
      const headers = await adminCsrfHeaders();
      const response = state.active_hold
        ? await deleteApiV1AdminAlbumsAlbumIdOperationalHold(albumId, { reason: reason.trim() }, { headers })
        : await postApiV1AdminAlbumsAlbumIdOperationalHold(albumId, { reason: reason.trim() }, { headers });
      if (response.status === 200) { setReason(''); await load(); }
      else { setState(null); setActionError({ status: response.status, stepUp: false }); await load(); }
    } catch (cause) {
      setTotp('');
      setState(null);
      setActionError({ status: errorStatus(cause), stepUp: false });
      await load();
    } finally {
      operationInFlight.current = false;
      setMutating(false);
      setConfirm(false);
    }
  }

  const canSubmit = online && !busy && !mutating && !!state && !!reason.trim() && totp.length >= 6 && totp.length <= 12;
  return <AdminPage title="Operational Hold" description={t('privileged_this_containment_closes_guest_acce')}>
    <AdminCard title={t('privileged_current_state')}>
      {busy ? <p role="status">{t('privileged_loading_state')}</p> : loadError !== undefined ? <AdminError locale={locale} status={loadError} retry={() => void load()} /> : <><AdminStatus value={state?.active_hold ? 'ACTIVE HOLD' : 'NO ACTIVE HOLD'} />{state?.active_hold && <dl className="mt-4 space-y-2 text-sm"><div><dt>{t('privileged_started')}</dt><dd>{formatAdminDate(state.active_hold.created_at, locale)}</dd></div><div><dt>{t('privileged_reason')}</dt><dd className="break-words">{state.active_hold.reason}</dd></div></dl>}</>}
    </AdminCard>
    <AdminCard title={state?.active_hold ? t('privileged_release_hold') : t('privileged_create_hold')}>
      <p className="mb-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('privileged_this_action_requires_an_audit_reas')}</p>
      <div className="grid gap-4 sm:grid-cols-2"><AdminField label={t('privileged_required_reason')}><textarea className={adminInputClass} rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy || mutating} /></AdminField><TotpInput value={totp} onChange={setTotp} disabled={busy || mutating} /></div>
      <Button className="mt-4" variant={state?.active_hold ? 'secondary' : 'danger'} disabled={!canSubmit} loading={mutating} onClick={() => setConfirm(true)}>{state?.active_hold ? t('privileged_confirm_release') : t('privileged_confirm_operational_hold')}</Button>
    </AdminCard>
    {actionError && <AdminFeedback>{actionError.stepUp && actionError.status === 401 ? t('privileged_step_up_rejected') : commonT(adminErrorKey(actionError.status))}</AdminFeedback>}
    <GuidanceCard title={t('privileged_hold_guidance_title')}>
      <p>{t('privileged_hold_guidance_authority')}</p>
      <p>{t('privileged_hold_guidance_effect')}</p>
      <p>{t('privileged_hold_guidance_release')}</p>
      <p>{t('privileged_hold_guidance_limits')}</p>
    </GuidanceCard>
    <ConfirmDialog open={confirm} title={state?.active_hold ? t('privileged_release_operational_hold') : t('privileged_activate_operational_hold')} description={state?.active_hold ? t('privileged_the_server_will_continue_to_apply') : t('privileged_guest_access_and_the_online_featur')} confirmLabel={t('privileged_continue')} cancelLabel={t('privileged_cancel')} destructive onCancel={() => setConfirm(false)} onConfirm={() => void mutate()} disabled={!canSubmit} />
  </AdminPage>;
}
