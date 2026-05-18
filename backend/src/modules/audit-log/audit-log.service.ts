// ─────────────────────── Imports ────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { type AuditLogRecord, AuditLogRepository } from './audit-log.repository';

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
        this.logger.error(`AuditLog failed: ${action} on ${targetType}#${targetId}`, err),
      );
  }

  findAll(filter?: { targetType?: string; targetId?: number }): Promise<AuditLogRecord[]> {
    return this.repo.findAll(filter);
  }
}
