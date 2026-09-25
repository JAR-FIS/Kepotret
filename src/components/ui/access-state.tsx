import type { ReactNode } from 'react';

type AccessStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

function AccessState({ title, description, action }: AccessStateProps) {
  return (
    <section className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

export function ReauthState(props: AccessStateProps) {
  return <AccessState {...props} />;
}

export function ForbiddenState(props: AccessStateProps) {
  return <AccessState {...props} />;
}

export function PermissionDeniedState(props: AccessStateProps) {
  return <AccessState {...props} />;
}
