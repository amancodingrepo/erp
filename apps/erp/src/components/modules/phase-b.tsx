export default function PhaseBScreen({ title }: { title: string }) {
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        Not in production v1
      </p>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-[var(--muted)]">
        This screen is not wired in production v1. Optional modules stay off
        until SuperAdmin enables them for a demo; the workbench is read-only
        and does not write catalog records. See{" "}
        <code>production_implementation_plan.md</code>.
      </p>
    </div>
  );
}
