-- Up Migration
ALTER TABLE "Asset"
  ADD COLUMN "manufacturer" TEXT,
  ADD COLUMN "model"        TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "installDate"  TIMESTAMPTZ;

-- Down Migration
ALTER TABLE "Asset"
  DROP COLUMN "manufacturer",
  DROP COLUMN "model",
  DROP COLUMN "serialNumber",
  DROP COLUMN "installDate";

