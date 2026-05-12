-- Up Migration

CREATE TYPE "WorkOrderType" AS ENUM ('CORRECTIVE', 'PREVENTIVE');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "WorkOrderStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "Asset" (
  "id"        SERIAL      NOT NULL,
  "name"      TEXT        NOT NULL,
  "tag"       TEXT        NOT NULL,
  "location"  TEXT,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Asset_tag_key" ON "Asset"("tag");

CREATE TABLE "WorkOrder" (
  "id"              SERIAL            NOT NULL,
  "title"           TEXT              NOT NULL,
  "description"     TEXT              NOT NULL,
  "type"            "WorkOrderType"   NOT NULL,
  "priority"        "Priority"        NOT NULL,
  "status"          "WorkOrderStatus" NOT NULL DEFAULT 'REQUESTED',
  "assetId"         INTEGER           NOT NULL,
  "requestedById"   INTEGER           NOT NULL,
  "assignedToId"    INTEGER,
  "scheduledStart"  TIMESTAMPTZ,
  "scheduledEnd"    TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "closingNotes"    TEXT,
  "startedAt"       TIMESTAMPTZ,
  "completedAt"     TIMESTAMPTZ,
  "deletedAt"       TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Down Migration

ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_assignedToId_fkey";
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_requestedById_fkey";
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_assetId_fkey";
DROP TABLE "WorkOrder";
DROP TABLE "Asset";
DROP TYPE "WorkOrderStatus";
DROP TYPE "Priority";
DROP TYPE "WorkOrderType";
