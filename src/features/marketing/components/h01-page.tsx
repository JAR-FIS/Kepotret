import Link from 'next/link';
import { ArrowDown, ArrowRight, Aperture, Camera, Check, CirclePlay, CircleUserRound, Download, Image as ImageIcon, LockKeyhole, QrCode, ShieldCheck, UsersRound, Clock3, Building2, UserRound } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { getContent, type Locale } from '@/features/marketing/content';
import { H01FaqAccordion } from '@/features/marketing/components/h01-faq-accordion';
import { H01HeroHeadline } from '@/features/marketing/components/h01-hero-headline';
import { PricingSelector } from '@/features/marketing/components/pricing-selector';
import { PublicPageFrame } from '@/features/marketing/components/public-page-frame';

export function H01Page({ locale }: { locale: Locale }) {
  const copy = getContent(locale);
  return <PublicPageFrame locale={locale}>
    <main className="h01-page">
      <Hero locale={locale} copy={copy} />
      <HowSection copy={copy} />
      <BenefitsSection locale={locale} copy={copy} />
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
    ...eventImage('wedding-03.jpg', 'Pengantin wanita mengenakan busana putih bersama pasangannya', 'A bride in white stands with her partner', '65% 57%'),
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
  const proofIcons = [ImageIcon, UsersRound];
  return <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.94fr_1.06fr] lg:gap-8 lg:py-24">
    <div className="h01-reveal relative z-10">
      <p className="mb-5 inline-flex rounded-full border border-[var(--color-border)] px-3 py-2 text-[11px] font-bold tracking-[0.08em]">{copy.hero.eyebrow}</p>
      <H01HeroHeadline title={copy.hero.title} firstLine={copy.hero.titleFirstLine} secondLine={copy.hero.titleSecondLine} />
      <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted-foreground)] sm:text-lg sm:leading-8">{copy.hero.description}</p>
      <ul className="mt-7 grid gap-4 text-sm font-semibold sm:grid-cols-2 sm:gap-5 lg:max-w-xl">
        {copy.hero.proof.map((item, index) => { const Icon = proofIcons[index]!; return <li key={item} className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)]"><Icon size={19} aria-hidden="true" /></span><span>{item}</span></li>; })}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link href="/masuk" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-bold text-[var(--color-primary-foreground)] hover:brightness-95">{copy.nav.createAlbum}<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link href="#cara-kerja" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-5 font-bold hover:bg-[var(--color-muted)]"><CirclePlay size={18} aria-hidden="true" />{copy.hero.secondary}</Link>
      </div>
    </div>
    <HeroVisual locale={locale} copy={copy} />
  </section>;
}

function HeroVisual({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <div className="hero-visual h01-reveal relative mx-auto aspect-[0.58/1] w-full max-w-[620px] sm:aspect-[1.16/1]">
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
        <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#d8ff3d] py-3 text-sm font-bold"><Camera size={17} aria-hidden="true" />{copy.guest.steps[3].title}</div>
      </div>
      <span aria-hidden="true" className="absolute -right-2 top-[18%] h-5 w-5 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-background)]" />
    </div>
    <div className="absolute -bottom-1 left-[3%] z-20 hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] sm:block"><span className="mr-2 text-[var(--color-muted-foreground)]">QR</span><span>{copy.how.steps[1].title}</span></div>
  </div>;
}

function HowSection({ copy }: { copy: Copy }) {
  return <section id="cara-kerja" className="scroll-mt-20 bg-[#0a0a0a] text-white dark:bg-[#181818]">
    <div className="h01-reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-28 lg:py-32">
      <SectionIntro eyebrow={copy.how.eyebrow} title={<>{copy.how.titleLead} <span className="text-[var(--color-primary)]">{copy.how.titleAccent}</span></>} description={copy.how.description} dark />
      <ol className="mt-12 grid gap-7 md:grid-cols-3 md:gap-9">
        {copy.how.steps.map((step, index) => <li key={step.title} className="relative border-t border-white/25 pt-6 md:pt-7">
          <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[#0a0a0a]">0{index + 1}</span>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">{step.title}</h3>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/90">{step.description}</p>
          {index < 2 && <ArrowDown aria-hidden="true" size={19} className="absolute right-2 top-8 hidden rotate-[-90deg] text-[var(--color-primary)] md:block" />}
        </li>)}
      </ol>
      <Link href="/cara-kerja" className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-bold text-[#0a0a0a]">{copy.how.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  </section>;
}

function BenefitsSection({ locale, copy }: { locale: Locale; copy: Copy }) {
  const icons = [Camera, ImageIcon, UsersRound, LockKeyhole, Building2];
  const featurePhotos = [
    eventImage('event-02.jpg', 'Momen acara dari sudut peserta', 'An event moment captured by a participant'),
    eventImage('corporate-gathering-01.jpg', 'Peserta berkumpul dalam acara organisasi', 'Attendees gather at an organization event'),
    eventImage('komunitas-01.jpg', 'Anggota komunitas mengabadikan kebersamaan', 'Community members capture a moment together'),
  ];
  return <section className="dark:bg-[#0a0a0a]">
    <div className="h01-reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-28 lg:py-32">
      <SectionIntro eyebrow={copy.benefits.eyebrow} title={copy.benefits.title} description={copy.benefits.description} />
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <div className="relative flex min-h-[340px] items-end overflow-hidden rounded-[24px] bg-[#222] p-5 sm:min-h-[400px] sm:p-8">
          <div className="absolute inset-0 grid grid-cols-[1.2fr_0.8fr] grid-rows-2 gap-1.5 opacity-90">
            {featurePhotos.map((photo, index) => <div key={photo.src} className={`relative overflow-hidden ${index === 0 ? 'row-span-2' : ''}`}><Image src={photo.src} alt={photo.alt[locale]} fill sizes="(max-width: 1023px) 100vw, 58vw" className="object-cover" /></div>)}
          </div>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
          <div className="relative max-w-lg text-white">
            <Camera aria-hidden="true" size={22} className="text-[var(--color-primary)]" />
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">{copy.benefits.items[0].title}</h3>
            <p className="mt-2 text-sm leading-7 text-white/90">{copy.benefits.items[0].description}</p>
          </div>
        </div>
        <ul className="grid content-center gap-8 sm:grid-cols-2 lg:grid-cols-1 lg:gap-7">
          {copy.benefits.items.slice(1).map((item, index) => { const Icon = icons[index + 1]!; return <li key={item.title} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)]"><Icon size={19} aria-hidden="true" /></span><div><h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[var(--color-muted-foreground)]">{item.description}</p></div></li>; })}
        </ul>
      </div>
    </div>
  </section>;
}

function DifferentiationSection({ copy }: { copy: Copy }) {
  const icons = [Download, ShieldCheck, UsersRound, ImageIcon];
  return <section className="dark:bg-[#181818]">
    <div className="h01-reveal mx-auto max-w-[1240px] px-4 pb-20 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="rounded-[28px] bg-[linear-gradient(110deg,#eefdb0,#f4fdc7_35%,#f6fdd7_68%,#f9fee6)] p-6 text-[#0a0a0a] sm:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.12em] text-[#4b5a20]">{copy.differentiation.eyebrow}</p>
            <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.08] tracking-tight text-[#0a0a0a] sm:text-4xl">{copy.differentiation.title}</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#0a0a0a] sm:text-base lg:max-w-none">{copy.differentiation.description}</p>
          </div>
          <ul className="grid gap-7 sm:grid-cols-2 sm:gap-9">
            {copy.differentiation.items.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75"><Icon size={19} aria-hidden="true" /></span><div><h3 className="font-[family-name:var(--font-display)] font-bold text-[#0a0a0a]">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[#0a0a0a]">{item.description}</p></div></li>; })}
          </ul>
        </div>
      </div>
    </div>
  </section>;
}

function UseCasesSection({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <section className="dark:bg-[#0a0a0a]">
    <div className="h01-reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-28 lg:py-32">
      <div className="grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-12"><SectionIntro eyebrow={copy.useCases.eyebrow} title={copy.useCases.title} /><p className="max-w-2xl text-sm leading-7 text-[var(--color-muted-foreground)] md:justify-self-end">{copy.useCases.description}</p></div>
      <ul tabIndex={0} aria-label={copy.useCases.title} className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 focus-visible:rounded-xl lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:pb-0">
        {copy.useCases.items.map((item, index) => { const photo = useCasePhotos[index]!; return <li key={item.title} className="w-[76vw] max-w-[310px] shrink-0 snap-start sm:w-[44vw] md:w-[30vw] lg:w-auto lg:max-w-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[var(--color-surface-muted)]">
            <Image src={photo.src} alt={photo.alt[locale]} fill sizes="(max-width: 639px) 76vw, (max-width: 1023px) 44vw, (max-width: 1279px) 30vw, 190px" className="object-cover transition-transform duration-500 hover:scale-[1.03] motion-reduce:transition-none" style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined} />
          </div>
          <div className="pt-4"><h3 className="font-[family-name:var(--font-display)] font-bold">{item.title}</h3><p className="mt-2 text-xs leading-6 text-[var(--color-muted-foreground)]">{item.description}</p></div>
        </li>; })}
      </ul>
    </div>
  </section>;
}

function GuestSection({ copy }: { copy: Copy }) {
  const icons = [QrCode, UserRound, Camera, Aperture];
  return <section className="bg-[#0a0a0a] text-white dark:bg-[#181818]">
    <div className="h01-reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-28 lg:py-32">
      <SectionIntro eyebrow={copy.guest.eyebrow} title={copy.guest.title} description={copy.guest.description} dark />
      <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 lg:grid-cols-4 lg:gap-7">
        {copy.guest.steps.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="min-w-0 text-center">
          <span className="mx-auto mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[#0a0a0a]">0{index + 1}</span>
          <div aria-hidden="true" className="mx-auto flex h-[210px] w-[min(100%,150px)] items-center justify-center rounded-[28px] border-[5px] border-[#171717] bg-white p-2 shadow-[0_18px_38px_rgb(0_0_0_/_25%)] sm:h-[250px] sm:w-[168px]">
            <div className="relative flex h-full w-full flex-col items-center overflow-hidden rounded-[20px] bg-[#f7f7f5] p-3 text-[#0a0a0a]">
              <span className="mt-1 block h-1.5 w-10 rounded-full bg-[#0a0a0a]" />
              <div className="relative mt-5 flex w-full flex-1 flex-col items-center justify-center gap-3 text-center">
                {index === 0 && <><QrCode size={66} strokeWidth={1.5} /><span className="h-2 w-20 rounded-full bg-[#d9d9d9]" /></>}
                {index === 1 && <><span className="text-[10px] font-semibold">{copy.guest.steps[1].title}</span><span className="h-8 w-full rounded-lg border border-[#d9d9d9] bg-white" /><span className="h-7 w-full rounded-full bg-[#d8ff3d]" /></>}
                {index === 2 && <><div className="flex h-24 w-20 items-center justify-center rounded-2xl bg-[#0a0a0a]"><Camera size={34} className="text-white" /></div><span className="h-8 w-8 rounded-full border-4 border-[#d8ff3d]" /></>}
                {index === 3 && <><div className="absolute inset-x-2 bottom-12 top-8 overflow-hidden rounded-lg"><Image src="/media/marketing/events/komunitas-02.jpg" alt="" fill sizes="140px" className="object-cover" /><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" /></div><span data-testid="h01-fourth-phone-label" className="absolute inset-x-1 bottom-1.5 flex min-h-8 items-center justify-center rounded-lg bg-[#d8ff3d] px-2 py-1.5 text-[10px] font-bold leading-snug text-[#0a0a0a] shadow-sm"><span className="w-full text-center">{copy.guest.steps[3].title}</span></span></>}
              </div>
              <Icon size={17} className="mb-1 mt-2 text-[#6b6b6b]" />
            </div>
          </div>
          <h3 className="mx-auto mt-5 max-w-[15rem] font-[family-name:var(--font-display)] text-base font-bold sm:text-lg">{item.title}</h3>
          <p className="mx-auto mt-2 max-w-[17rem] text-xs leading-6 text-white sm:text-sm">{item.description}</p>
        </li>; })}
      </ol>
      <div className="mt-8 flex flex-wrap gap-2">{copy.guest.badges.map((badge) => <span key={badge} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 px-3 text-sm"><Check size={15} aria-hidden="true" className="text-[var(--color-primary)]" />{badge}</span>)}</div>
      <Link href="/cara-kerja" className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-bold text-[#0a0a0a]">{copy.guest.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  </section>;
}

function PricingSection({ locale, copy }: { locale: Locale; copy: Copy }) {
  return <section id="harga" className="scroll-mt-20 dark:bg-[#0a0a0a]">
    <div className="h01-reveal mx-auto grid max-w-[1240px] gap-9 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-14 lg:py-32">
      <SectionIntro eyebrow={copy.pricing.eyebrow} title={copy.pricing.title} description={copy.pricing.description} />
      <PricingSelector locale={locale} />
    </div>
  </section>;
}

function TrustSection({ copy }: { copy: Copy }) {
  const icons = [LockKeyhole, ShieldCheck, Clock3];
  return <section className="bg-[var(--color-surface-muted)] dark:bg-[#181818]">
    <div className="h01-reveal mx-auto grid max-w-[1240px] gap-9 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14 lg:py-32">
      <div><SectionIntro eyebrow={copy.trust.eyebrow} title={copy.trust.title} description={copy.trust.description} /><Link href="/keamanan" className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">{copy.trust.cta}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      <ul className="grid gap-5 sm:grid-cols-3">
        {copy.trust.items.map((item, index) => { const Icon = icons[index]!; return <li key={item.title} className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><Icon size={20} aria-hidden="true" /><h3 className="mt-4 font-[family-name:var(--font-display)] font-bold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[var(--color-muted-foreground)]">{item.description}</p></li>; })}
      </ul>
    </div>
  </section>;
}

function FaqSection({ copy }: { copy: Copy }) {
  return <section id="faq" className="scroll-mt-20 dark:bg-[#0a0a0a]">
    <div className="h01-reveal mx-auto grid max-w-[1240px] gap-9 px-4 py-24 sm:px-6 sm:py-28 md:grid-cols-[0.7fr_1.3fr] md:gap-14 lg:py-32">
      <SectionIntro eyebrow={copy.faq.eyebrow} title={copy.faq.title} description={copy.faq.description} />
      <H01FaqAccordion items={copy.faq.items} />
    </div>
  </section>;
}

function FinalCta({ copy }: { copy: Copy }) {
  return <section className="bg-[#0a0a0a] text-white dark:bg-[#181818]">
    <div className="h01-reveal mx-auto grid max-w-[1240px] items-center gap-8 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr_auto] lg:gap-10 lg:py-24">
      <div className="relative mx-auto h-[180px] w-full max-w-[420px] sm:h-[220px]" aria-hidden="true">
        <div className="absolute left-[6%] top-[18%] h-[68%] w-[37%] -rotate-6 overflow-hidden rounded-[20px] border-4 border-white shadow-xl"><Image src="/media/marketing/events/wedding-02.jpg" alt="" fill sizes="(max-width: 767px) 37vw, 155px" className="object-cover" /></div>
        <div className="absolute left-[32%] top-[5%] z-10 h-[86%] w-[34%] rotate-2 overflow-hidden rounded-[22px] border-4 border-white shadow-xl"><Image src="/media/marketing/events/komunitas-02.jpg" alt="" fill sizes="(max-width: 767px) 34vw, 145px" className="object-cover" /></div>
        <div className="absolute right-[3%] top-[21%] h-[62%] w-[35%] rotate-6 overflow-hidden rounded-[20px] border-4 border-white shadow-xl"><Image src="/media/marketing/events/sport-01.jpg" alt="" fill sizes="(max-width: 767px) 35vw, 150px" className="object-cover" /></div>
        <span className="absolute right-[4%] top-[4%] z-20 flex size-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-[#0a0a0a]"><Camera size={18} /></span>
      </div>
      <div>
        <div><h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{copy.final.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white">{copy.final.description}</p></div>
      </div>
      <Link href="/masuk" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 font-bold text-[#0a0a0a] lg:justify-self-end">{copy.nav.createAlbum}<ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  </section>;
}

function SectionIntro({ eyebrow, title, description, dark = false }: { eyebrow: string; title: ReactNode; description?: string; dark?: boolean }) {
  return <div>
    <p className={`mb-3 text-xs font-bold tracking-[0.12em] ${dark ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'}`}>{eyebrow}</p>
    <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:max-w-none">{title}</h2>
    {description && <p className={`mt-5 max-w-2xl text-sm leading-7 sm:text-base ${dark ? 'text-white/90' : 'text-[var(--color-muted-foreground)]'} lg:max-w-none`}>{description}</p>}
  </div>;
}
