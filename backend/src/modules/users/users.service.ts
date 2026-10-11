// ─────────────────────── Imports ────────────────────────
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuditLogService } from '../audit-log/audit-log.service';
import { type UserRecord, UsersRepository } from './users.repository';
import type { CreateUserInput } from './dto/create-user.input';
import type { UpdateMyProfileInput } from './dto/update-my-profile.input';
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
      hourlyRate: input.hourlyRate,
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
      hourlyRate?: number | null;
    } = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.roleId !== undefined) data.roleId = input.roleId;
    if (input.hourlyRate !== undefined) data.hourlyRate = input.hourlyRate;
    if (input.password !== undefined) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }

    const after = await this.repo.update(id, data);

    this.audit.log(actorId, 'user.update', 'User', id,
      {
        name: before.name,
        email: before.email,
        roleId: before.roleId,
        isActive: before.isActive,
        hasHourlyRate: before.hourlyRate !== null,
      },
      {
        name: after.name,
        email: after.email,
        roleId: after.roleId,
        isActive: after.isActive,
        hasHourlyRate: after.hourlyRate !== null,
      },
    );

    return after;
  }

  /**
   * Autoedição de nome e e-mail. Sempre o usuário do token — nunca recebe id.
   * Trocar o e-mail exige a senha atual: ele é o login, e sem a confirmação quem
   * encontrar uma sessão aberta trancaria o dono fora da conta.
   * Senha errada é BadRequest, não Unauthorized: a sessão continua válida.
   */
  async updateMyProfile(userId: number, input: UpdateMyProfileInput): Promise<UserRecord> {
    const before = await this.findById(userId);

    const data: { name?: string; email?: string } = {};
    if (input.name !== undefined && input.name !== before.name) data.name = input.name;
    if (input.email !== undefined && input.email !== before.email) data.email = input.email;

    if (data.email !== undefined) {
      if (!input.currentPassword) {
        throw new BadRequestException('Informe a senha atual para alterar o e-mail');
      }
      const hash = await this.repo.findPasswordHash(userId);
      if (!hash || !(await bcrypt.compare(input.currentPassword, hash))) {
        throw new BadRequestException('Senha atual incorreta');
      }
      const conflict = await this.repo.findByEmail(data.email);
      if (conflict && conflict.id !== userId) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }

    if (Object.keys(data).length === 0) return before;

    const after = await this.repo.update(userId, data);

    this.audit.log(userId, 'user.updateSelf', 'User', userId,
      { name: before.name, email: before.email },
      { name: after.name, email: after.email },
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
