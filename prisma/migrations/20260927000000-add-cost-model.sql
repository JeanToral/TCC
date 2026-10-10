-- Up Migration

-- Taxa horária do técnico (dado salarial — ver .claude/CONTEXT.md)
ALTER TABLE "User" ADD COLUMN "hourlyRate" DOUBLE PRECISION;

-- Preço unitário congelado na conclusão da OS (ver ADR 0001)
ALTER TABLE "WorkOrderPart" ADD COLUMN "unitCostSnapshot" DOUBLE PRECISION;

-- Mão de obra e cobertura de custo na OS
ALTER TABLE "WorkOrder" ADD COLUMN "laborHours"        DOUBLE PRECISION;
ALTER TABLE "WorkOrder" ADD COLUMN "laborRateSnapshot" DOUBLE PRECISION;
ALTER TABLE "WorkOrder" ADD COLUMN "costIsComplete"    BOOLEAN NOT NULL DEFAULT true;

-- Custos de serviço externo, lançáveis por competência
CREATE TABLE "WorkOrderExternalCost" (
  "id"          SERIAL           NOT NULL,
  "workOrderId" INTEGER          NOT NULL,
  "description" TEXT             NOT NULL,
  "supplier"    TEXT,
  "amount"      DOUBLE PRECISION NOT NULL,
  "incurredAt"  TIMESTAMPTZ      NOT NULL,
  "createdById" INTEGER          NOT NULL,
  "createdAt"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "WorkOrderExternalCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkOrderExternalCost_workOrderId_idx"
  ON "WorkOrderExternalCost"("workOrderId");

CREATE INDEX "WorkOrderExternalCost_incurredAt_idx"
  ON "WorkOrderExternalCost"("incurredAt");

ALTER TABLE "WorkOrderExternalCost"
  ADD CONSTRAINT "WorkOrderExternalCost_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrderExternalCost"
  ADD CONSTRAINT "WorkOrderExternalCost_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Backfill de dados legados ────────────────────────────────────────────
-- OS já concluídas não têm snapshot. Grava o unitCost vigente HOJE como
-- aproximação e marca essas OS como cobertura estimada, para que o relatório
-- financeiro não apresente esses valores como precisos.
UPDATE "WorkOrderPart" wop
   SET "unitCostSnapshot" = sp."unitCost"
  FROM "SparePart" sp,
       "WorkOrder" wo
 WHERE wop."sparePartId" = sp."id"
   AND wop."workOrderId" = wo."id"
   AND wo."status" = 'COMPLETED';

UPDATE "WorkOrder"
   SET "costIsComplete" = false
 WHERE "status" = 'COMPLETED';

-- Down Migration

ALTER TABLE "WorkOrderExternalCost" DROP CONSTRAINT "WorkOrderExternalCost_createdById_fkey";
ALTER TABLE "WorkOrderExternalCost" DROP CONSTRAINT "WorkOrderExternalCost_workOrderId_fkey";
DROP TABLE "WorkOrderExternalCost";

ALTER TABLE "WorkOrder" DROP COLUMN "costIsComplete";
ALTER TABLE "WorkOrder" DROP COLUMN "laborRateSnapshot";
ALTER TABLE "WorkOrder" DROP COLUMN "laborHours";

ALTER TABLE "WorkOrderPart" DROP COLUMN "unitCostSnapshot";

ALTER TABLE "User" DROP COLUMN "hourlyRate";
