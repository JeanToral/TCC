-- Up Migration
ALTER TABLE "WorkOrder" ADD COLUMN "cancellationReason" TEXT;

-- Down Migration
ALTER TABLE "WorkOrder" DROP COLUMN "cancellationReason";

