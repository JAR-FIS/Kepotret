import Link from 'next/link';
import { ArrowDown, Camera, Check, CircleUserRound, Download, Image as ImageIcon, LockKeyhole, QrCode, ShieldCheck, UsersRound, Clock3, Building2 } from 'lucide-react';
import Image from 'next/image';

import { Disclosure } from '@/components/ui/disclosure';
import { getContent, type Locale } from '@/features/marketing/content';
import { PricingSelector } from '@/features/marketing/components/pricing-selector';
import { PublicPageFrame } from '@/features/marketing/components/public-page-frame';

export function H01Page({ locale }: { locale: Locale }) {
  const copy = getContent(locale);
  return <PublicPageFrame locale={locale} assistant>
    <main>
      <Hero locale={locale} copy={copy} />
      <HowSection copy={copy} />
      <BenefitsSection copy={copy} />
      <DifferentiationSection copy={copy} />
      <UseCasesSection locale={locale} copy={copy} />
      <GuestSection copy={copy} />
      <PricingSection locale={locale} copy={copy} />
      <TrustSection copy={copy} />
      <FaqSection copy={copy} />
      <FinalCta copy={copy} />
    </main>
  </PublicPageFrame>;
}

type Copy = ReturnType<typeof getContent>;

type MarketingImage = {
  src: string;
  alt: { id: string; en: string };
  objectPosition?: string;
};

const eventImage = (filename: string, idAlt: string, enAlt: string, objectPosition?: string): MarketingImage => ({
  src: `/media/marketing/events/${filename}`,
  alt: { id: idAlt, en: enAlt },
  objectPosition,
});

const heroPhotos = [
  {
    ...eventImage('event-02.jpg', 'Peserta acara berfoto bersama setelah kegiatan', 'Event attendees take a group photo after a gathering'),
    frameClass: 'left-[0%] top-[9%] z-0 w-[54%] aspect-[4/3] -rotate-2',
    sizes: '(max-width: 639px) 52vw, (max-width: 1023px) min(54vw, 335px), 330px',
    preload: true,
  },
  {
    ...eventImage('event-01.jpg', 'Peserta menari dalam perayaan bersama', 'Attendees dance during a community celebration'),
    frameClass: 'right-[1%] top-[3%] z-0 hidden w-[29%] aspect-[3/4] rotate-2 sm:block',
    sizes: '180px',
    preload: false,
  },
  {
    ...eventImage('sport-01.jpg', 'Pesepeda mengikuti kegiatan bersepeda bersama', 'Cyclists take part in a group ride'),
    frameClass: 'bottom-[6%] left-[4%] z-0 w-[38%] aspect-[4/3] rotate-1',
    sizes: '(max-width: 639px) 40vw, (max-width: 1023px) 24vw, 235px',
    preload: false,
  },
  {
    ...eventImage('komunitas-02.jpg', 'Anggota komunitas berfoto bersama di dalam ruangan', 'Community members pose together indoors'),
    frameClass: 'bottom-[10%] right-[1%] z-0 hidden w-[43%] aspect-[4/3] -rotate-1 sm:block',
    sizes: '(max-width: 1023px) 26vw, 265px',
    preload: false,
  },
];

const useCasePhotos: MarketingImage[] = [
  eventImage('wedding-01.jpg', 'Pasangan dan keluarga merayakan pernikahan di luar ruangan', 'A couple and family celebrate a wedding outdoors'),
  eventImage('birthday-01.jpg', 'Seorang tamu merayakan ulang tahun bersama teman-teman', 'A guest celebrates a birthday with friends', '50% 24%'),
  eventImage('komunitas-02.jpg', 'Anggota komunitas berfoto bersama di dalam ruangan', 'Community members pose together indoors'),
  eventImage('sport-01.jpg', 'Pesepeda mengikuti kegiatan bersepeda bersama', 'Cyclists take part in a group ride'),
  eventImage('corporate-gathering-02.jpg', 'Peserta menyimak acara organisasi di ruang pertemuan', 'Attendees listen during an organization gathering'),
  eventImage('travel-01.jpg', 'Pelancong menjelajahi jalur pegunungan', 'A traveler explores a mountain trail', '50% 35%'),
];

function Hero({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.94fr_1.06fr] lg:gap-8 lg:py-20">
    <div className="relative z-10">
      <p className="mb-5 inline-flex rounded-full border border-[var(--color-border)] px-3 py-2 text-[11px] font-bold tracking-[0.08em]">{copy.hero.eyebrow}</p>
      <h1 className="max-w-2xl font-[var(--font-display)] text-[clamp(2.65rem,7vw,5rem)] font-bold leading-[0.98] tracking-[-0.055em]">{copy.hero.title.split('. ').map((part, index) => <span key={part}>{part}{index === 0 && <><span>.</span><br /></>}</span>)}<span aria-hidden="true" className="ml-1 inline-block h-3 w-3 rounded-full bg-[var(--color-primary)] align-baseline" /></h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted-foreground)] sm:text-lg sm:leading-8">{copy.hero.description}</p>
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        {copy.hero.proof.map((item) => <li key={item} className="flex items-center gap-2"><Check size={16} aria-hidden="true" className="shrink-0" />{item}</li>)}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link href="/masuk" className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-5 font-bold text-[var(--color-primary-foreground)] hover:brightness-95">{copy.nav.createAlbum}<span className="ml-2" aria-hidden="true">→</span></Link>
        <Link href="#cara-kerja" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-5 font-semibold hover:bg-[var(--color-muted)]">{copy.hero.secondary}<ArrowDown size={17} aria-hidden="true" /></Link>
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{copy.hero.microcopy}</p>
    </div>
    <HeroVisual locale={locale} copy={copy} />
  </section>;
}

function HeroVisual({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <div className="hero-visual relative mx-auto aspect-[0.58/1] w-full max-w-[620px] sm:aspect-[1.16/1]">
    {heroPhotos.map((photo) => <div key={photo.src} className={`absolute overflow-hidden rounded-[18px] border-4 border-white bg-[var(--color-surface-muted)] shadow-[0_8px_24px_rgb(10_10_10_/_12%)] sm:rounded-[22px] ${photo.frameClass}`}>
      <Image src={photo.src} alt={photo.alt[locale]} fill sizes={photo.sizes} className="object-cover" style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined} preload={photo.preload ?? false} />
    </div>)}
    <div className="absolute left-[27%] top-[4%] z-10 w-[58%] origin-top scale-[0.8] rounded-[30px] border-[7px] border-[#0a0a0a] bg-white p-3 shadow-[0_20px_42px_rgb(10_10_10_/_20%)] sm:left-[31%] sm:top-[15%] sm:w-[43%] sm:scale-100">
      <div className="rounded-[20px] border border-[#d9d9d9] bg-[#f7f7f5] p-4 text-[#0a0a0a] sm:p-5">
        <div className="flex items-center justify-between text-xs font-semibold"><Image src="/brand/icon.svg" alt="" width={18} height={18} /><CircleUserRound size={17} aria-hidden="true" /></div>
        <div className="mt-6 rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-bold">{copy.hero.visualLabel}</p>
          <div className="mx-auto my-4 flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-[#6b6b6b] bg-[#f2f2f2]"><QrCode size={48} aria-hidden="true" /></div>
          <p className="text-xs text-[#6b6b6b]">{copy.hero.visualHint}</p>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#d8ff3d] py-3 text-sm font-bold"><Camera size={17} aria-hidden="true" />{copy.guest.steps[3].title}</div>
      </div>
      <span aria-hidden="true" className="absolute -right-2 top-[18%] h-5 w-5 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-background)]" />
    </div>
    <div className="absolute -bottom-1 left-[3%] z-20 hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs font-semibold shadow-[var(--shadow-soft)] sm:block"><span className="block text-[var(--color-muted-foreground)]">QR</span><span>{copy.how.steps[1].title}</span></div>
    <div className="absolute right-0 bottom-[10%] z-20 hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs font-semibold shadow-[var(--shadow-soft)] sm:block"><span className="block text-[var(--color-muted-foreground)]">{copy.hero.microcopy}</span><span>{copy.hero.proof[0]}</span></div>
  </div>;
}

function HowSection({ copy }: { copy: Copy }) {
  return <section id="cara-kerja" className="scroll-mt-20 bg-[#0a0a0a] text-white">
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20">
      <SectionIntro eyebrow={copy.how.eyebrow} title={copy.how.title} description={copy.how.description} />
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {copy.how.steps.map((step, index) => <li key={step.title} className="relative border-t border-white/20 pt-5 md:pt-6">
          <span className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[#0a0a0a]">0{index + 1}</span>
          <h3 className="font-[var(--font-display)] text-2xl font-bold">{step.title}</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/75">{step.description}</p>
          {index < 2 && <ArrowDown aria-hidden="true" size={19} className="absolute right-2 top-7 hidden rotate-[-90deg] text-[var(--color-primary)] md:block" />}
        </li>)}
      </ol>
      <Link href="/cara-kerja" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--color-primary)] px-4 font-semibold text-[#0a0a0a]">{copy.how.cta}<span aria-hidden="true">→</span></Link>
    </div>
  </section>;
}

function BenefitsSection({ copy }: { copy: Copy }) {
  const icons = [Camera, ImageIcon, UsersRound, LockKeyhole, Building2];
  return <section className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20">
    <SectionIntro eyebrow={copy.benefits.eyebrow} title={copy.benefits.title} description={copy.benefits.description} />
    <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative flex min-h-64 items-end overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#e8ebdf,#f6f5ee_54%,#cbd7cb)] p-6 sm:min-h-80 sm:p-8">
        <div className="absolute right-[12%] top-[12%] h-28 w-24 rotate-[-8deg] rounded-[16px] border border-white bg-white/70 shadow-[var(--shadow-soft)]" aria-hidden="true" />
        <div className="absolute right-[25%] top-[21%] h-32 w-24 rotate-[6deg] rounded-[16px] border border-white bg-white/70 shadow-[var(--shadow-soft)]" aria-hidden="true" />
        <div className="relative max-w-sm rounded-2xl bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <Camera aria-hidden="true" size={22} />
          <h3 className="mt-3 font-[var(--font-display)] text-xl font-bold">{copy.benefits.items[0].title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.benefits.items[0].description}</p>
        </div>
      </div>
      <ul className="grid content-center gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {copy.benefits.items.slice(1).map((item, index) => { const Icon = icons[index + 1]!; return <li key={item.title} className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)]"><Icon size={19} aria-hidden="true" /></span><div><h3 className="font-[var(--font-display)] text-lg font-bold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p></div></li>; })}
      </ul>
    </div>
  </section>;
}

function DifferentiationSection({ copy }: { copy: Copy }) {
  const icons = [Download, ShieldCheck, UsersRound, ImageIcon];
  return <section className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-6 sm:pb-20">
    <div className="rounded-[24px] bg-[linear-gradient(110deg,#e7ffa3,#d8ff3d_56%,#e8ffad)] p-6 text-[#0a0a0a] sm:p-10 lg:p-12">
      <div className="grid gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div><SectionIntro eyebrow={copy.differentiation.eyebrow} title={copy.differentiation.title} description={copy.differentiation.description} dark /></div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {copy.differentiation.items.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70"><Icon size={19} aria-hidden="true" /></span><div><h3 className="font-[var(--font-display)] font-bold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#282828]">{item.description}</p></div></li>; })}
        </ul>
      </div>
    </div>
  </section>;
}

function UseCasesSection({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <section className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20">
    <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end"><SectionIntro eyebrow={copy.useCases.eyebrow} title={copy.useCases.title} /><p className="max-w-lg text-sm leading-6 text-[var(--color-muted-foreground)] md:justify-self-end">{copy.useCases.description}</p></div>
    <ul className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {copy.useCases.items.map((item, index) => { const photo = useCasePhotos[index]!; return <li key={item.title} className="overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-muted)]">
          <Image src={photo.src} alt={photo.alt[locale]} fill sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2rem), (max-width: 1279px) calc(33vw - 2rem), 380px" className="object-cover" style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined} />
        </div>
        <div className="p-4"><h3 className="font-[var(--font-display)] font-bold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">{item.description}</p></div>
      </li>; })}
    </ul>
  </section>;
}

function GuestSection({ copy }: { copy: Copy }) {
  const icons = [QrCode, CircleUserRound, Camera, ImageIcon];
  return <section className="bg-[#0a0a0a] text-white">
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20">
      <SectionIntro eyebrow={copy.guest.eyebrow} title={copy.guest.title} description={copy.guest.description} dark />
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {copy.guest.steps.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="rounded-[16px] border border-white/15 p-4 sm:p-5">
          <div className="flex items-center justify-between"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[#0a0a0a]">0{index + 1}</span><Icon size={22} className="text-[var(--color-primary)]" aria-hidden="true" /></div>
          <h3 className="mt-5 font-[var(--font-display)] text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-white/70">{item.description}</p>
        </li>; })}
      </ol>
      <div className="mt-6 flex flex-wrap gap-2">{copy.guest.badges.map((badge) => <span key={badge} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-3 text-sm"><Check size={15} aria-hidden="true" className="text-[var(--color-primary)]" />{badge}</span>)}</div>
      <Link href="/cara-kerja" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--color-primary)] px-4 font-semibold text-[#0a0a0a]">{copy.guest.cta}<span aria-hidden="true">→</span></Link>
    </div>
  </section>;
}

function PricingSection({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <section id="harga" className="scroll-mt-20 mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-20">
    <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
      <SectionIntro eyebrow={copy.pricing.eyebrow} title={copy.pricing.title} description={copy.pricing.description} />
      <PricingSelector locale={locale} />
    </div>
  </section>;
}

function TrustSection({ copy }: { copy: Copy }) {
  const icons = [LockKeyhole, ShieldCheck, Clock3];
  return <section className="bg-[var(--color-surface-muted)]">
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div><SectionIntro eyebrow={copy.trust.eyebrow} title={copy.trust.title} description={copy.trust.description} /><Link href="/keamanan" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">{copy.trust.cta}<span aria-hidden="true">→</span></Link></div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {copy.trust.items.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><Icon size={20} aria-hidden="true" /><h3 className="mt-3 font-[var(--font-display)] font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{item.description}</p></li>; })}
      </ul>
    </div>
  </section>;
}

function FaqSection({ copy }: { copy: Copy }) {
  return <section id="faq" className="scroll-mt-20 mx-auto grid max-w-[1240px] gap-8 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-[0.7fr_1.3fr]">
    <SectionIntro eyebrow={copy.faq.eyebrow} title={copy.faq.title} description={copy.faq.description} />
    <div>{copy.faq.items.map((item, index) => <Disclosure key={item.question} id={`faq-answer-${index + 1}`} title={item.question}>{item.answer}</Disclosure>)}</div>
  </section>;
}

function FinalCta({ copy }: { copy: Copy }) {
  return <section className="bg-[#0a0a0a] text-white">
    <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-5 px-4 py-12 sm:px-6 sm:py-14 md:flex-row md:items-center md:justify-between">
      <div><h2 className="max-w-2xl font-[var(--font-display)] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{copy.final.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{copy.final.description}</p></div>
      <div className="shrink-0"><Link href="/masuk" className="inline-flex min-h-12 items-center rounded-[10px] bg-[var(--color-primary)] px-5 font-bold text-[#0a0a0a]">{copy.nav.createAlbum}<span className="ml-2" aria-hidden="true">→</span></Link><p className="mt-2 text-center text-xs text-white/65">{copy.final.microcopy}</p></div>
    </div>
  </section>;
}

function SectionIntro({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description?: string; dark?: boolean }) {
  return <div>
    <p className={`mb-3 text-xs font-bold tracking-[0.12em] ${dark ? 'text-[var(--color-primary-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>{eyebrow}</p>
    <h2 className="max-w-2xl font-[var(--font-display)] text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl">{title}</h2>
    {description && <p className={`mt-4 max-w-xl text-sm leading-6 ${dark ? 'text-white/75' : 'text-[var(--color-muted-foreground)]'}`}>{description}</p>}
  </div>;
}
