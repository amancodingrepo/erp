CREATE TYPE "PayElementKind" AS ENUM ('EARNING', 'DEDUCTION');
CREATE TABLE "PayElement" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "PayElementKind" NOT NULL,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PayElement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StaffPayStructure" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "StaffPayStructure_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PayrollTaxSlab" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "minAmount" DECIMAL(12,2) NOT NULL,
    "maxAmount" DECIMAL(12,2),
    "rate" DECIMAL(8,4),
    "taxAmount" DECIMAL(12,2),
    CONSTRAINT "PayrollTaxSlab_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PayrollSlip" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "pf" DECIMAL(12,2) NOT NULL,
    "esi" DECIMAL(12,2) NOT NULL,
    "pt" DECIMAL(12,2) NOT NULL,
    "tds" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "lines" JSONB NOT NULL,
    CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayElement_campusId_code_key" ON "PayElement"("campusId", "code");
CREATE UNIQUE INDEX "StaffPayStructure_staffId_elementId_key" ON "StaffPayStructure"("staffId", "elementId");
CREATE UNIQUE INDEX "PayrollRun_campusId_year_month_key" ON "PayrollRun"("campusId", "year", "month");
CREATE UNIQUE INDEX "PayrollSlip_runId_staffId_key" ON "PayrollSlip"("runId", "staffId");
ALTER TABLE "PayElement" ADD CONSTRAINT "PayElement_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayStructure" ADD CONSTRAINT "StaffPayStructure_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffPayStructure" ADD CONSTRAINT "StaffPayStructure_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "PayElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollTaxSlab" ADD CONSTRAINT "PayrollTaxSlab_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
