-- Up Migration

CREATE TABLE "Role" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "permissions" JSONB       NOT NULL,
  "isSystem"    BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE TABLE "User" (
  "id"               TEXT        NOT NULL,
  "name"             TEXT        NOT NULL,
  "email"            TEXT        NOT NULL,
  "passwordHash"     TEXT        NOT NULL,
  "refreshTokenHash" TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT true,
  "roleId"           TEXT        NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "User"
  ADD CONSTRAINT "User_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Down Migration

ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";
DROP TABLE "User";
DROP TABLE "Role";
