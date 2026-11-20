-- Tenant policies. An empty app.org_id keeps every row visible so the
-- shared database and the main app, which never set the GUC, keep working.
-- The request path sets the tenant. The table owner still bypasses RLS
-- unless the session uses a NOBYPASSRLS role.

CREATE OR REPLACE FUNCTION app_org() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')
$$;

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_student ON "Student";
CREATE POLICY tenant_student ON "Student"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "Student"."campusId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "Student"."campusId" AND c."orgId" = app_org()
    )
  );

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_user ON "User";
CREATE POLICY tenant_user ON "User"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "User"."campusId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Campus" c
      WHERE c.id = "User"."campusId" AND c."orgId" = app_org()
    )
  );

ALTER TABLE "FeeInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeInvoice" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_fee_invoice ON "FeeInvoice";
CREATE POLICY tenant_fee_invoice ON "FeeInvoice"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "FeeInvoice"."studentId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "FeeInvoice"."studentId" AND c."orgId" = app_org()
    )
  );

ALTER TABLE "FeeInvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeInvoiceLine" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_fee_line ON "FeeInvoiceLine";
CREATE POLICY tenant_fee_line ON "FeeInvoiceLine"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "FeeInvoiceLine"."invoiceId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "FeeInvoiceLine"."invoiceId" AND c."orgId" = app_org()
    )
  );

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_payment ON "Payment";
CREATE POLICY tenant_payment ON "Payment"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "Payment"."invoiceId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "FeeInvoice" i
      JOIN "Student" s ON s.id = i."studentId"
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE i.id = "Payment"."invoiceId" AND c."orgId" = app_org()
    )
  );

ALTER TABLE "StudentAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentAttendance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_attendance ON "StudentAttendance";
CREATE POLICY tenant_attendance ON "StudentAttendance"
  USING (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "StudentAttendance"."studentId" AND c."orgId" = app_org()
    )
  )
  WITH CHECK (
    app_org() IS NULL OR EXISTS (
      SELECT 1 FROM "Student" s
      JOIN "Campus" c ON c.id = s."campusId"
      WHERE s.id = "StudentAttendance"."studentId" AND c."orgId" = app_org()
    )
  );
