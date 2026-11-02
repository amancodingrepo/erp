CREATE TABLE "Hostel" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelRoom" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "roomType" TEXT NOT NULL DEFAULT '2-share',
    CONSTRAINT "HostelRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelAllocation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "HostelAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PickupPoint" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PickupPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "routeId" TEXT,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentTransport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "pickupPointId" TEXT NOT NULL,
    CONSTRAINT "StudentTransport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hostel_campusId_name_key" ON "Hostel"("campusId", "name");
CREATE UNIQUE INDEX "HostelRoom_hostelId_number_key" ON "HostelRoom"("hostelId", "number");
CREATE INDEX "HostelAllocation_studentId_leftAt_idx" ON "HostelAllocation"("studentId", "leftAt");
CREATE UNIQUE INDEX "TransportRoute_campusId_name_key" ON "TransportRoute"("campusId", "name");
CREATE UNIQUE INDEX "Vehicle_campusId_registrationNo_key" ON "Vehicle"("campusId", "registrationNo");
CREATE UNIQUE INDEX "StudentTransport_studentId_key" ON "StudentTransport"("studentId");

ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentTransport" ADD CONSTRAINT "StudentTransport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTransport" ADD CONSTRAINT "StudentTransport_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTransport" ADD CONSTRAINT "StudentTransport_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
