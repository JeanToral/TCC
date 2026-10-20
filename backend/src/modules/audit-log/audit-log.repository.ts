// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { decodeCursor } from '../../common/pagination/page-args';
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

export interface AuditLogWithUserRecord extends AuditLogRecord {
  readonly user: {
    readonly id: number;
    readonly name: string;
    readonly email: string;
  };
}

export interface AuditLogFilter {
  readonly targetType?: string;
  readonly targetId?: number;
  readonly action?: string;
}

const AUDIT_LOG_SELECT = {
  id: true,
  userId: true,
  action: true,
  targetType: true,
  targetId: true,
  before: true,
  after: true,
  createdAt: true,
} as const;

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
      select: AUDIT_LOG_SELECT,
    });
  }

  async findPaginated(
    filter: AuditLogFilter | undefined,
    first: number,
    after?: string,
  ): Promise<{ items: AuditLogWithUserRecord[]; hasNextPage: boolean }> {
    const cursorId = after ? decodeCursor(after) : undefined;

    const rows = (await this.prisma.auditLog.findMany({
      where: buildWhere(filter),
      select: {
        ...AUDIT_LOG_SELECT,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: 'desc' },
      take: first + 1,
      ...(cursorId !== undefined ? { cursor: { id: cursorId }, skip: 1 } : {}),
    })) as AuditLogWithUserRecord[];

    const hasNextPage = rows.length > first;
    return { items: hasNextPage ? rows.slice(0, first) : rows, hasNextPage };
  }
}

function buildWhere(filter?: AuditLogFilter) {
  return {
    ...(filter?.targetType ? { targetType: filter.targetType } : {}),
    ...(filter?.targetId !== undefined ? { targetId: filter.targetId } : {}),
    ...(filter?.action ? { action: filter.action } : {}),
  };
}
