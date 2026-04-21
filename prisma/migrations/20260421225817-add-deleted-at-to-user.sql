-- Up Migration

ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMPTZ;

-- Down Migration

ALTER TABLE "User" DROP COLUMN "deletedAt";
