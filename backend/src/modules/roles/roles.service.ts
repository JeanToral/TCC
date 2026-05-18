// ─────────────────────── Imports ────────────────────────
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLogService } from '../audit-log/audit-log.service';
import { type RoleRecord, RolesRepository } from './roles.repository';
import type { CreateRoleInput } from './dto/create-role.input';
import type { UpdateRoleInput } from './dto/update-role.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class RolesService {
  constructor(
    private readonly repo: RolesRepository,
    private readonly audit: AuditLogService,
  ) {}

  findAll(): Promise<RoleRecord[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<RoleRecord> {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} não encontrada`);
    return role;
  }

  async create(input: CreateRoleInput, actorId: number): Promise<RoleRecord> {
    const role = await this.repo.create({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });

    this.audit.log(actorId, 'role.create', 'Role', role.id, null, {
      name: role.name,
      permissions: input.permissions,
    });

    return role;
  }

  async update(id: number, input: UpdateRoleInput, actorId: number): Promise<RoleRecord> {
    const before = await this.findById(id);
    if (before.isSystem) throw new ForbiddenException('Roles de sistema não podem ser editadas');

    const after = await this.repo.update(id, {
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });

    this.audit.log(actorId, 'role.update', 'Role', id,
      { name: before.name, permissions: before.permissions },
      { name: after.name, permissions: after.permissions },
    );

    return after;
  }

  async delete(id: number, actorId: number): Promise<RoleRecord> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('Roles de sistema não podem ser deletadas');

    const deleted = await this.repo.delete(id);

    this.audit.log(actorId, 'role.delete', 'Role', id,
      { name: role.name, permissions: role.permissions },
      null,
    );

    return deleted;
  }
}
