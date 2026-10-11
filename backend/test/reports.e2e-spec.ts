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

interface Breach {
  readonly workOrderId: number;
  readonly priority: string;
  readonly limitHours: number;
  readonly delayHours: number;
}

interface StockRow {
  readonly sparePartId: number;
  readonly quantity: number;
  readonly minimumStock: number;
  readonly belowMinimum: boolean;
  readonly consumed: number;
}

const WIDE = { from: '2025-01-01T03:00:00.000Z', to: '2026-12-31T23:00:00.000Z' };
const WIDE_QS = `from=${WIDE.from}&to=${WIDE.to}`;

describe('Relatórios (e2e)', () => {
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

  // ── SLA ──────────────────────────────────────────────────
  it('deve listar só OS com atraso positivo, do maior para o menor', async () => {
    // Act
    const body = await gql<{ slaBreaches: Breach[] }>(
      managerToken,
      `query($filter: DashboardFilterInput) {
        slaBreaches(filter: $filter) { workOrderId priority limitHours delayHours }
      }`,
      { filter: WIDE },
    );

    // Assert
    expect(body.errors).toBeUndefined();
    const breaches = body.data!.slaBreaches;
    for (const b of breaches) expect(b.delayHours).toBeGreaterThan(0);
    const delays = breaches.map((b) => b.delayHours);
    expect(delays).toEqual([...delays].sort((a, b) => b - a));
  });

  it('deve bater a lista de estouros com o % de SLA do mesmo período', async () => {
    // Act
    const body = await gql<{ slaBreaches: Breach[]; dashboardSlaRate: { withinSla: number; total: number } }>(
      managerToken,
      `query($filter: DashboardFilterInput) {
        slaBreaches(filter: $filter) { workOrderId }
        dashboardSlaRate(filter: $filter) { withinSla total }
      }`,
      { filter: WIDE },
    );

    // Assert
    const { slaBreaches, dashboardSlaRate } = body.data!;
    expect(slaBreaches.length).toBe(dashboardSlaRate.total - dashboardSlaRate.withinSla);
  });

  // ── Estoque ──────────────────────────────────────────────
  it('deve trazer todas as peças abaixo do mínimo e o consumo do período', async () => {
    // Act
    const body = await gql<{ stockReport: StockRow[] }>(
      managerToken,
      `query($filter: DashboardFilterInput) {
        stockReport(filter: $filter) { sparePartId quantity minimumStock belowMinimum consumed }
      }`,
      { filter: WIDE },
    );

    // Assert
    expect(body.errors).toBeUndefined();
    const rows = body.data!.stockReport;
    const below = await prisma.sparePart.count({
      where: { deletedAt: null, quantity: { lt: prisma.sparePart.fields.minimumStock } },
    });
    expect(rows.filter((r) => r.belowMinimum)).toHaveLength(below);

    const consumed = await prisma.workOrderPart.aggregate({
      where: {
        workOrder: {
          status: 'COMPLETED',
          deletedAt: null,
          completedAt: { gte: new Date(WIDE.from), lte: new Date(WIDE.to) },
        },
      },
      _sum: { quantityUsed: true },
    });
    expect(rows.reduce((sum, r) => sum + r.consumed, 0)).toBe(consumed._sum.quantityUsed ?? 0);
  });

  // ── Tabela de OS com período ─────────────────────────────
  it('deve filtrar a listagem de OS pela data de abertura', async () => {
    // Arrange
    const from = '2025-04-01T03:00:00.000Z';
    const to = '2025-06-30T23:00:00.000Z';

    // Act
    const body = await gql<{ workOrders: { edges: { node: { id: number } }[] } }>(
      managerToken,
      `query($filter: WorkOrdersFilterInput) {
        workOrders(filter: $filter, first: 100) { edges { node { id } } }
      }`,
      { filter: { from, to } },
    );

    // Assert
    expect(body.errors).toBeUndefined();
    const expected = await prisma.workOrder.count({
      where: { deletedAt: null, createdAt: { gte: new Date(from), lte: new Date(to) } },
    });
    expect(body.data!.workOrders.edges).toHaveLength(expected);
  });

  // ── Exportações ──────────────────────────────────────────
  it.each([
    ['reliability', 'confiabilidade', 'Ativo;MTTR (h);MTBF (h)'],
    ['sla-breaches', 'sla-estourado', 'Nº;Título;Ativo (tag)'],
    ['stock-consumption', 'consumo-de-pecas', 'Código;Peça;Saldo atual'],
  ])('deve exportar %s em CSV com cabeçalho e nome datado', async (path, file, header) => {
    // Act
    const res = await request(app.getHttpServer())
      .get(`/export/${path}?format=csv&${WIDE_QS}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    // Assert
    expect(res.headers['content-disposition']).toContain(`${file}_2025-01-01_2026-12-31.csv`);
    expect(res.text).toContain(header);
  });

  it('deve exportar em XLSX', async () => {
    // Act
    const res = await request(app.getHttpServer())
      .get(`/export/sla-breaches?format=xlsx&${WIDE_QS}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    // Assert
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('deve recusar filtro desconhecido nas exportações de relatório', async () => {
    await request(app.getHttpServer())
      .get('/export/reliability?format=csv&hack=1')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);
  });

  // ── Permissões ───────────────────────────────────────────
  it('deve negar relatórios a quem não tem dashboard.read', async () => {
    // Act
    const body = await gql(techToken, '{ slaBreaches { workOrderId } stockReport { sparePartId } }');

    // Assert
    expect(body.errors?.[0]?.message).toMatch(/Forbidden/i);
    for (const path of ['reliability', 'sla-breaches', 'stock-consumption']) {
      await request(app.getHttpServer())
        .get(`/export/${path}?format=csv`)
        .set('Authorization', `Bearer ${techToken}`)
        .expect(403);
    }
  });
});
