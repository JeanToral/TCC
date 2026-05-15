// ─────────────────────── Imports ────────────────────────
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { type RoleRecord, RolesRepository } from './roles.repository';
import type { CreateRoleInput } from './dto/create-role.input';
import type { UpdateRoleInput } from './dto/update-role.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  findAll(): Promise<RoleRecord[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<RoleRecord> {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} não encontrada`);
    return role;
  }

  create(input: CreateRoleInput): Promise<RoleRecord> {
    return this.repo.create({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });
  }

  async update(id: number, input: UpdateRoleInput): Promise<RoleRecord> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('Roles de sistema não podem ser editadas');
    return this.repo.update(id, {
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });
  }

  async delete(id: number): Promise<RoleRecord> {
    const role = await this.findById(id);
    if (role.isSystem) throw new ForbiddenException('Roles de sistema não podem ser deletadas');
    return this.repo.delete(id);
  }
}
