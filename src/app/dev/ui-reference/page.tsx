'use client';

import { Camera, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { LocaleControl } from '@/components/ui/locale-control';
import { Section } from '@/components/ui/section';
import { Surface } from '@/components/ui/surface';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import en from '@/messages/en.json';
import id from '@/messages/id.json';
import { useAppLocale } from '@/providers/locale-provider';

export default function UiReferencePage() {
  const { locale } = useAppLocale();
  const copy = (locale === 'id' ? id : en).reference;
  const reduceMotion = useReducedMotion();
  return (
    <main className="min-h-screen">
      <Section>
        <Container>
          <header className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Kepotret home" className="inline-flex items-center gap-3">
              <Image src="/brand/icon.svg" alt="" width={36} height={36} className="h-9 w-9" priority />
              <span className="font-[var(--font-display)] text-xl font-bold tracking-tight">Kepotret</span>
            </Link>
            <div className="flex items-center gap-2">
              <LocaleControl label={copy.language} />
              <ThemeToggle label={copy.theme} />
            </div>
          </header>

          <div className="grid gap-8 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-28">
            <div>
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-focus)]">{copy.eyebrow}</p>
              <h1 className="max-w-3xl font-[var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">{copy.title}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-muted-foreground)] sm:text-lg">{copy.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button><Camera size={18} aria-hidden="true" />{copy.primaryAction}</Button>
                <Button variant="secondary">{copy.secondaryAction}</Button>
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
          </div>

          <p className="border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-muted-foreground)]">{copy.motion}</p>
        </Container>
      </Section>
    </main>
  );
}
