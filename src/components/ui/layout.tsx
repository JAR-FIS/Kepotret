import type { HTMLAttributes } from 'react';

export { Container as ContentShell } from './container';

type DivProps = HTMLAttributes<HTMLDivElement>;
type SemanticProps<T extends HTMLElement> = HTMLAttributes<T>;

export function Grid({ className = '', ...props }: DivProps) {
  return <div className={`grid min-w-0 gap-4 ${className}`} {...props} />;
}

export function Stack({ className = '', ...props }: DivProps) {
  return <div className={`flex min-w-0 flex-col gap-4 ${className}`} {...props} />;
}

export function Cluster({ className = '', ...props }: DivProps) {
  return <div className={`flex min-w-0 flex-wrap items-center gap-3 ${className}`} {...props} />;
}

export function PageShell({ className = '', ...props }: SemanticProps<HTMLElement>) {
  return <main className={`min-h-screen min-w-0 ${className}`} {...props} />;
}

export function HeaderShell({ className = '', ...props }: SemanticProps<HTMLElement>) {
  return <header className={`w-full min-w-0 ${className}`} {...props} />;
}

export function FooterShell({ className = '', ...props }: SemanticProps<HTMLElement>) {
  return <footer className={`w-full min-w-0 ${className}`} {...props} />;
}
