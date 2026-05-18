// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface AuditLogRecord {
  readonly id: number;
  readonly userId: number;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: number;
  readonly before: unknown;
  readonly after: unknown;
  readonly createdAt: Date;
}

export interface CreateAuditLogData {
  readonly userId: number;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: number;
  readonly before?: unknown;
  readonly after?: unknown;
}

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuditLogData): Promise<AuditLogRecord> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        before: data.before !== undefined ? (data.before as object) : undefined,
        after: data.after !== undefined ? (data.after as object) : undefined,
      },
      select: {
        id: true,
        userId: true,
        action: true,
        targetType: true,
        targetId: true,
        before: true,
        after: true,
        createdAt: true,
      },
    }) as Promise<AuditLogRecord>;
  }

  findAll(filter?: { targetType?: string; targetId?: number }): Promise<AuditLogRecord[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filter?.targetType ? { targetType: filter.targetType } : {}),
        ...(filter?.targetId !== undefined ? { targetId: filter.targetId } : {}),
      },
      select: {
        id: true,
        userId: true,
        action: true,
        targetType: true,
        targetId: true,
        before: true,
        after: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<AuditLogRecord[]>;
  }
}
