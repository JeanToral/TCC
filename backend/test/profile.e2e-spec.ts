import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Depende do banco de desenvolvimento com o seed aplicado (role Technician).
// Rode `pnpm seed` antes de `pnpm test:e2e`.

const TEMP_EMAIL = 'e2e-perfil@cmms.local';
const TEMP_EMAIL_NEW = 'e2e-perfil-novo@cmms.local';
const TEMP_PASSWORD = 'e2e-senha-123';
const TEMP_NAME = 'E2E Perfil';

interface GqlResponse<T> {
  readonly data?: T | null;
  readonly errors?: readonly { readonly message: string }[];
}

interface ProfileData {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: { readonly name: string };
}

describe('Meu perfil (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: number;
  let token: string;

  async function gql<T>(query: string, variables: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    return { status: res.status, body: res.body as GqlResponse<T> };
  }

  const UPDATE = `
    mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
      updateMyProfile(input: $input) { id name email role { name } }
    }
  `;

  async function waitForAudit(action: string) {
    for (let i = 0; i < 20; i++) {
      const entry = await prisma.auditLog.findFirst({
        where: { userId, action },
        orderBy: { id: 'desc' },
      });
      if (entry) return entry;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
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

    const technician = await prisma.role.findUniqueOrThrow({ where: { name: 'Technician' } });
    await prisma.user.deleteMany({ where: { email: { in: [TEMP_EMAIL, TEMP_EMAIL_NEW] } } });
    const user = await prisma.user.create({
      data: {
        name: TEMP_NAME,
        email: TEMP_EMAIL,
        passwordHash: await bcrypt.hash(TEMP_PASSWORD, 10),
        roleId: technician.id,
      },
    });
    userId = user.id;

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation { login(input: { email: "${TEMP_EMAIL}", password: "${TEMP_PASSWORD}" }) { accessToken } }`,
      })
      .expect(200);
    token = (res.body as GqlResponse<{ login: { accessToken: string } }>).data!.login.accessToken;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('deve exigir autenticação em me', async () => {
    // Act
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ me { id } }' });

    // Assert
    expect((res.body as GqlResponse<unknown>).errors?.[0]?.message).toMatch(/Unauthorized/i);
  });

  it('deve devolver o próprio cadastro em me, mesmo sem user.read', async () => {
    // Act
    const { body } = await gql<{ me: ProfileData }>('{ me { id name email role { name } } }');

    // Assert
    expect(body.errors).toBeUndefined();
    expect(body.data?.me).toEqual({
      id: userId,
      name: TEMP_NAME,
      email: TEMP_EMAIL,
      role: { name: 'Technician' },
    });
  });

  it('deve permitir ao Technician alterar o próprio nome e registrar AuditLog', async () => {
    // Act
    const { body } = await gql<{ updateMyProfile: ProfileData }>(UPDATE, {
      input: { name: 'E2E Perfil Renomeado' },
    });

    // Assert
    expect(body.errors).toBeUndefined();
    expect(body.data?.updateMyProfile.name).toBe('E2E Perfil Renomeado');
    const audit = await waitForAudit('user.updateSelf');
    expect(audit?.targetId).toBe(userId);
    expect(audit?.before).toMatchObject({ name: TEMP_NAME });
    expect(audit?.after).toMatchObject({ name: 'E2E Perfil Renomeado' });
  });

  it('deve exigir a senha atual para trocar o e-mail', async () => {
    // Act
    const { body } = await gql(UPDATE, { input: { email: TEMP_EMAIL_NEW } });

    // Assert
    expect(body.errors?.[0]?.message).toBe('Informe a senha atual para alterar o e-mail');
  });

  it('deve rejeitar senha atual errada', async () => {
    // Act
    const { body } = await gql(UPDATE, {
      input: { email: TEMP_EMAIL_NEW, currentPassword: 'senha-errada' },
    });

    // Assert
    expect(body.errors?.[0]?.message).toBe('Senha atual incorreta');
  });

  it('deve rejeitar e-mail de outro usuário', async () => {
    // Act
    const { body } = await gql(UPDATE, {
      input: { email: 'manager@cmms.com', currentPassword: TEMP_PASSWORD },
    });

    // Assert
    expect(body.errors?.[0]?.message).toBe('E-mail já cadastrado');
  });

  it('não deve aceitar campos fora de nome e e-mail', async () => {
    // Act
    const { body } = await gql(UPDATE, { input: { name: 'Hack', roleId: 1 } });

    // Assert
    expect(body.errors?.[0]?.message).toMatch(/roleId/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.name).not.toBe('Hack');
  });

  it('não deve aceitar id para alterar outro usuário', async () => {
    // Act
    const { body } = await gql(
      `mutation { updateMyProfile(id: 1, input: { name: "Hack" }) { id } }`,
    );

    // Assert
    expect(body.errors?.[0]?.message).toMatch(/id/);
  });

  it('deve trocar o e-mail com a senha atual correta', async () => {
    // Act
    const { body } = await gql<{ updateMyProfile: ProfileData }>(UPDATE, {
      input: { email: TEMP_EMAIL_NEW, currentPassword: TEMP_PASSWORD },
    });

    // Assert
    expect(body.errors).toBeUndefined();
    expect(body.data?.updateMyProfile.email).toBe(TEMP_EMAIL_NEW);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.email).toBe(TEMP_EMAIL_NEW);
  });
});
