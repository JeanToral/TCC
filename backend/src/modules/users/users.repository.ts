// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface RoleRecord {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: unknown;
  readonly isSystem: boolean;
}

export interface UserRecord {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleId: number;
  readonly role: RoleRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

interface CreateData {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly roleId: number;
}

interface UpdateData {
  name?: string;
  email?: string;
  passwordHash?: string;
  isActive?: boolean;
  roleId?: number;
}

// ─────────────────────── Constants ──────────────────────
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      isSystem: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as Promise<UserRecord[]>;
  }

  findById(id: number): Promise<UserRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    }) as Promise<UserRecord | null>;
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: USER_SELECT,
    }) as Promise<UserRecord | null>;
  }

  findManyByIds(ids: number[]): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: USER_SELECT,
    }) as Promise<UserRecord[]>;
  }

  create(data: CreateData): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: { connect: { id: data.roleId } },
      },
      select: USER_SELECT,
    }) as Promise<UserRecord>;
  }

  update(id: number, data: UpdateData): Promise<UserRecord> {
    const { roleId, ...rest } = data;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(roleId ? { role: { connect: { id: roleId } } } : {}),
      },
      select: USER_SELECT,
    }) as Promise<UserRecord>;
  }

  softDelete(id: number): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: USER_SELECT,
    }) as Promise<UserRecord>;
  }

  findAllRoles(): Promise<RoleRecord[]> {
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
      },
      orderBy: { name: 'asc' },
    }) as Promise<RoleRecord[]>;
  }
}
