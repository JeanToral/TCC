-- Up Migration

-- Plano preventivo que gerou a OS: impede "Gerar OS vencidas" de duplicar
-- enquanto houver uma OS do plano em aberto.
ALTER TABLE "WorkOrder" ADD COLUMN "preventivePlanId" INTEGER;

CREATE INDEX "WorkOrder_preventivePlanId_idx" ON "WorkOrder"("preventivePlanId");

ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_preventivePlanId_fkey"
  FOREIGN KEY ("preventivePlanId") REFERENCES "PreventivePlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Backfill de dados legados ────────────────────────────────────────────
-- Antes desta coluna, a OS gerada só carregava o título "[Preventivo] <plano>"
-- e o ativo do plano. Vincula por essa convenção, uma única vez.
UPDATE "WorkOrder" wo
   SET "preventivePlanId" = pp."id"
  FROM "PreventivePlan" pp
 WHERE wo."preventivePlanId" IS NULL
   AND wo."type" = 'PREVENTIVE'
   AND wo."assetId" = pp."assetId"
   AND wo."title" = '[Preventivo] ' || pp."name";

-- Down Migration

ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_preventivePlanId_fkey";
DROP INDEX "WorkOrder_preventivePlanId_idx";
ALTER TABLE "WorkOrder" DROP COLUMN "preventivePlanId";
