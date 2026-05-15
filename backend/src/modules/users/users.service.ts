// ─────────────────────── Imports ────────────────────────
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { type UserRecord, UsersRepository } from './users.repository';
import type { CreateUserInput } from './dto/create-user.input';
import type { UpdateUserInput } from './dto/update-user.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findAll(): Promise<UserRecord[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<UserRecord> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return user;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.repo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
    });
  }

  async update(id: number, input: UpdateUserInput): Promise<UserRecord> {
    await this.findById(id);

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

    return this.repo.update(id, data);
  }

  async remove(id: number): Promise<UserRecord> {
    await this.findById(id);
    return this.repo.softDelete(id);
  }

}
