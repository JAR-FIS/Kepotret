'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

type FaqItem = { question: string; answer: string };

export function H01FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();

  return (
    <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${id}-answer-${index + 1}`;
        return (
          <div key={item.question} className="py-1">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex((current) => current === index ? null : index)}
                className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left text-sm font-semibold sm:text-base"
              >
                <span>{item.question}</span>
                <ChevronDown aria-hidden="true" size={19} className={`shrink-0 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
              </button>
            </h3>
            <div
              id={panelId}
              aria-hidden={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-[var(--color-muted-foreground)]">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
