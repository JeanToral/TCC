-- Up Migration

INSERT INTO "Role" ("name", "description", "permissions", "isSystem", "createdAt", "updatedAt")
VALUES
  (
    'Manager',
    'Gerente de manutenção',
    '["asset.create","asset.read","asset.update","asset.delete","workorder.create","workorder.read","workorder.update","workorder.delete","workorder.approve","sparepart.read","sparepart.update","user.read","dashboard.read"]',
    true, NOW(), NOW()
  ),
  (
    'Engineer',
    'Engenheiro de manutenção',
    '["asset.read","asset.update","workorder.create","workorder.read","workorder.update","workorder.delete","sparepart.read","sparepart.update","dashboard.read"]',
    true, NOW(), NOW()
  ),
  (
    'Technician',
    'Técnico de manutenção',
    '["asset.read","workorder.read","sparepart.read"]',
    true, NOW(), NOW()
  )
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "User" ("name", "email", "passwordHash", "isActive", "roleId", "createdAt", "updatedAt")
SELECT 'Gerente Silva', 'manager@cmms.local',
       '$2a$10$/vHxnFi95Y0bVaqnDZEDauJTmtdN9IkHbwB5Z284ZL0vn8R8q7C1.',
       true, r."id", NOW(), NOW()
FROM "Role" r WHERE r."name" = 'Manager'
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "User" ("name", "email", "passwordHash", "isActive", "roleId", "createdAt", "updatedAt")
SELECT 'Engenheiro Costa', 'engineer@cmms.local',
       '$2a$10$CVioPitJHzOOrIq9yRB4qO1.uczZTA/HiUfIaHNw4fF53LXi.Y3DW',
       true, r."id", NOW(), NOW()
FROM "Role" r WHERE r."name" = 'Engineer'
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "User" ("name", "email", "passwordHash", "isActive", "roleId", "createdAt", "updatedAt")
SELECT 'Técnico Alves', 'technician@cmms.local',
       '$2a$10$T779ISDEeLyBoHp5Edrb0OwwzcZmOC5YxhkuSSajD5Ruyh6IzX5eS',
       true, r."id", NOW(), NOW()
FROM "Role" r WHERE r."name" = 'Technician'
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Asset" ("name", "tag", "location", "createdAt", "updatedAt")
VALUES
  ('Torno CNC 01', 'MQ-001', 'Setor de Usinagem', NOW(), NOW()),
  ('Compressor de Ar 02', 'MQ-002', 'Sala de Compressores', NOW(), NOW()),
  ('Esteira Transportadora 03', 'MQ-003', 'Linha de Produção A', NOW(), NOW())
ON CONFLICT ("tag") DO NOTHING;

-- Down Migration

DELETE FROM "Asset" WHERE "tag" IN ('MQ-001', 'MQ-002', 'MQ-003');
DELETE FROM "User" WHERE "email" IN ('manager@cmms.local', 'engineer@cmms.local', 'technician@cmms.local');
DELETE FROM "Role" WHERE "name" IN ('Manager', 'Engineer', 'Technician') AND "isSystem" = true;
