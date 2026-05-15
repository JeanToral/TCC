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

export interface CreateRoleData {
  readonly name: string;
  readonly description?: string;
  readonly permissions: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

// ─────────────────────── Constants ──────────────────────
const ROLE_SELECT = {
  id: true,
  name: true,
  description: true,
  permissions: true,
  isSystem: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RoleRecord[]> {
    return this.prisma.role.findMany({
      select: ROLE_SELECT,
      orderBy: { name: 'asc' },
    }) as Promise<RoleRecord[]>;
  }

  findById(id: number): Promise<RoleRecord | null> {
    return this.prisma.role.findUnique({
      where: { id },
      select: ROLE_SELECT,
    }) as Promise<RoleRecord | null>;
  }

  create(data: CreateRoleData): Promise<RoleRecord> {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      },
      select: ROLE_SELECT,
    }) as Promise<RoleRecord>;
  }

  update(id: number, data: UpdateRoleData): Promise<RoleRecord> {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      },
      select: ROLE_SELECT,
    }) as Promise<RoleRecord>;
  }

  delete(id: number): Promise<RoleRecord> {
    return this.prisma.role.delete({
      where: { id },
      select: ROLE_SELECT,
    }) as Promise<RoleRecord>;
  }
}
