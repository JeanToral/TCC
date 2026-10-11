import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Depende do banco de desenvolvimento com o seed aplicado.
// Rode `pnpm seed` antes de `pnpm test:e2e`.

interface GqlResponse<T> {
  readonly data?: T | null;
  readonly errors?: readonly { readonly message: string }[];
}

interface TrendPoint {
  readonly month: string;
  readonly opened: number;
  readonly completed: number;
  readonly completedCorrective: number;
  readonly completedPreventive: number;
  readonly slaPercentage: number | null;
}

interface CostPoint {
  readonly month: string;
  readonly corrective: number;
  readonly preventive: number;
  readonly total: number;
}

const STATUS_COUNTS = `
  query($filter: DashboardFilterInput) { dashboardStatusCounts(filter: $filter) { status count } }
`;
const MONTHLY_TREND = `
  query($filter: DashboardFilterInput) {
    dashboardMonthlyTrend(filter: $filter) {
      month opened completed completedCorrective completedPreventive slaPercentage
    }
  }
`;
const MONTHLY_COSTS = `
  query($filter: FinanceFilterInput) { monthlyCosts(filter: $filter) { month corrective preventive total } }
`;

// Janela larga o bastante para cobrir as OS do seed (2025–2026).
const WIDE = { from: '2025-01-01T03:00:00.000Z', to: '2026-12-31T23:00:00.000Z' };

describe('Gráficos do dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken: string;
  let techToken: string;

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation { login(input: { email: "${email}", password: "${password}" }) { accessToken } }`,
      })
      .expect(200);
    return (res.body as GqlResponse<{ login: { accessToken: string } }>).data!.login.accessToken;
  }

  async function gql<T>(token: string, query: string, variables: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    return res.body as GqlResponse<T>;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    managerToken = await login('manager@cmms.com', 'manager123');
    techToken = await login('tech@cmms.com', 'tech123');
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Status ───────────────────────────────────────────────
  it('deve contar as OS do período por status, na ordem do fluxo', async () => {
    // Act
    const body = await gql<{ dashboardStatusCounts: { status: string; count: number }[] }>(
      managerToken,
      STATUS_COUNTS,
      { filter: WIDE },
    );

    // Assert
    expect(body.errors).toBeUndefined();
    const counts = body.data!.dashboardStatusCounts;
    expect(counts.map((c) => c.status)).toEqual([
      'REQUESTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED',
    ]);
    const expected = await prisma.workOrder.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(WIDE.from), lte: new Date(WIDE.to) },
      },
    });
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(expected);
  });

  // ── Série mensal ─────────────────────────────────────────
  it('deve devolver 6 meses quando nenhum período é informado', async () => {
    // Act
    const body = await gql<{ dashboardMonthlyTrend: TrendPoint[] }>(managerToken, MONTHLY_TREND);

    // Assert
    expect(body.errors).toBeUndefined();
    expect(body.data!.dashboardMonthlyTrend).toHaveLength(6);
  });

  it('deve bater a soma de concluídas com o banco e separar por tipo', async () => {
    // Act
    const body = await gql<{ dashboardMonthlyTrend: TrendPoint[] }>(
      managerToken,
      MONTHLY_TREND,
      { filter: WIDE },
    );

    // Assert
    const points = body.data!.dashboardMonthlyTrend;
    expect(points).toHaveLength(24);
    const completed = points.reduce((sum, p) => sum + p.completed, 0);
    const expected = await prisma.workOrder.count({
      where: {
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: new Date(WIDE.from), lte: new Date(WIDE.to) },
      },
    });
    expect(completed).toBe(expected);
    for (const p of points) {
      expect(p.completedCorrective + p.completedPreventive).toBe(p.completed);
    }
  });

  it('deve filtrar a série por ativo', async () => {
    // Arrange
    const asset = await prisma.asset.findFirstOrThrow({ where: { deletedAt: null } });

    // Act
    const body = await gql<{ dashboardMonthlyTrend: TrendPoint[] }>(
      managerToken,
      MONTHLY_TREND,
      { filter: { ...WIDE, assetId: asset.id } },
    );

    // Assert
    const opened = body.data!.dashboardMonthlyTrend.reduce((sum, p) => sum + p.opened, 0);
    const expected = await prisma.workOrder.count({
      where: {
        deletedAt: null,
        assetId: asset.id,
        createdAt: { gte: new Date(WIDE.from), lte: new Date(WIDE.to) },
      },
    });
    expect(opened).toBe(expected);
  });

  it('deve rejeitar período invertido', async () => {
    // Act
    const body = await gql(managerToken, MONTHLY_TREND, {
      filter: { from: WIDE.to, to: WIDE.from },
    });

    // Assert
    expect(body.errors?.[0]?.message).toBe('O início do período deve ser anterior ao fim');
  });

  // ── Custo ────────────────────────────────────────────────
  it('deve devolver o custo mensal com total = corretiva + preventiva', async () => {
    // Act
    const body = await gql<{ monthlyCosts: CostPoint[] }>(managerToken, MONTHLY_COSTS, {
      filter: WIDE,
    });

    // Assert
    expect(body.errors).toBeUndefined();
    for (const p of body.data!.monthlyCosts) {
      expect(p.total).toBeCloseTo(p.corrective + p.preventive, 6);
    }
  });

  // ── Permissões ───────────────────────────────────────────
  it('deve negar as séries do dashboard a quem não tem dashboard.read', async () => {
    // Act
    const status = await gql(techToken, STATUS_COUNTS);
    const trend = await gql(techToken, MONTHLY_TREND);

    // Assert
    expect(status.errors?.[0]?.message).toMatch(/Forbidden/i);
    expect(trend.errors?.[0]?.message).toMatch(/Forbidden/i);
  });

  it('deve negar o custo mensal a quem não tem cost.read', async () => {
    // Act
    const body = await gql(techToken, MONTHLY_COSTS);

    // Assert
    expect(body.errors?.[0]?.message).toMatch(/Forbidden/i);
  });
});
