-- Up Migration

INSERT INTO "Role" ("name", "description", "permissions", "isSystem", "createdAt", "updatedAt")
VALUES (
  'Sysadmin',
  'Acesso total ao sistema',
  '["*"]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "User" ("name", "email", "passwordHash", "isActive", "roleId", "createdAt", "updatedAt")
SELECT
  'Administrador',
  [EMAIL_ADDRESS]',
  '$2b$10$tQGJM5uHAInTBApGzvYonOFAQUGnfRM9fTo4dTRpoKeqRemMZpRq2',
  true,
  r."id",
  NOW(),
  NOW()
FROM "Role" r
WHERE r."name" = 'Sysadmin'
ON CONFLICT ("email") DO NOTHING;

-- Down Migration

DELETE FROM "User" WHERE "email" = 'admin@cmms.local';
DELETE FROM "Role" WHERE "name" = 'Sysadmin' AND "isSystem" = true;
