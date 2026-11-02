export default function PhaseBScreen({ title }: { title: string }) {
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        Not in production v1
      </p>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-[var(--muted)]">
        System Update is disabled on this hosted app. Railway deploys new
        versions; there is no in-app updater.
      </p>
    </div>
  );
}
