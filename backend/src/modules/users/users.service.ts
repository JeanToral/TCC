// ─────────────────────── Imports ────────────────────────
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuditLogService } from '../audit-log/audit-log.service';
import { type UserRecord, UsersRepository } from './users.repository';
import type { CreateUserInput } from './dto/create-user.input';
import type { UpdateUserInput } from './dto/update-user.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditLogService,
  ) {}

  findAll(): Promise<UserRecord[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<UserRecord> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return user;
  }

  async create(input: CreateUserInput, actorId: number): Promise<UserRecord> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.repo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
    });

    this.audit.log(actorId, 'user.create', 'User', user.id, null, {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
    });

    return user;
  }

  async update(id: number, input: UpdateUserInput, actorId: number): Promise<UserRecord> {
    const before = await this.findById(id);

    if (actorId === id && input.roleId !== undefined) {
      throw new ForbiddenException('Usuários não podem alterar o próprio role');
    }

    if (input.email) {
      const conflict = await this.repo.findByEmail(input.email);
      if (conflict && conflict.id !== id) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      isActive?: boolean;
      roleId?: number;
    } = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.roleId !== undefined) data.roleId = input.roleId;
    if (input.password !== undefined) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }

    const after = await this.repo.update(id, data);

    this.audit.log(actorId, 'user.update', 'User', id,
      { name: before.name, email: before.email, roleId: before.roleId, isActive: before.isActive },
      { name: after.name, email: after.email, roleId: after.roleId, isActive: after.isActive },
    );

    return after;
  }

  async remove(id: number, actorId: number): Promise<UserRecord> {
    const user = await this.findById(id);
    const deleted = await this.repo.softDelete(id);

    this.audit.log(actorId, 'user.delete', 'User', id,
      { name: user.name, email: user.email, roleId: user.roleId },
      null,
    );

    return deleted;
  }
}
