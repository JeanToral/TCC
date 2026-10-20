// ─────────────────────── Imports ────────────────────────
import { Injectable, Logger } from '@nestjs/common';

import { encodeCursor } from '../../common/pagination/page-args';
import {
  type AuditLogFilter,
  type AuditLogWithUserRecord,
  AuditLogRepository,
} from './audit-log.repository';
import type { AuditLogConnection } from './dto/audit-log-connection.type';
import type { AuditLogType } from './dto/audit-log.type';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly repo: AuditLogRepository) {}

  log(
    userId: number,
    action: string,
    targetType: string,
    targetId: number,
    before?: unknown,
    after?: unknown,
  ): void {
    this.repo
      .create({ userId, action, targetType, targetId, before, after })
      .catch((err: unknown) =>
        this.logger.error(
          `AuditLog failed: ${action} on ${targetType}#${targetId}`,
          err,
        ),
      );
  }

  async findPaginated(
    filter: AuditLogFilter | undefined,
    first: number,
    after?: string,
  ): Promise<AuditLogConnection> {
    const { items, hasNextPage } = await this.repo.findPaginated(
      filter,
      first,
      after,
    );
    const edges = items.map((item) => ({
      node: toAuditLogType(item),
      cursor: encodeCursor(item.id),
    }));
    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
    };
  }
}

// before/after são Json no banco, mas String no GraphQL.
function toAuditLogType(record: AuditLogWithUserRecord): AuditLogType {
  return {
    ...record,
    before: serializeJson(record.before),
    after: serializeJson(record.after),
  };
}

function serializeJson(value: unknown): string | undefined {
  return value === null || value === undefined
    ? undefined
    : JSON.stringify(value);
}
