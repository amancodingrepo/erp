import { prisma } from "./db";

const POLICIES: Array<[string, string, string]> = [
  [
    "Student",
    "tenant_student",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "Student"."campusId" AND c."orgId" = app_org()
    )`,
  ],
  [
    "User",
    "tenant_user",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "User"."campusId" AND c."orgId" = app_org()
    )`,
  ],
  [
    "FeeInvoice",
    "tenant_fee_invoice",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "FeeInvoice"."studentId" AND c."orgId" = app_org()
    )`,
  ],
  [
    "FeeInvoiceLine",
    "tenant_fee_line",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "FeeInvoiceLine"."invoiceId" AND c."orgId" = app_org()
    )`,
  ],
  [
    "Payment",
    "tenant_payment",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "Payment"."invoiceId" AND c."orgId" = app_org()
    )`,
  ],
  [
    "StudentAttendance",
    "tenant_attendance",
    `app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "StudentAttendance"."studentId" AND c."orgId" = app_org()
    )`,
  ],
];

const LOCK_KEY = 814202611;
let pending: Promise<void> | null = null;

async function policiesReady(db: { $queryRawUnsafe: (query: string) => Promise<unknown> }) {
  const rows = (await db.$queryRawUnsafe(
    `SELECT polname::text AS polname FROM pg_policy WHERE polname LIKE 'tenant_%'`,
  )) as Array<{ polname: string }>;
  const have = new Set(rows.map((row) => row.polname));
  const fn = (await db.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'app_org') AS ok`,
  )) as Array<{ ok: boolean }>;
  return Boolean(fn[0]?.ok) && POLICIES.every(([, policy]) => have.has(policy));
}

async function apply() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${LOCK_KEY})`);
    if (await policiesReady(tx)) return;
    await tx.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION app_org() RETURNS text
      LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('app.org_id', true), '')
      $$
    `);
    for (const [table, policy, expr] of POLICIES) {
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      await tx.$executeRawUnsafe(`DROP POLICY IF EXISTS ${policy} ON "${table}"`);
      await tx.$executeRawUnsafe(
        `CREATE POLICY ${policy} ON "${table}" USING (${expr}) WITH CHECK (${expr})`,
      );
    }
    try {
      await tx.$executeRawUnsafe(`
        DO $do$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_tenant') THEN
            CREATE ROLE erp_tenant NOLOGIN NOBYPASSRLS;
          END IF;
        END
        $do$
      `);
      const tables = ["Campus", ...POLICIES.map(([table]) => table)];
      for (const table of tables) {
        await tx.$executeRawUnsafe(
          `GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO erp_tenant`,
        );
      }
    } catch {
      // The local superuser can prove the policies with SET ROLE.
      // A non-superuser migrate still keeps the policies above.
    }
  }, { timeout: 60000, maxWait: 20000 });
}

export function ensureTenantPolicies() {
  if (!pending) {
    pending = apply().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
