'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { Info } from 'lucide-react';
import {
  getApiV1AdminPayments, getApiV1AdminPaymentsTransactionId, postApiV1AdminPaymentsTransactionIdReconcile,
  getApiV1AdminPackages, postApiV1AdminPackagesPackageIdVersions, getApiV1AdminOperationalConfigs, patchApiV1AdminOperationalConfigsKey,
  getApiV1AdminIssues, getApiV1AdminIssuesIssueId, postApiV1AdminIssuesIssueIdAcknowledge, postApiV1AdminIssuesIssueIdResolve,
  getApiV1AdminAuditLogs, getApiV1AdminAuditLogsAuditId, getApiV1AdminAdmins, getApiV1AdminEventCategories, postApiV1AdminEventCategories, patchApiV1AdminEventCategoriesCategoryId,
  patchApiV1AdminPackageVersionsVersionIdSaleStatus,
} from '@/lib/api/admin-browser';
import type { AdminPackage, AdminPackageVersion, AdminPaymentDiagnosis, AdminAuditLogSummary, AdminRosterEntry, EventCategory, OperationalConfig, OperationalIssue, PaymentTransaction, PackageVersionCreateRequest } from '@/lib/api/generated/index.schemas';
import { createUuidV7 } from '@/features/guest/lib/idempotency';
import { formatIdrPriceInput, normalizeIdrPriceEdit, parseIdrPrice } from './package-price';
import { AdminCard, AdminEmpty, AdminError, AdminFeedback, AdminField, AdminOfflineNote, AdminPage, AdminPagination, AdminStatus, adminCsrfHeaders, adminErrorKey, adminInputClass, formatAdminDate, formatAdminNumber, type AdminLocale, useAdminOnline } from './common';

function useCopy() { const locale = (useLocale() === 'en' ? 'en' : 'id') as AdminLocale; const t = useTranslations('admin.legacyCopy'); const commonT = useTranslations('admin.common'); return { locale, id: locale === 'id', t, commonT }; }

function AdminAboutCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <AdminCard><div className="flex items-start gap-3 text-xs leading-5 text-[var(--color-muted-foreground)]"><Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold text-[var(--color-foreground)]">{title}</h2><div className="mt-1">{children}</div></div></div></AdminCard>;
}

export function AdminPayments() {
  const { locale, t } = useCopy(); const info = useTranslations('admin.information'); const [rows, setRows] = useState<PaymentTransaction[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [more, setMore] = useState(false); const [busy, setBusy] = useState(true); const [error, setError] = useState<number>();
  async function load(next?: string) { setBusy(true); setError(undefined); try { const r = await getApiV1AdminPayments({ limit: 25, ...(next ? { cursor: next } : {}) }); if (r.status === 200) { setRows(r.data.data); setCursor(r.data.meta.next_cursor ?? null); setMore(r.data.meta.has_more); } else setError(r.status); } catch { setError(0); } finally { setBusy(false); } }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
  useEffect(() => { void load(); }, []);
  return <AdminPage title={t('data_payments')} description={t('data_transaction_diagnosis_and_provider')} wideDescription>{error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : <AdminCard title={t('data_transactions')}>
    <p className="mb-4 text-xs leading-5 text-[var(--color-muted-foreground)]">{info('paymentListHint')}</p>
    {busy && <p role="status">{t('data_loading_transactions')}</p>}{!busy && rows.length === 0 ? <AdminEmpty>{t('data_no_transactions')}</AdminEmpty> : <div className="space-y-2">{rows.map(p => <Link key={p.transaction_id} href={`/admin/payments/${encodeURIComponent(p.transaction_id)}`} className="grid min-w-0 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:grid-cols-[minmax(0,1fr)_auto]"><span className="min-w-0"><b className="block">{p.package_name_snapshot} · {p.type}</b><span className="block break-all font-mono text-xs text-[var(--color-muted-foreground)]">{p.transaction_id}</span><span className="mt-2 block break-all text-xs text-[var(--color-muted-foreground)]">{info('paymentAlbumId')}: {p.album_id}</span><span className="block text-xs text-[var(--color-muted-foreground)]">{info('paymentCreated')}: {formatAdminDate(p.created_at, locale)}</span>{p.paid_at && <span className="block text-xs text-[var(--color-muted-foreground)]">{info('paymentPaid')}: {formatAdminDate(p.paid_at, locale)}</span>}</span><span className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end"><AdminStatus value={p.status} /><span className="tabular-nums">{new Intl.NumberFormat(locale,{style:'currency',currency:p.currency}).format(p.amount)}</span></span></Link>)}</div>}
    <AdminPagination hasMore={more} cursor={cursor} busy={busy} locale={locale} onNext={() => cursor && void load(cursor)} />
  </AdminCard>}</AdminPage>;
}

export function AdminPaymentDetail({ transactionId }: { transactionId: string }) {
  const { locale, t, commonT } = useCopy(); const info = useTranslations('admin.information'); const online = useAdminOnline(); const [data, setData] = useState<AdminPaymentDiagnosis | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState<number>(); const [working, setWorking] = useState(false); const [confirm, setConfirm] = useState(false); const [message, setMessage] = useState('');
  async function load() { setBusy(true); setError(undefined); try { const r = await getApiV1AdminPaymentsTransactionId(transactionId); if (r.status === 200) setData(r.data.data); else setError(r.status); } catch { setError(0); } finally { setBusy(false); } }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reload when the route transaction changes
  useEffect(() => { void load(); }, [transactionId]);
  async function reconcile() { setWorking(true); setError(undefined); setMessage(''); try { const r = await postApiV1AdminPaymentsTransactionIdReconcile(transactionId, { headers: await adminCsrfHeaders() }); if (r.status === 200) { setData(r.data.data); setMessage(t('data_latest_provider_response_and_trans')); } else setError(r.status); } catch { setError(0); } finally { setWorking(false); setConfirm(false); } }
  const p = data?.transaction;
  return <AdminPage title={t('data_payment_diagnosis')} description={t('data_reconciliation_only_requests_a_pro')}>{error !== undefined ? <AdminError locale={locale} status={error} retry={() => void load()} /> : busy ? <p role="status">{t('data_loading_diagnosis')}</p> : !data || !p ? <AdminEmpty>{t('data_transaction_not_found')}</AdminEmpty> : <>
    <AdminCard title={p.package_name_snapshot}><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_transaction_id')}</dt><dd className="break-all font-mono">{p.transaction_id}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{commonT('album')}</dt><dd className="break-all font-mono">{p.album_id}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_server_status')}</dt><dd><AdminStatus value={p.status} /></dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_type')}</dt><dd>{p.type}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_snapshot_amount')}</dt><dd>{new Intl.NumberFormat(locale,{style:'currency',currency:p.currency}).format(p.amount)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_snapshot_target_quota')}</dt><dd>{formatAdminNumber(p.target_quota_total_snapshot, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_payment_cutoff')}</dt><dd>{formatAdminDate(p.payment_cutoff_at, locale)}</dd></div><div><dt className="text-xs text-[var(--color-muted-foreground)]">{t('data_current_entitlement')}</dt><dd className="break-words">{data.entitlement ? JSON.stringify(data.entitlement) : (t('data_no_projection'))}</dd></div></dl></AdminCard>
    <AdminCard title={t('data_provider_receipt_diagnostics')}>{data.receipt_diagnostics.length ? <ul className="space-y-3">{data.receipt_diagnostics.map(x => <li key={x.receipt_id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm"><p className="font-semibold">{x.source} · {x.provider_state ?? '—'}</p><p>{t('data_signature_verified')}: {x.signature_verified ? t('data_yes') : t('data_no')} · {x.process_result ?? '—'} · {x.error_code ?? '—'}</p><p className="text-xs text-[var(--color-muted-foreground)]">{formatAdminDate(x.received_at, locale)} · {formatAdminDate(x.processed_at, locale)}</p></li>)}</ul> : <AdminEmpty>{t('data_no_provider_receipt_summaries')}</AdminEmpty>}
      <p className="mt-4 text-sm">{t('data_available_action_provider_re_check')}</p><Button className="mt-3" disabled={!online || working || !data.can_reconcile} loading={working} onClick={() => setConfirm(true)}>{t('data_re_check_with_provider')}</Button>
      {message && <div className="mt-3"><AdminFeedback kind="status">{message}</AdminFeedback></div>}{error !== undefined && <div className="mt-3"><AdminFeedback>{commonT(adminErrorKey(error))}</AdminFeedback></div>}
    </AdminCard>
    <AdminCard title={info('paymentGuideTitle')} className="text-sm">
      <p className="leading-6 text-[var(--color-muted-foreground)]">{info('paymentGuide')}</p>
      <p className="mt-3 leading-6 text-[var(--color-muted-foreground)]">{info('recheckEffect')}</p>
    </AdminCard></>}
    <ConfirmDialog open={confirm} title={t('data_re_check_provider_status')} description={t('data_this_requests_the_provider_state_a')} confirmLabel={t('data_continue')} cancelLabel={t('data_cancel')} onCancel={() => setConfirm(false)} onConfirm={() => void reconcile()} disabled={working || !online} />
  </AdminPage>;
}

export function AdminPackages() {
  const { locale, t } = useCopy(); const info = useTranslations('admin.information'); const online=useAdminOnline(); const [rows,setRows]=useState<AdminPackage[]>([]); const [cursor,setCursor]=useState<string|null>(null); const [more,setMore]=useState(false); const [error,setError]=useState<number>(); const [busy,setBusy]=useState(true); const [pendingSale,setPendingSale]=useState<{version:AdminPackageVersion; enabled:boolean}|null>(null); const [savingSale,setSavingSale]=useState(false);
  async function load(next?:string){setBusy(true);setError(undefined);try{const r=await getApiV1AdminPackages({limit:25,...(next?{cursor:next}:{})});if(r.status===200){setRows(r.data.data);setCursor(r.data.meta.next_cursor??null);setMore(r.data.meta.has_more)}else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
  // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
  useEffect(()=>{void load()},[]);
  async function toggleSale(){if(!pendingSale||!online)return;setSavingSale(true);setError(undefined);try{const r=await patchApiV1AdminPackageVersionsVersionIdSaleStatus(pendingSale.version.package_version_id,{sale_enabled:pendingSale.enabled},{headers:await adminCsrfHeaders()});if(r.status===200){setPendingSale(null);await load()}else setError(r.status)}catch{setError(0)}finally{setSavingSale(false)}}
  return <AdminPage title={t('data_package_catalog')}>{error!==undefined?<AdminError locale={locale} status={error} retry={()=>void load()}/>:<>
    {busy && <p role="status">{t('data_loading_catalog')}</p>}
    {!busy && rows.length === 0 ? <AdminEmpty>{t('data_no_packages')}</AdminEmpty> : <div className="grid gap-4 lg:grid-cols-2">
      {rows.map(pkg => {
        return <AdminCard key={pkg.package_id} title={pkg.name} className="flex h-full flex-col">
        <p className="break-all text-xs text-[var(--color-muted-foreground)]">{info('packageId')}: <span className="font-mono">{pkg.package_id}</span></p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <p className="max-w-sm text-xs leading-5 text-[var(--color-muted-foreground)]">{t('data_historical_versions_are_immutable')}</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]" href={`/admin/catalog/packages/${encodeURIComponent(pkg.package_id)}/versions/new`}>{t('data_create_new_version')}</Link>
        </div>
        <div className="mt-4 flex-1 space-y-3">{pkg.versions.length === 0 ? <AdminEmpty>{info('noVersions')}</AdminEmpty> : pkg.versions.map(v => <section key={v.package_version_id} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{info('version')}</h3><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${v.sale_enabled ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-[var(--color-border)] bg-[var(--color-muted)]'}`}>{v.sale_enabled ? info('saleEnabled') : info('saleDisabled')}</span></div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">{new Intl.NumberFormat(locale,{style:'currency',currency:v.currency}).format(v.price_amount)}</p>
          <p className="mt-1 text-sm">{info('photoQuota', { count: formatAdminNumber(v.quota_total, locale) })}</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--color-muted-foreground)]">{info('versionId')}: {v.package_version_id}</p>
          <div className="mt-3 flex justify-end"><Button className="min-h-9 px-3 py-1 text-xs" style={v.sale_enabled ? { backgroundColor: '#fff0ef', color: '#7d1a1a' } : undefined} variant="secondary" disabled={!online || savingSale} onClick={() => setPendingSale({version:v,enabled:!v.sale_enabled})} aria-label={info('saleActionForVersion', { action: v.sale_enabled ? t('data_retire') : t('data_enable'), versionId: v.package_version_id })}>{v.sale_enabled ? t('data_retire') : t('data_enable')}</Button></div>
        </section>)}</div>
      </AdminCard>})}
    </div>}
    <Link className="inline-flex min-h-11 items-center font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]" href="/admin/catalog/categories">{t('data_manage_event_categories')}</Link>
    <AdminPagination hasMore={more} cursor={cursor} busy={busy} locale={locale} onNext={()=>cursor&&void load(cursor)}/></>}<ConfirmDialog open={!!pendingSale} title={pendingSale?.enabled?(t('data_enable_sales')):(t('data_retire_this_version'))} description={t('data_this_only_changes_availability_for')} confirmLabel={t('data_confirm')} cancelLabel={t('data_cancel')} destructive={!pendingSale?.enabled} onCancel={()=>setPendingSale(null)} onConfirm={()=>void toggleSale()} disabled={savingSale||!online}/></AdminPage>;
}

export function AdminCategories(){
 const { locale, id, t, commonT } = useCopy();const online=useAdminOnline();const [rows,setRows]=useState<EventCategory[]>([]);const [busy,setBusy]=useState(true);const [working,setWorking]=useState(false);const [error,setError]=useState<number>();const [code,setCode]=useState('');const [labelId,setLabelId]=useState('');const [labelEn,setLabelEn]=useState('');const [order,setOrder]=useState('0');const [notice,setNotice]=useState('');
 async function load(){setBusy(true);setError(undefined);try{const r=await getApiV1AdminEventCategories({limit:100});if(r.status===200)setRows(r.data.data);else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
 useEffect(()=>{void load()},[]);
 async function create(e:React.FormEvent){e.preventDefault();if(!online||working)return;setWorking(true);setError(undefined);try{const r=await postApiV1AdminEventCategories({code:code.trim(),label_id:labelId.trim(),label_en:labelEn.trim(),display_order:Number(order),active:true},{headers:await adminCsrfHeaders()});if(r.status===201){setCode('');setLabelId('');setLabelEn('');setOrder('0');await load()}else setError(r.status)}catch{setError(0)}finally{setWorking(false)}}
 async function toggle(c:EventCategory){setWorking(true);setError(undefined);try{const r=await patchApiV1AdminEventCategoriesCategoryId(c.category_id,{active:!c.active},{headers:await adminCsrfHeaders()});if(r.status===200){setNotice(t('data_category_status_updated_its_identi'));await load()}else setError(r.status)}catch{setError(0)}finally{setWorking(false)}}
 return <AdminPage title={t('data_event_categories')} description={t('data_categories_can_be_deactivated_with')}><AdminOfflineNote online={online} locale={locale}/>{error!==undefined&&<AdminError locale={locale} status={error} retry={()=>void load()}/ >}{notice&&<AdminFeedback kind="status">{notice}</AdminFeedback>}<AdminCard title={t('data_add_category')}><form onSubmit={e=>void create(e)} className="grid gap-3 sm:grid-cols-2"><AdminField label={commonT('code')}><input className={adminInputClass} maxLength={50} required value={code} onChange={e=>setCode(e.target.value)}/></AdminField><AdminField label={t('data_indonesian_label')}><input className={adminInputClass} maxLength={100} required value={labelId} onChange={e=>setLabelId(e.target.value)}/></AdminField><AdminField label={t('data_english_label')}><input className={adminInputClass} maxLength={100} required value={labelEn} onChange={e=>setLabelEn(e.target.value)}/></AdminField><AdminField label={t('data_display_order')}><input type="number" className={adminInputClass} required value={order} onChange={e=>setOrder(e.target.value)}/></AdminField><Button className="sm:col-span-2 sm:justify-self-start" disabled={!online||working} loading={working}>{t('data_create_category')}</Button></form></AdminCard><AdminCard title={t('data_current_categories')}>{busy?<p role="status">{t('data_loading_short')}</p>:rows.length===0?<AdminEmpty>{t('data_no_categories')}</AdminEmpty>:<ul className="space-y-2">{rows.map(c=><li key={c.category_id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--color-border)] p-3"><div className="min-w-0"><b>{id?c.label_id:c.label_en}</b><p className="text-sm">{c.label_id} / {c.label_en}</p><p className="break-all font-mono text-xs">{c.code} · {c.category_id} · #{c.display_order}</p></div><div className="flex items-center gap-2"><AdminStatus value={c.active?'ACTIVE':'INACTIVE'}/><Button variant="secondary" disabled={!online||working} onClick={()=>void toggle(c)}>{c.active?(t('data_deactivate')):(t('data_activate'))}</Button></div></li>)}</ul>}</AdminCard></AdminPage>
}

export function AdminPackageVersionCreate({ packageId }: { packageId:string }) {
 const { locale, t, commonT } = useCopy(); const info = useTranslations('admin.information'); const online=useAdminOnline();
 const [price,setPrice]=useState(''); const [quota,setQuota]=useState(''); const priceInput=useRef<HTMLInputElement>(null);
 const intentRef=useRef<{fingerprint:string;key:string}|null>(null); const [busy,setBusy]=useState(false); const [confirm,setConfirm]=useState(false); const [error,setError]=useState<number>(); const [createdVersion,setCreatedVersion]=useState<AdminPackageVersion|null>(null);
 const amount=parseIdrPrice(price); const quotaAmount=Number(quota); const validQuota=/^\d+$/.test(quota)&&Number.isInteger(quotaAmount)&&quotaAmount>=1&&quotaAmount<=10000;
 const canReview=amount!==null&&validQuota;
 const currency=(value:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'IDR',maximumFractionDigits:2}).format(value);
 function changePrice(event:React.ChangeEvent<HTMLInputElement>){
  const input=event.target; const digitCount=(input.value.slice(0,input.selectionStart??input.value.length).match(/\d/g)??[]).length;
  const native=event.nativeEvent as InputEvent;const next=normalizeIdrPriceEdit(input.value,native.inputType,native.data??'');const formatted=formatIdrPriceInput(next,locale);
  if(next!==price)intentRef.current=null;
  setPrice(next);
  requestAnimationFrame(()=>{const current=priceInput.current;if(!current||document.activeElement!==current)return;let position=0;let seen=0;while(position<formatted.length&&seen<digitCount){if(/\d/.test(formatted[position]))seen++;position++}current.setSelectionRange(position,position)});
 }
 function intentKey(requestPayload:PackageVersionCreateRequest){const fingerprint=JSON.stringify([packageId,requestPayload.price_amount,requestPayload.currency,requestPayload.quota_total]);if(intentRef.current?.fingerprint!==fingerprint)intentRef.current={fingerprint,key:createUuidV7()};return intentRef.current.key}
 async function create(){if(!online||busy||amount===null||!validQuota)return;setBusy(true);setError(undefined);setCreatedVersion(null);const requestPayload={price_amount:amount,currency:'IDR',quota_total:quotaAmount} satisfies PackageVersionCreateRequest;try{const k=intentKey(requestPayload);const r=await postApiV1AdminPackagesPackageIdVersions(packageId,requestPayload,{headers:{...(await adminCsrfHeaders()),'Idempotency-Key':k}});if(r.status===201){intentRef.current=null;setCreatedVersion(r.data.data)}else{setError(r.status);if(r.status===422)intentRef.current=null}}catch{setError(0)}finally{setBusy(false);setConfirm(false)}}
 return <AdminPage title={t('data_create_package_version')} description={t('data_previous_versions_remain_unchanged')} wideDescription>
  <AdminOfflineNote online={online} locale={locale}/>
  <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start">
   <AdminCard title={info('versionFormTitle')}><form onSubmit={event=>{event.preventDefault();if(canReview&&online&&!busy)setConfirm(true)}} className="space-y-4">
    <AdminField label={t('data_price_idr')}><input ref={priceInput} type="text" inputMode="numeric" autoComplete="off" required className={adminInputClass} value={formatIdrPriceInput(price,locale)} onChange={changePrice} aria-invalid={price!==''&&amount===null} aria-describedby="version-price-hint" /></AdminField>
    <p id="version-price-hint" className="text-xs text-[var(--color-muted-foreground)]">{info('priceHint')}</p>
    {price!==''&&amount===null&&<AdminFeedback>{info('priceInvalid')}</AdminFeedback>}
    <AdminField label={t('data_total_quota')}><input type="number" min="1" max="10000" step="1" required className={adminInputClass} value={quota} onChange={e=>{if(e.target.value!==quota)intentRef.current=null;setQuota(e.target.value)}} aria-invalid={quota!==''&&!validQuota}/></AdminField>
    {quota!==''&&!validQuota&&<AdminFeedback>{info('quotaInvalid')}</AdminFeedback>}
    {canReview&&<div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm" aria-live="polite"><h3 className="font-semibold">{info('versionReviewTitle')}</h3><dl className="mt-2 grid grid-cols-2 gap-2"><div className="col-span-2"><dt>{info('selectedPackage')}</dt><dd className="break-all font-mono text-xs">{packageId}</dd></div><div><dt>{t('data_price_idr')}</dt><dd className="font-semibold">{currency(amount)}</dd></div><div><dt>{t('data_total_quota')}</dt><dd className="font-semibold">{formatAdminNumber(quotaAmount,locale)}</dd></div><div className="col-span-2"><dt>{info('pricePerPhoto')}</dt><dd className="font-semibold">{currency(amount/quotaAmount)}</dd></div></dl><p className="mt-3 text-amber-700 dark:text-amber-300">{info('combinationReviewWarning')}</p>{amount===0&&<p className="mt-2 text-amber-700 dark:text-amber-300">{info('zeroPriceWarning')}</p>}</div>}
    <Button type="submit" disabled={!online||busy||!canReview} loading={busy}>{info('reviewVersion')}</Button>
   </form>{createdVersion&&<div className="mt-4"><AdminFeedback kind="status">{t('data_new_version_created_by_the_server')} {info('createdVersionStatus',{versionId:createdVersion.package_version_id,sale:createdVersion.sale_enabled?info('saleEnabled'):info('saleDisabled'),effective:formatAdminDate(createdVersion.effective_at,locale)})}</AdminFeedback></div>}{error!==undefined&&<div className="mt-4"><AdminFeedback>{error===409?t('data_version_conflict_reload_the_catalo'):`${commonT(adminErrorKey(error))} ${t('data_the_request_was_not_treated_as_suc')}`}</AdminFeedback></div>}</AdminCard>
   <AdminCard title={info('versionGuideTitle')}><div className="space-y-3 text-sm leading-6 text-[var(--color-muted-foreground)]"><p>{info('versionGuideImmutable')}</p><p>{info('versionGuideSale')}</p><p>{info('versionGuideEffect')}</p></div></AdminCard>
  </div>
  <AdminAboutCard title={info('versionGuideTitle')}>{info('versionAbout')}</AdminAboutCard>
  <ConfirmDialog open={confirm} title={info('confirmVersionTitle')} description={canReview?info('confirmVersionDescription',{packageId,price:currency(amount),quota:formatAdminNumber(quotaAmount,locale),perPhoto:currency(amount/quotaAmount)}):''} confirmLabel={t('data_create_immutable_version')} cancelLabel={t('data_cancel')} disabled={busy||!online||!canReview} onCancel={()=>setConfirm(false)} onConfirm={()=>void create()}/>
 </AdminPage>
}

function typedConfigDraft(config: OperationalConfig, draft: string): string | number | boolean | undefined {
  let value: string | number | boolean;
  if (config.value_type === 'BOOLEAN') {
    if (draft !== 'true' && draft !== 'false') return undefined;
    value = draft === 'true';
  } else if (config.value_type === 'INTEGER' || config.value_type === 'NUMBER') {
    if (!draft.trim()) return undefined;
    const number = Number(draft);
    if (!Number.isFinite(number) || (config.value_type === 'INTEGER' && !Number.isInteger(number))) return undefined;
    if ((config.minimum !== null && number < config.minimum) || (config.maximum !== null && number > config.maximum)) return undefined;
    value = number;
  } else if (config.value_type === 'STRING') value = draft;
  else return undefined;
  if (config.allowed_values?.length && !config.allowed_values.some(allowed => allowed === value)) return undefined;
  return value;
}

export function AdminConfigs() {
 const { locale, t } = useCopy();const info=useTranslations('admin.information');const online=useAdminOnline();const [rows,setRows]=useState<OperationalConfig[]>([]);const [values,setValues]=useState<Record<string,string>>({});const [busy,setBusy]=useState(true);const [working,setWorking]=useState('');const [error,setError]=useState<number>();const [notice,setNotice]=useState('');
 async function load(){setBusy(true);setError(undefined);try{const r=await getApiV1AdminOperationalConfigs({limit:100});if(r.status===200){setRows(r.data.data);setValues(Object.fromEntries(r.data.data.map(c=>[c.config_key,typeof c.typed_value==='string'?c.typed_value:JSON.stringify(c.typed_value)])))}else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
 useEffect(()=>{void load()},[]);
 async function save(c:OperationalConfig){if(!online||working||!c.editable)return;const typed=typedConfigDraft(c,values[c.config_key]??'');if(typed===undefined)return;setWorking(c.config_key);setError(undefined);setNotice('');try{const r=await patchApiV1AdminOperationalConfigsKey(c.config_key,{expected_version:c.version,typed_value:typed},{headers:await adminCsrfHeaders()});if(r.status===200){setNotice(t('data_configuration_updated_from_the_ser'));await load()}else if(r.status===409){setError(409);setNotice(t('data_the_value_changed_current_configur'));await load()}else setError(r.status)}catch{setError(0)}finally{setWorking('')}}
 return <AdminPage title={t('data_operational_configuration')} description={t('data_only_typed_values_allowlisted_by_t')} wideDescription><AdminOfflineNote online={online} locale={locale}/>{notice&&<AdminFeedback kind="status">{notice}</AdminFeedback>}{error!==undefined&&<AdminError locale={locale} status={error} retry={()=>void load()}/ >}{busy?<p role="status">{t('data_loading_configuration')}</p>:rows.length===0?<AdminEmpty>{t('data_no_configuration_entries_are_avail')}</AdminEmpty>:rows.map(c=>{
   const draft=values[c.config_key]??'';
   const supportedChoices=c.allowed_values?.filter(value=>typeof value==='string'||typeof value==='number'||typeof value==='boolean');
   const choicesSupported=['BOOLEAN','INTEGER','NUMBER','STRING'].includes(c.value_type)&&(!c.allowed_values?.length||c.allowed_values.every(value=>c.value_type==='BOOLEAN'?typeof value==='boolean':c.value_type==='INTEGER'?typeof value==='number'&&Number.isInteger(value):c.value_type==='NUMBER'?typeof value==='number'&&Number.isFinite(value):typeof value==='string'));
   const booleanChoices=c.allowed_values?.length?c.allowed_values.filter((value):value is boolean=>typeof value==='boolean'):[true,false];
   const valid=choicesSupported&&typedConfigDraft(c,draft)!==undefined;
   const update=(value:string)=>setValues(current=>({...current,[c.config_key]:value}));
   return <AdminCard key={c.config_key} title={c.display_name}>
     <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{c.description}</p>
     <div className="mt-4 grid items-stretch gap-5 md:grid-cols-2">
       <details className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)]"><summary className="cursor-pointer font-semibold text-[var(--color-foreground)]">{info('technicalDetails')}</summary><dl className="mt-3 space-y-1"><div><dt className="inline">{t('data_key')}: </dt><dd className="inline break-all font-mono">{c.config_key}</dd></div><div><dt className="inline">{info('configType')}: </dt><dd className="inline font-mono">{c.value_type}</dd></div><div><dt className="inline">{info('configVersion')}: </dt><dd className="inline">{c.version} · {formatAdminDate(c.updated_at,locale)}</dd></div></dl></details>
       {!c.editable?<p className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{info('configLocked')}</p>:!choicesSupported?<AdminFeedback>{info('configUnsupported')}</AdminFeedback>:<div className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
         {c.value_type==='BOOLEAN'||!!c.allowed_values?.length?<><span className="text-sm font-semibold">{info('configValueLabel')}</span><Select label={info('configValueLabel')} value={draft} onValueChange={update} options={c.value_type==='BOOLEAN'?booleanChoices.map(value=>({value:String(value),label:value?info('configYes'):info('configNo')})):(supportedChoices??[]).map(value=>({value:String(value),label:String(value)}))} /></>:<AdminField label={info('configValueLabel')}><input type={c.value_type==='STRING'?'text':'number'} min={c.minimum??undefined} max={c.maximum??undefined} step={c.value_type==='INTEGER'?'1':'any'} className={adminInputClass} value={draft} onChange={event=>update(event.target.value)} aria-invalid={!valid}/></AdminField>}
         <Button className="mt-auto self-start" variant="secondary" disabled={!online||!!working||!valid} loading={working===c.config_key} onClick={()=>void save(c)}>{t('data_save_this_version')}</Button>
       </div>}
     </div>
   </AdminCard>})}<AdminAboutCard title={info('configGuideTitle')}>{info('configGuide')}</AdminAboutCard></AdminPage>
}

function safeIssueSummary(summary: string, fallback: string) {
  const value = summary.trim();
  return value && value.length <= 240 && !/[\r\n<>\{\}]|https?:\/\/|traceback|exception:|bearer\s|\b(?:token|secret|password|authorization|api[_-]?key|credential|stack)\b|[A-Za-z]:\\|\/(?:app|var|srv|home)\/|\bat\s+\S+\s+\([^)]*:\d+:\d+\)/i.test(value) ? value : fallback;
}

function IssueStatus({ value }: { value: OperationalIssue['status'] }) {
  const info = useTranslations('admin.information');
  const label = value === 'OPEN' ? info('issueStatusOpen') : value === 'ACKNOWLEDGED' ? info('issueStatusAcknowledged') : value === 'RESOLVED' ? info('issueStatusResolved') : info('issueUnknownStatus');
  const tone = value === 'OPEN' ? 'border-amber-500/40 bg-amber-500/10' : value === 'RESOLVED' ? 'border-emerald-600/30 bg-emerald-600/10' : 'border-[var(--color-border)] bg-[var(--color-muted)]';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function IssueSeverity({ value }: { value: string }) {
  const info = useTranslations('admin.information');
  return <>{value === 'LOW' ? info('issueSeverityLow') : value === 'MEDIUM' ? info('issueSeverityMedium') : value === 'HIGH' ? info('issueSeverityHigh') : value === 'CRITICAL' ? info('issueSeverityCritical') : info('issueSeverityUnknown')}</>;
}

function IssueType({ value }: { value: string }) {
  const info = useTranslations('admin.information');
  return <>{value === 'PHOTO_PROCESSING' ? info('issueTypePhotoProcessing') : info('issueTypeOther')}</>;
}

function safeIssueCode(value: string | null) {
  return value && /^[A-Z][A-Z0-9_]{0,79}$/.test(value) ? value : '—';
}

export function AdminIssues(){
 const { locale, t, commonT } = useCopy();const info=useTranslations('admin.information');const online=useAdminOnline();const [rows,setRows]=useState<OperationalIssue[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [more,setMore]=useState(false);const [draftStatus,setDraftStatus]=useState('');const [appliedStatus,setAppliedStatus]=useState('');const [busy,setBusy]=useState(true);const [error,setError]=useState<number>();const requestSequence=useRef(0);const lastRequest=useRef<{next?:string;status:string}>({status:''});
 async function load(next?:string,s=appliedStatus){const sequence=++requestSequence.current;lastRequest.current={next,status:s};setBusy(true);setError(undefined);try{const r=await getApiV1AdminIssues({limit:25,...(next?{cursor:next}:{}),...(s?{status:s as OperationalIssue['status']}:{})});if(sequence!==requestSequence.current)return;if(r.status===200){setRows(r.data.data);setCursor(r.data.meta.next_cursor??null);setMore(r.data.meta.has_more)}else setError(r.status)}catch{if(sequence===requestSequence.current)setError(0)}finally{if(sequence===requestSequence.current)setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- start the initial server read after mount
 useEffect(()=>{void load()},[]);
 function apply(){if(!online)return;setAppliedStatus(draftStatus);setRows([]);setCursor(null);setMore(false);void load(undefined,draftStatus)}
 return <AdminPage title={t('data_operational_issues')} description={t('data_safe_summaries_for_triage_no_stack')}>
  <AdminCard><div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-64"><span className="mb-1.5 block text-sm font-semibold">{commonT('status')}</span><Select label={commonT('status')} value={draftStatus} onValueChange={setDraftStatus} options={[{value:'',label:t('data_all')},{value:'OPEN',label:info('issueStatusOpen')},{value:'ACKNOWLEDGED',label:info('issueStatusAcknowledged')},{value:'RESOLVED',label:info('issueStatusResolved')}]} /></div><Button variant="secondary" disabled={!online} onClick={apply}>{t('data_apply')}</Button></div></AdminCard>
  {error!==undefined?<AdminError locale={locale} status={error} retry={()=>void load(lastRequest.current.next,lastRequest.current.status)}/>:<AdminCard title={t('data_results')}>{busy&&<p role="status">{t('data_loading_issues')}</p>}{!busy&&rows.length===0?<AdminEmpty>{t('data_no_issues')}</AdminEmpty>:<div className="space-y-2">{rows.map(i=><Link key={i.issue_id} href={`/admin/issues/${encodeURIComponent(i.issue_id)}`} className="block rounded border border-[var(--color-border)] p-3 hover:bg-[var(--color-muted)]"><div className="flex flex-wrap justify-between gap-2"><b>{safeIssueSummary(i.summary,info('issueFallbackSummary'))}</b><IssueStatus value={i.status}/></div><p className="mt-1 text-xs text-[var(--color-muted-foreground)]"><IssueSeverity value={i.severity} /> · <IssueType value={i.issue_type} /></p></Link>)}</div>}<AdminPagination hasMore={more} cursor={cursor} busy={busy||!online} locale={locale} onNext={()=>cursor&&void load(cursor,appliedStatus)}/></AdminCard>}
  <AdminAboutCard title={info('issueGuideTitle')}>{info('issueGuide')}</AdminAboutCard>
 </AdminPage>
}

export function AdminIssueDetail({issueId}:{issueId:string}){
 const { locale, t, commonT } = useCopy();const info=useTranslations('admin.information');const online=useAdminOnline();const [issue,setIssue]=useState<OperationalIssue|null>(null);const [busy,setBusy]=useState(true);const [working,setWorking]=useState(false);const [error,setError]=useState<number>();const [reason,setReason]=useState('');const [confirm,setConfirm]=useState(false);const [action,setAction]=useState<'ack'|'resolve'>('ack');
 async function load(){setBusy(true);setError(undefined);try{const r=await getApiV1AdminIssuesIssueId(issueId);if(r.status===200)setIssue(r.data.data);else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reload when the route issue changes
 useEffect(()=>{void load()},[issueId]);
 async function mutate(){setWorking(true);setError(undefined);try{const h={headers:await adminCsrfHeaders()};const r=action==='ack'?await postApiV1AdminIssuesIssueIdAcknowledge(issueId,h):await postApiV1AdminIssuesIssueIdResolve(issueId,{reason:reason.trim()},h);if(r.status===200){setIssue(r.data.data);setReason('')}else setError(r.status)}catch{setError(0)}finally{setWorking(false);setConfirm(false)}}
 const labelClass='text-xs text-[var(--color-muted-foreground)]';
 return <AdminPage title={t('data_issue_detail')} description={t('data_state_changes_always_come_from_the')}>
  {error!==undefined&&<AdminError locale={locale} status={error} retry={()=>void load()}/ >}
  {busy?<p role="status">{t('data_loading_short')}</p>:!issue?<AdminEmpty>{t('data_not_found')}</AdminEmpty>:<>
   <AdminCard title={safeIssueSummary(issue.summary,info('issueFallbackSummary'))}><dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className={labelClass}>{commonT('status')}</dt><dd className="mt-1"><IssueStatus value={issue.status}/></dd></div><div><dt className={labelClass}>{t('data_severity')}</dt><dd className="mt-1 font-semibold"><IssueSeverity value={issue.severity}/></dd></div><div><dt className={labelClass}>{t('data_type')}</dt><dd className="mt-1 break-words"><IssueType value={issue.issue_type}/></dd></div><div><dt className={labelClass}>{t('data_created')}</dt><dd className="mt-1">{formatAdminDate(issue.created_at,locale)}</dd></div></dl><details className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted-foreground)]"><summary className="cursor-pointer font-semibold text-[var(--color-foreground)]">{info('technicalDetails')}</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt>{info('issueTypeIdentifier')}</dt><dd className="break-all font-mono">{safeIssueCode(issue.issue_type)}</dd></div><div><dt>{t('data_error_code')}</dt><dd className="break-all font-mono">{safeIssueCode(issue.error_code)}</dd></div><div><dt>ID</dt><dd className="break-all font-mono">{issue.issue_id}</dd></div><div><dt>{t('data_related_entity')}</dt><dd className="break-all font-mono">{issue.related_entity_type??'—'} · {issue.related_entity_id??'—'}</dd></div></dl></details></AdminCard>
   <AdminCard><div className="grid items-start gap-6 md:grid-cols-2"><section className="min-w-0"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{t('data_triage_actions')}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{info('issueAckGuide')}</p><Button className="mt-4 min-w-36" variant="secondary" disabled={!online||working||issue.status!=='OPEN'} onClick={()=>{setAction('ack');setConfirm(true)}}>{t('data_acknowledge')}</Button></section><section className="min-w-0"><label htmlFor="issue-resolution-reason" className="block font-[family-name:var(--font-display)] text-lg font-bold">{t('data_resolution_reason')}</label><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{info('issueResolveGuide')}</p><input id="issue-resolution-reason" className={`${adminInputClass} mt-4`} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/><Button className="mt-4 min-w-36" disabled={!online||working||(issue.status!=='OPEN'&&issue.status!=='ACKNOWLEDGED')||!reason.trim()} onClick={()=>{setAction('resolve');setConfirm(true)}}>{t('data_resolve')}</Button></section></div></AdminCard>
   <AdminAboutCard title={info('issueDetailGuideTitle')}><p>{info('issueAckGuide')}</p><p className="mt-2">{info('issueResolveGuide')}</p></AdminAboutCard>
  </>}
  <ConfirmDialog open={confirm} title={action==='ack'?t('data_acknowledge_issue'):t('data_resolve_issue')} description={action==='ack'?info('issueAckConfirm'):info('issueResolveConfirm',{reason:reason.trim()})} confirmLabel={t('data_confirm')} cancelLabel={t('data_cancel')} onCancel={()=>setConfirm(false)} onConfirm={()=>void mutate()} disabled={working||!online}/>
 </AdminPage>
}

export function AdminAudit(){
 const { locale, t } = useCopy();const [rows,setRows]=useState<AdminAuditLogSummary[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [more,setMore]=useState(false);const [busy,setBusy]=useState(true);const [error,setError]=useState<number>();
 async function load(next?:string){setBusy(true);setError(undefined);try{const r=await getApiV1AdminAuditLogs({limit:50,...(next?{cursor:next}:{})});if(r.status===200){setRows(r.data.data);setCursor(r.data.meta.next_cursor??null);setMore(r.data.meta.has_more)}else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
 useEffect(()=>{void load()},[]);
 return <AdminPage title={t('data_audit_log')} description={t('data_append_only_read_only_records_sens')}>{error!==undefined?<AdminError locale={locale} status={error} retry={()=>void load()}/>:<AdminCard>{busy&&<p role="status">{t('data_loading_short')}</p>}{!busy&&!rows.length?<AdminEmpty>{t('data_no_audit_records')}</AdminEmpty>:<div className="space-y-2">{rows.map(a=><Link key={a.audit_id} href={`/admin/audit/${encodeURIComponent(a.audit_id)}`} className="block min-w-0 rounded border border-[var(--color-border)] p-3 text-sm hover:bg-[var(--color-muted)]"><div className="flex flex-wrap justify-between gap-2"><b>{a.action} · {a.object_type}</b><AdminStatus value={a.result}/></div><p className="mt-1 break-words">{a.safe_change_summary}</p><p className="mt-2 break-all font-mono text-xs">{a.audit_id} · {a.actor_type}:{a.actor_id??'—'} · {a.object_ref??'—'}</p><p className="text-xs text-[var(--color-muted-foreground)]">{formatAdminDate(a.created_at,locale)} · {t('data_request')} {a.request_id??'—'}</p></Link>)}</div>}<AdminPagination hasMore={more} cursor={cursor} busy={busy} locale={locale} onNext={()=>cursor&&void load(cursor)}/></AdminCard>}</AdminPage>
}

export function AdminAuditDetail({auditId}:{auditId:string}){
 const { locale, t, commonT } = useCopy();const [entry,setEntry]=useState<AdminAuditLogSummary|null>(null);const [busy,setBusy]=useState(true);const [error,setError]=useState<number>();
 async function load(){setBusy(true);setError(undefined);try{const r=await getApiV1AdminAuditLogsAuditId(auditId);if(r.status===200)setEntry(r.data.data.summary);else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reload when the audit route changes
 useEffect(()=>{void load()},[auditId]);
 return <AdminPage title={t('data_audit_detail')} description={t('data_this_detail_is_read_only_and_displ')}>{error!==undefined?<AdminError locale={locale} status={error} retry={()=>void load()}/>:busy?<p role="status">{t('data_loading_record')}</p>:!entry?<AdminEmpty>{t('data_record_not_found')}</AdminEmpty>:<AdminCard title={`${entry.action} · ${entry.object_type}`}><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt>ID</dt><dd className="break-all font-mono">{entry.audit_id}</dd></div><div><dt>{t('data_result')}</dt><dd><AdminStatus value={entry.result}/></dd></div><div><dt>{t('data_actor')}</dt><dd>{entry.actor_type} · {entry.actor_id??'—'}</dd></div><div><dt>{commonT('album')}</dt><dd className="break-all font-mono">{entry.album_id??'—'}</dd></div><div><dt>{t('data_object')}</dt><dd>{entry.object_type} · {entry.object_ref??'—'}</dd></div><div><dt>{t('data_time')}</dt><dd>{formatAdminDate(entry.created_at,locale)}</dd></div><div><dt>{commonT('requestId')}</dt><dd className="break-all font-mono">{entry.request_id??'—'}</dd></div><div className="sm:col-span-2"><dt>{t('data_change_summary')}</dt><dd className="break-words">{entry.safe_change_summary}</dd></div></dl></AdminCard>}</AdminPage>
}

export function AdminRoster(){
 const { locale, t } = useCopy();const info=useTranslations('admin.information');const [rows,setRows]=useState<AdminRosterEntry[]>([]);const [cursor,setCursor]=useState<string|null>(null);const [more,setMore]=useState(false);const [busy,setBusy]=useState(true);const [error,setError]=useState<number>();
 async function load(next?:string){setBusy(true);setError(undefined);try{const r=await getApiV1AdminAdmins({limit:25,...(next?{cursor:next}:{})});if(r.status===200){setRows(r.data.data);setCursor(r.data.meta.next_cursor??null);setMore(r.data.meta.has_more)}else setError(r.status)}catch{setError(0)}finally{setBusy(false)}}
 // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial server read after mount
 useEffect(()=>{void load()},[]);
 return <AdminPage title={t('data_admin_roster')} description={t('data_this_roster_is_read_only_provision')}>{error!==undefined?<AdminError locale={locale} status={error} retry={()=>void load()}/>:<AdminCard>{busy&&<p role="status">{t('data_loading_short')}</p>}{!busy&&!rows.length?<AdminEmpty>{t('data_no_entries')}</AdminEmpty>:<ul className="space-y-3">{rows.map(a=><li key={a.admin_user_id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-[var(--color-border)] p-3"><div className="min-w-0"><b className="block break-all">{a.display_name??a.email}</b><p className="break-all text-sm">{a.email}</p><code className="break-all text-xs">{a.admin_user_id}</code><p className="text-xs text-[var(--color-muted-foreground)]">{t('data_granted')} {formatAdminDate(a.granted_at,locale)} · {t('data_last_session')} {formatAdminDate(a.last_session_at,locale)}</p></div><AdminStatus value={a.grant_status}/></li>)}</ul>}<AdminPagination hasMore={more} cursor={cursor} busy={busy} locale={locale} onNext={()=>cursor&&void load(cursor)}/></AdminCard>}<AdminAboutCard title={info('rosterGuideTitle')}>{info('rosterGuide')}</AdminAboutCard></AdminPage>
}
