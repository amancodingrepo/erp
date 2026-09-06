export default function PhaseBScreen({ title }: { title: string }) {
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        Phase B
      </p>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-[var(--muted)]">
        This screen is not in production v1. Payroll, recruitment, and mentoring
        stay off until the core SIS, fees, attendance, and exams are accepted.
        See <code>production_implementation_plan.md</code> Phase B.
      </p>
    </div>
  );
}
