import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { FinanceService } from '../src/modules/finance/finance.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Depende do banco de desenvolvimento com o seed aplicado.
// Rode `pnpm seed` antes de `pnpm test:e2e`.

const TEMP_EMAIL = 'e2e-sem-permissao@cmms.local';
const TEMP_ROLE = 'E2E sem leitura de OS';
const TEMP_PASSWORD = 'e2e-senha-123';

async function login(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/graphql')
    .send({
      query: `mutation { login(input: { email: "${email}", password: "${password}" }) { accessToken } }`,
    })
    .expect(200);
  const token = (res.body as { data?: { login?: { accessToken?: string } } })
    .data?.login?.accessToken;
  if (!token)
    throw new Error(`login falhou para ${email}: ${JSON.stringify(res.body)}`);
  return token;
}

/** supertest entrega o corpo binário como Buffer só com um parser explícito. */
function binaryParser(
  res: NodeJS.ReadableStream & { setEncoding: (e: string) => void },
  cb: (err: Error | null, body: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('Exportação de planilhas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken: string;
  let techToken: string;
  let noReadToken: string;
  let totalWorkOrders: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Espelha main.ts — a validação dos query params depende disso.
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const role = await prisma.role.upsert({
      where: { name: TEMP_ROLE },
      update: { permissions: ['dashboard.read'] },
      create: { name: TEMP_ROLE, permissions: ['dashboard.read'] },
    });
    await prisma.user.upsert({
      where: { email: TEMP_EMAIL },
      update: { roleId: role.id, isActive: true, deletedAt: null },
      create: {
        name: 'E2E sem permissão',
        email: TEMP_EMAIL,
        passwordHash: await bcrypt.hash(TEMP_PASSWORD, 10),
        roleId: role.id,
      },
    });

    managerToken = await login(app, 'manager@cmms.com', 'manager123');
    techToken = await login(app, 'tech@cmms.com', 'tech123');
    noReadToken = await login(app, TEMP_EMAIL, TEMP_PASSWORD);

    totalWorkOrders = await prisma.workOrder.count({
      where: { deletedAt: null },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEMP_EMAIL } });
    await prisma.role.deleteMany({ where: { name: TEMP_ROLE } });
    await app.close();
  });

  // ── Autenticação e autorização ───────────────────────────
  it('deve retornar 401 sem token', async () => {
    await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .expect(401);
  });

  it('não deve aceitar o cookie de refresh como credencial', async () => {
    await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Cookie', 'refresh_token=qualquer-coisa')
      .expect(401);
  });

  it('deve retornar 403 sem a permissão workorder.read', async () => {
    await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${noReadToken}`)
      .expect(403);
  });

  it('deve retornar 400 para formato inválido', async () => {
    await request(app.getHttpServer())
      .get('/export/work-orders?format=pdf')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);
  });

  it('deve retornar 400 para filtro desconhecido', async () => {
    await request(app.getHttpServer())
      .get('/export/work-orders?format=csv&hack=1')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);
  });

  // ── CSV ──────────────────────────────────────────────────
  it('deve devolver CSV com cabeçalhos e nome de arquivo datado', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="ordens-de-servico_\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('deve começar com BOM e usar ; no cabeçalho', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const body = res.body as Buffer;
    expect(body.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(body.toString('utf8')).toContain('Nº;Título;Ativo (tag)');
  });

  it('deve exportar todas as OS do filtro, ignorando a paginação de 20', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const lines = (res.body as Buffer).toString('utf8').trimEnd().split('\r\n');
    // 1 linha de cabeçalho + uma por OS
    expect(lines.length - 1).toBe(totalWorkOrders);
  });

  it('deve aplicar o filtro de status', async () => {
    const completed = await prisma.workOrder.count({
      where: { deletedAt: null, status: 'COMPLETED' },
    });

    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv&status=COMPLETED')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const lines = (res.body as Buffer).toString('utf8').trimEnd().split('\r\n');
    expect(lines.length - 1).toBe(completed);
  });

  it('deve omitir colunas de custo para usuário sem cost.read', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${techToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const header = (res.body as Buffer).toString('utf8').split('\r\n')[0];
    expect(header).not.toContain('Custo');
    expect(header).not.toContain('Cobertura');
  });

  it('deve incluir colunas de custo para usuário com cost.read', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=csv')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    const header = (res.body as Buffer).toString('utf8').split('\r\n')[0];
    expect(header).toContain('Custo total');
    expect(header).toContain('Cobertura de custo');
  });

  // ── XLSX ─────────────────────────────────────────────────
  it('deve devolver um XLSX válido com uma linha por OS', async () => {
    const res = await request(app.getHttpServer())
      .get('/export/work-orders?format=xlsx')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as Buffer);
    const sheet = wb.getWorksheet('Dados')!;

    expect(sheet.actualRowCount - 1).toBe(totalWorkOrders);
    expect(wb.getWorksheet('Sobre')).toBeDefined();
  });

  // ── Custos por ativo ─────────────────────────────────────
  describe('GET /export/asset-costs', () => {
    it('deve retornar 403 sem a permissão cost.read', async () => {
      await request(app.getHttpServer())
        .get('/export/asset-costs?format=csv')
        .set('Authorization', `Bearer ${techToken}`)
        .expect(403);
    });

    it('deve exportar uma linha por ativo no relatório de custos', async () => {
      // Arrange
      const assets = await app.get(FinanceService).getAssetCosts({});

      // Act
      const res = await request(app.getHttpServer())
        .get('/export/asset-costs?format=csv')
        .set('Authorization', `Bearer ${managerToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      // Assert — cabeçalho + uma por ativo + totais
      const lines = (res.body as Buffer)
        .toString('utf8')
        .trimEnd()
        .split('\r\n');
      expect(assets.length).toBeGreaterThan(0);
      expect(lines.length - 2).toBe(assets.length);
      expect(res.headers['content-disposition']).toMatch(
        /filename="custos-por-ativo_/,
      );
    });

    it('deve incluir linha de totais no relatório de custos', async () => {
      // Arrange
      const assets = await app.get(FinanceService).getAssetCosts({});
      const expected = assets.reduce((sum, a) => sum + a.realizedTotal, 0);

      // Act
      const res = await request(app.getHttpServer())
        .get('/export/asset-costs?format=xlsx')
        .set('Authorization', `Bearer ${managerToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as Buffer);
      const sheet = wb.getWorksheet('Dados')!;
      const header = sheet.getRow(1).values as unknown[];
      const last = sheet.getRow(sheet.actualRowCount);

      // Assert
      expect(last.getCell(1).value).toBe('TOTAL');
      expect(last.getCell(header.indexOf('Custo total')).value).toBeCloseTo(
        expected,
        2,
      );
    });

    it('deve declarar a cobertura na aba de metadados', async () => {
      // Act
      const res = await request(app.getHttpServer())
        .get('/export/asset-costs?format=xlsx')
        .set('Authorization', `Bearer ${managerToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as Buffer);
      const notes = wb.getWorksheet('Sobre')!.getColumn(2).values;

      // Assert
      expect(
        notes.some((v) => typeof v === 'string' && v.startsWith('Cobertura')),
      ).toBe(true);
    });
  });

  // ── Estoque de peças ─────────────────────────────────────
  describe('GET /export/spare-parts', () => {
    it('deve retornar 403 sem a permissão sparepart.read', async () => {
      await request(app.getHttpServer())
        .get('/export/spare-parts?format=csv')
        .set('Authorization', `Bearer ${noReadToken}`)
        .expect(403);
    });

    it('deve retornar 400 para lowStockOnly não booleano', async () => {
      await request(app.getHttpServer())
        .get('/export/spare-parts?format=csv&lowStockOnly=talvez')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);
    });

    it('deve calcular valor total em estoque como quantity × unitCost', async () => {
      // Arrange
      const part = await prisma.sparePart.findFirstOrThrow({
        where: {
          deletedAt: null,
          unitCost: { not: null },
          quantity: { gt: 0 },
        },
      });

      // Act
      const res = await request(app.getHttpServer())
        .get('/export/spare-parts?format=xlsx')
        .set('Authorization', `Bearer ${managerToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as Buffer);
      const sheet = wb.getWorksheet('Dados')!;
      const header = sheet.getRow(1).values as unknown[];
      let row: ExcelJS.Row | undefined;
      sheet.eachRow((r) => {
        if (r.getCell(1).value === part.partNumber) row = r;
      });

      // Assert
      expect(row).toBeDefined();
      expect(
        row!.getCell(header.indexOf('Valor em estoque')).value,
      ).toBeCloseTo(part.quantity * part.unitCost!, 2);
      expect(sheet.getRow(sheet.actualRowCount).getCell(1).value).toBe('TOTAL');
    });

    it('deve omitir colunas de custo do estoque para usuário sem cost.read', async () => {
      // Act
      const res = await request(app.getHttpServer())
        .get('/export/spare-parts?format=csv')
        .set('Authorization', `Bearer ${techToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      const lines = (res.body as Buffer)
        .toString('utf8')
        .trimEnd()
        .split('\r\n');

      // Assert — sem custo também não há linha de totais
      expect(lines[0]).not.toContain('Custo unitário');
      expect(lines[0]).not.toContain('Valor em estoque');
      expect(lines.at(-1)).not.toMatch(/^TOTAL;/);
    });

    it('deve filtrar apenas peças em estoque baixo quando lowStockOnly=true', async () => {
      // Arrange — mesma regra da notificação LOW_STOCK
      const lowStock = await prisma.sparePart.count({
        where: {
          deletedAt: null,
          quantity: { lt: prisma.sparePart.fields.minimumStock },
        },
      });

      // Act
      const res = await request(app.getHttpServer())
        .get('/export/spare-parts?format=csv&lowStockOnly=true')
        .set('Authorization', `Bearer ${techToken}`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      const lines = (res.body as Buffer)
        .toString('utf8')
        .trimEnd()
        .split('\r\n');

      // Assert
      expect(lines.length - 1).toBe(lowStock);
      expect(lines.slice(1).every((l) => l.endsWith(';Estoque baixo'))).toBe(
        true,
      );
    });
  });
});
