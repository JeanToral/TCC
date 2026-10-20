import { Test, type TestingModule } from '@nestjs/testing';

import { PERMISSION_KEY } from '../../common/decorators/requires-permission.decorator';
import { AuditLogResolver } from './audit-log.resolver';
import { AuditLogService } from './audit-log.service';
import type { AuditLogConnection } from './dto/audit-log-connection.type';

const emptyPage: AuditLogConnection = {
  edges: [],
  pageInfo: { hasNextPage: false, endCursor: null },
};

describe('AuditLogResolver', () => {
  let resolver: AuditLogResolver;
  let service: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogResolver,
        {
          provide: AuditLogService,
          useValue: {
            findPaginated: jest.fn(),
          } satisfies Partial<jest.Mocked<AuditLogService>>,
        },
      ],
    }).compile();

    resolver = module.get(AuditLogResolver);
    service = module.get(AuditLogService);
  });

  it('deve exigir a permissão auditlog.read', () => {
    // Arrange
    const handler: unknown = Object.getOwnPropertyDescriptor(
      AuditLogResolver.prototype,
      'auditLogs',
    )?.value;

    // Act
    const required: unknown = Reflect.getMetadata(
      PERMISSION_KEY,
      handler as object,
    );

    // Assert
    expect(required).toBe('auditlog.read');
  });

  it('deve delegar filtros e cursor ao service', async () => {
    // Arrange
    service.findPaginated.mockResolvedValue(emptyPage);

    // Act
    const result = await resolver.auditLogs(
      'Role',
      3,
      'role.update',
      25,
      'abc',
    );

    // Assert
    expect(result).toBe(emptyPage);
    expect(service.findPaginated).toHaveBeenCalledWith(
      { targetType: 'Role', targetId: 3, action: 'role.update' },
      25,
      'abc',
    );
  });

  it('deve limitar o tamanho da página entre 1 e 100', async () => {
    // Arrange
    service.findPaginated.mockResolvedValue(emptyPage);

    // Act
    await resolver.auditLogs(undefined, undefined, undefined, 5000);
    await resolver.auditLogs(undefined, undefined, undefined, 0);

    // Assert
    expect(service.findPaginated).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      100,
      undefined,
    );
    expect(service.findPaginated).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      1,
      undefined,
    );
  });
});
