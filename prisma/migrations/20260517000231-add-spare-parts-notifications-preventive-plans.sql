-- Up Migration

CREATE TYPE "NotificationType" AS ENUM ('OVERDUE_WORK_ORDER', 'LOW_STOCK');

CREATE TABLE "AuditLog" (
  "id"         SERIAL      NOT NULL,
  "userId"     INTEGER     NOT NULL,
  "action"     TEXT        NOT NULL,
  "targetType" TEXT        NOT NULL,
  "targetId"   INTEGER     NOT NULL,
  "before"     JSONB,
  "after"      JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SparePart" (
  "id"           SERIAL      NOT NULL,
  "name"         TEXT        NOT NULL,
  "partNumber"   TEXT        NOT NULL,
  "description"  TEXT,
  "quantity"     INTEGER     NOT NULL DEFAULT 0,
  "minimumStock" INTEGER     NOT NULL DEFAULT 0,
  "unitCost"     DOUBLE PRECISION,
  "deletedAt"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SparePart_partNumber_key" ON "SparePart"("partNumber");

CREATE TABLE "WorkOrderPart" (
  "id"           SERIAL      NOT NULL,
  "workOrderId"  INTEGER     NOT NULL,
  "sparePartId"  INTEGER     NOT NULL,
  "quantityUsed" INTEGER     NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkOrderPart_workOrderId_sparePartId_key"
  ON "WorkOrderPart"("workOrderId", "sparePartId");

ALTER TABLE "WorkOrderPart"
  ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrderPart"
  ADD CONSTRAINT "WorkOrderPart_sparePartId_fkey"
  FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id"          SERIAL             NOT NULL,
  "type"        "NotificationType" NOT NULL,
  "message"     TEXT               NOT NULL,
  "isRead"      BOOLEAN            NOT NULL DEFAULT false,
  "userId"      INTEGER            NOT NULL,
  "workOrderId" INTEGER,
  "sparePartId" INTEGER,
  "createdAt"   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_sparePartId_fkey"
  FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PreventivePlan" (
  "id"              SERIAL      NOT NULL,
  "name"            TEXT        NOT NULL,
  "description"     TEXT,
  "assetId"         INTEGER     NOT NULL,
  "intervalDays"    INTEGER     NOT NULL,
  "lastGeneratedAt" TIMESTAMPTZ,
  "nextDueAt"       TIMESTAMPTZ NOT NULL,
  "isActive"        BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PreventivePlan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PreventivePlan"
  ADD CONSTRAINT "PreventivePlan_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Down Migration

ALTER TABLE "PreventivePlan" DROP CONSTRAINT "PreventivePlan_assetId_fkey";
DROP TABLE "PreventivePlan";

ALTER TABLE "Notification" DROP CONSTRAINT "Notification_sparePartId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workOrderId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";
DROP TABLE "Notification";

ALTER TABLE "WorkOrderPart" DROP CONSTRAINT "WorkOrderPart_sparePartId_fkey";
ALTER TABLE "WorkOrderPart" DROP CONSTRAINT "WorkOrderPart_workOrderId_fkey";
DROP TABLE "WorkOrderPart";

DROP TABLE "SparePart";

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
DROP TABLE "AuditLog";

DROP TYPE "NotificationType";
