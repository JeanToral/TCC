-- Up Migration

-- Quem pode ser técnico responsável de OS. Só acrescenta: não sobrescreve
-- as demais permissões dos perfis nem duplica se já existir.
UPDATE "Role"
   SET "permissions" = "permissions" || '["workorder.execute"]'::jsonb,
       "updatedAt"   = NOW()
 WHERE "name" IN ('Technician', 'Engineer')
   AND NOT "permissions" ? 'workorder.execute';

-- Down Migration

UPDATE "Role"
   SET "permissions" = "permissions" - 'workorder.execute',
       "updatedAt"   = NOW()
 WHERE "name" IN ('Technician', 'Engineer');
