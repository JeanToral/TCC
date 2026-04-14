# CMMS — Prompt de Início de Desenvolvimento
> TCC: "Desenvolvimento de um Sistema Web para Gestão de Manutenção de Máquinas Industriais com Base nos Conceitos de CMMS"
> Autores: Fernando Camilo Schneider e Jean Carlo Toral
> Orientador: Prof. Me. Roberson Junior Fernandes Alves
> Instituição: Unoesc — Campus São Miguel do Oeste (SC), 2026

---

## 📌 Contexto do Projeto

Estou desenvolvendo um TCC cujo objetivo é transformar a manutenção industrial de uma atividade reativa em uma **unidade de negócio estratégica**, cobrindo o workflow completo de uma Ordem de Serviço:

```
Pedido de Manutenção → Aprovação → Planeamento/Agendamento → Execução → Registro de Dados
```

O sistema deve suportar gestão de ativos, ordens de serviço, manutenção preventiva, estoque de peças e geração automática de KPIs como MTBF e MTTR.

---

## 🛠️ Stack Obrigatória

| Camada | Tecnologia |
|---|---|
| Backend | NestJS (arquitetura modular) |
| Linguagem | TypeScript (strict mode) |
| API | GraphQL com Apollo Client |
| Banco de Dados | PostgreSQL via Prisma ORM |
| Frontend | React (componentização + dashboards) |
| Versionamento | GitHub |

---

## 🗄️ Schema Prisma (Entidades Principais)

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique       // "Sysadmin", "Manager", "Engineer", "Technician"
  description String?
  permissions Json                   // ["user.create", "workorder.approve", "*", ...]
  isSystem    Boolean  @default(false) // true = não pode ser editado nem deletado
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id                String         @id @default(uuid())
  name              String
  email             String         @unique
  passwordHash      String
  refreshTokenHash  String?        // hash do refresh token atual (null = sem sessão ativa)
  isActive          Boolean        @default(true)
  roleId            String
  role              Role           @relation(fields: [roleId], references: [id])
  requestedOrders   WorkOrder[]    @relation("RequestedBy")
  assignedOrders    WorkOrder[]    @relation("AssignedTo")
  comments          Comment[]
  notifications     Notification[]
  auditLogs         AuditLog[]
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

model AssetCategory {
  id          String   @id @default(uuid())
  name        String   @unique       // "Elétrico", "Mecânico", "Hidráulico", "Pneumático"
  description String?
  assets      Asset[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Asset {
  id                 String         @id @default(uuid())
  name               String
  serialNumber       String         @unique
  location           String
  status             AssetStatus    @default(OPERATIONAL)
  categoryId         String?
  category           AssetCategory? @relation(fields: [categoryId], references: [id])
  purchaseDate       DateTime?
  lastMaintenanceAt  DateTime?
  workOrders         WorkOrder[]
  preventivePlans    PreventivePlan[]
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  deletedAt          DateTime?      // soft delete — preserva histórico de KPIs
}

enum AssetStatus {
  OPERATIONAL
  UNDER_MAINTENANCE
  DECOMMISSIONED
}

model WorkOrder {
  id               String          @id @default(uuid())
  title            String
  description      String?
  type             WorkOrderType
  status           WorkOrderStatus @default(REQUESTED)
  priority         Priority        @default(MEDIUM)
  assetId          String
  asset            Asset           @relation(fields: [assetId], references: [id])
  requestedById    String
  requestedBy      User            @relation("RequestedBy", fields: [requestedById], references: [id])
  assignedToId     String?
  assignedTo       User?           @relation("AssignedTo", fields: [assignedToId], references: [id])
  scheduledAt      DateTime?
  startedAt        DateTime?
  completedAt      DateTime?
  laborCostMinutes Int?
  closingNotes     String?         // obrigatório ao mover para COMPLETED
  rejectionReason  String?         // obrigatório ao mover para REJECTED
  parts            WorkOrderPart[]
  comments         Comment[]
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  deletedAt        DateTime?       // soft delete — preserva histórico de KPIs
}

model Comment {
  id          String    @id @default(uuid())
  workOrderId String
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  body        String
  createdAt   DateTime  @default(now())
}

model PreventivePlan {
  id              String             @id @default(uuid())
  title           String
  description     String?
  assetId         String
  asset           Asset              @relation(fields: [assetId], references: [id])
  recurrenceType  RecurrenceType
  intervalDays    Int                // ex: 30 = mensal, 7 = semanal
  nextDueAt       DateTime
  lastTriggeredAt DateTime?
  isActive        Boolean            @default(true)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

enum RecurrenceType {
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM                             // usa intervalDays livremente
}

model Notification {
  id        String           @id @default(uuid())
  type      NotificationType
  message   String
  isRead    Boolean          @default(false)
  userId    String?          // null = broadcast para todos os managers
  user      User?            @relation(fields: [userId], references: [id])
  metadata  Json?            // ex: { sparePartId, quantity, minimumStock }
  createdAt DateTime         @default(now())
}

enum NotificationType {
  LOW_STOCK
  OVERDUE_WORK_ORDER
  PREVENTIVE_DUE
}

enum WorkOrderType {
  CORRECTIVE
  PREVENTIVE
}

enum WorkOrderStatus {
  REQUESTED
  APPROVED
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  REJECTED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model SparePart {
  id           String          @id @default(uuid())
  name         String
  partNumber   String          @unique
  quantity     Int             @default(0)
  minimumStock Int             @default(0)
  unitCost     Decimal
  workOrders   WorkOrderPart[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model WorkOrderPart {
  id            String    @id @default(uuid())
  workOrderId   String
  workOrder     WorkOrder @relation(fields: [workOrderId], references: [id])
  sparePartId   String
  sparePart     SparePart @relation(fields: [sparePartId], references: [id])
  quantityUsed  Int

  @@unique([workOrderId, sparePartId])
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String
  actor     User     @relation(fields: [actorId], references: [id])
  action    String   // "role.update", "user.update", "role.create", etc.
  resource  String   // "Role", "User"
  oldValue  Json?
  newValue  Json?
  createdAt DateTime @default(now())
}
```

---

## 🔐 Sistema de Permissões

### Padrão `resource.action`

As permissões seguem o padrão `resource.action` e são armazenadas como um array JSON dentro da tabela `Role`.

```
user.create         user.read         user.update         user.delete
role.create         role.read         role.update         role.delete
asset.create        asset.read        asset.update        asset.delete
workorder.create    workorder.read    workorder.update    workorder.delete
workorder.approve
sparepart.create    sparepart.read    sparepart.update    sparepart.delete
dashboard.read
auditlog.read
```

### Seed Obrigatório dos Roles

```typescript
const roles = [
  {
    name: "Sysadmin",
    isSystem: true,
    description: "Acesso total ao sistema",
    permissions: ["*"], // wildcard = todas as permissões
  },
  {
    name: "Manager",
    isSystem: false,
    description: "Aprovação de OS, KPIs e gestão de ativos",
    permissions: [
      "asset.create", "asset.read", "asset.update",
      "workorder.create", "workorder.read", "workorder.update", "workorder.approve",
      "sparepart.read", "sparepart.update",
      "user.read",
      "dashboard.read",
    ],
  },
  {
    name: "Engineer",
    isSystem: false,
    description: "Criação e edição de OS e planos preventivos",
    permissions: [
      "asset.read", "asset.update",
      "workorder.create", "workorder.read", "workorder.update",
      "sparepart.read", "sparepart.update",
      "dashboard.read",
    ],
  },
  {
    name: "Technician",
    isSystem: false,
    description: "Execução de OS e consulta de ativos",
    permissions: [
      "asset.read",
      "workorder.read", "workorder.update",
      "sparepart.read",
    ],
  },
]
```

### Guard de Permissão (NestJS)

```typescript
// Decorator de uso nos resolvers/controllers
@RequiresPermission('workorder.approve')
async approveWorkOrder(...) {}

// Lógica do PermissionGuard
@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = getRequest(context);
    const required = getRequiredPermission(context); // ex: "workorder.approve"
    const permissions: string[] = user.role.permissions;

    // Sysadmin com wildcard passa em tudo
    if (permissions.includes('*')) return true;

    return permissions.includes(required);
  }
}
```

---

## 👑 Painel Administrativo (Sysadmin)

Acesso exclusivo ao role com `isSystem: true`.

**Funcionalidades disponíveis:**
- Listar todos os roles e suas permissões atuais
- Adicionar ou remover permissões de um role (editando o JSON)
- Criar novos roles customizados
- Alterar o role de qualquer usuário
- Ativar/desativar usuários

**Regras críticas de proteção:**
- Roles com `isSystem: true` **não podem ser editados nem deletados**
- Nenhum usuário pode alterar o **próprio role** (nem o Sysadmin)
- Toda alteração em `Role` ou `User` pelo painel deve ser registrada na tabela `AuditLog`

---

## ⚙️ Arquitetura

Seguir **Clean Architecture**: isolar a lógica de negócio do framework e do ORM.

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.resolver.ts
│   │   ├── auth.service.ts           ← login, logout, refresh token
│   │   ├── jwt.strategy.ts
│   │   ├── dto/
│   │   │   ├── login.input.ts        ← @InputType()
│   │   │   └── auth-payload.type.ts  ← @ObjectType()
│   │   └── guards/
│   │       ├── jwt.guard.ts
│   │       └── permission.guard.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.resolver.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts       ← isola o Prisma
│   │   ├── users.loader.ts           ← DataLoader (N+1)
│   │   └── dto/
│   │       ├── create-user.input.ts
│   │       └── update-user.input.ts
│   ├── roles/
│   │   ├── roles.module.ts
│   │   ├── roles.resolver.ts
│   │   ├── roles.service.ts
│   │   ├── roles.repository.ts
│   │   └── dto/
│   ├── assets/
│   │   ├── assets.module.ts
│   │   ├── assets.resolver.ts
│   │   ├── assets.service.ts
│   │   ├── assets.repository.ts
│   │   ├── assets.loader.ts          ← DataLoader (N+1)
│   │   └── dto/
│   ├── work-orders/
│   │   ├── work-orders.module.ts
│   │   ├── work-orders.resolver.ts
│   │   ├── work-orders.service.ts    ← validação de transição de status + SLA
│   │   ├── work-orders.repository.ts
│   │   └── dto/
│   ├── preventive-plans/             ← módulo novo
│   │   ├── preventive-plans.module.ts
│   │   ├── preventive-plans.resolver.ts
│   │   ├── preventive-plans.service.ts
│   │   └── dto/
│   ├── spare-parts/
│   │   └── dto/
│   ├── notifications/                ← módulo novo
│   │   ├── notifications.module.ts
│   │   ├── notifications.resolver.ts ← inclui Subscription GraphQL
│   │   └── notifications.service.ts
│   ├── audit-log/
│   └── dashboard/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── common/
    ├── decorators/
    │   └── requires-permission.decorator.ts
    ├── guards/
    ├── pagination/
    │   └── page-args.ts              ← cursor-based pagination (padrão Relay)
    └── config/
        └── config.module.ts          ← @nestjs/config + validação Joi
```

---

## 🧪 TDD — Testes Iniciais Obrigatórios

Antes de implementar cada serviço, escrever os testes unitários correspondentes.

### WorkOrder Service

```typescript
describe('WorkOrderService', () => {
  it('deve criar uma OS válida vinculada a um ativo existente')
  it('deve rejeitar criação de OS sem ativo associado')
  it('deve rejeitar transição de status inválida (COMPLETED → REQUESTED)')
  it('deve permitir transição válida (APPROVED → SCHEDULED)')
  it('deve registrar startedAt ao mover para IN_PROGRESS')
  it('deve registrar completedAt ao mover para COMPLETED')
})
```

### Role Service

```typescript
describe('RoleService', () => {
  it('deve impedir deleção de role com isSystem = true')
  it('deve impedir edição de role com isSystem = true')
  it('deve registrar AuditLog ao atualizar permissões de um role')
  it('deve impedir que usuário altere o próprio role')
})
```

### Permission Guard

```typescript
describe('PermissionGuard', () => {
  it('deve conceder acesso ao Sysadmin com wildcard ["*"]')
  it('deve conceder acesso quando a permissão exigida está no array')
  it('deve negar acesso quando a permissão exigida não está no array')
  // contexto GraphQL — mockar GqlExecutionContext, não ExecutionContext HTTP
})
```

### WorkOrder — Regras de Status e SLA

```typescript
describe('WorkOrderService — status e SLA', () => {
  it('deve exigir closingNotes ao mover para COMPLETED')
  it('deve exigir rejectionReason ao mover para REJECTED')
  it('deve permitir cancelar uma OS em qualquer status exceto COMPLETED')
  it('deve gerar Notification OVERDUE_WORK_ORDER quando SLA for ultrapassado')
})
```

### WorkOrderPart — Estoque

```typescript
describe('WorkOrderService — partes e estoque', () => {
  it('deve decrementar SparePart.quantity ao completar a OS')
  it('deve gerar Notification LOW_STOCK quando quantity < minimumStock após decremento')
  it('deve rejeitar adição de WorkOrderPart em OS com status COMPLETED')
})
```

---

## 📊 Regras de Negócio — KPIs

### MTBF (Mean Time Between Failures)
```
MTBF = Tempo Total Operacional / Número de Falhas

Tempo Total Operacional = período entre completedAt da última OS corretiva
                          e startedAt da OS corretiva atual, por ativo.
```

### MTTR (Mean Time To Repair)
```
MTTR = Soma dos tempos de reparo / Número de reparos

Tempo de reparo = completedAt - startedAt  (WorkOrders do tipo CORRECTIVE)
```

### OEE (Overall Equipment Effectiveness)
```
OEE = Disponibilidade × Performance × Qualidade

Disponibilidade = (Tempo Disponível - Tempo em Manutenção) / Tempo Disponível
  → Tempo em Manutenção = soma de (completedAt - startedAt) de OS CORRECTIVE COMPLETED

Performance e Qualidade = valores inseridos manualmente pelo Engineer/Manager
  (fora do escopo automatizável sem sensores IoT)
```

Todos os cálculos devem ser executados **por ativo** e expostos no dashboard.

---

## ⏱️ Regras de Negócio — SLA por Prioridade

Ao criar uma OS, o campo `scheduledAt` deve respeitar os prazos máximos:

| Prioridade | Prazo máximo para início |
|---|---|
| CRITICAL | 2 horas |
| HIGH | 8 horas |
| MEDIUM | 48 horas |
| LOW | 168 horas (7 dias) |

- Se `startedAt` ultrapassar o prazo SLA, a OS entra em estado de **vencida**
- O dashboard deve exibir o KPI **"% OS dentro do SLA"** por período
- Ao ultrapassar o prazo, gerar uma `Notification` do tipo `OVERDUE_WORK_ORDER`

---

## 🔔 Regras de Negócio — Estoque

- Ao fechar uma OS (`status → COMPLETED`), o consumo de peças em `WorkOrderPart` deve **decrementar automaticamente** `SparePart.quantity`
- Se após o decremento `quantity < minimumStock`, disparar um **alerta** (evento interno ou notificação no dashboard)
- A criação de `WorkOrderPart` só é permitida enquanto a OS **não estiver COMPLETED**

---

## 🛡️ Segurança

| Medida | Implementação |
|---|---|
| Autenticação | JWT (access token 15min) + Refresh Token (7 dias, httpOnly cookie) |
| Autorização | RBAC via `PermissionGuard` + decorator `@RequiresPermission` |
| Senhas | Hash com `bcrypt` (salt rounds: 10) |
| Refresh Token | Hash armazenado em `User.refreshTokenHash`; rotacionado a cada uso |
| Rate Limiting | `@nestjs/throttler` — limite no endpoint de login (5 req/min) |
| CORS | Origem explícita configurada via `@nestjs/config` (não `*`) |
| Validação de inputs | `class-validator` + `class-transformer` |
| SQL Injection | Prevenido pelo Prisma ORM |
| GraphQL | Depth limit + complexity limit via `graphql-depth-limit` |
| Auditoria | Tabela `AuditLog` para todas as ações administrativas |

---

## 🐳 Conteinerização — Ambiente de Desenvolvimento

### `docker-compose.yml` (raiz do projeto)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: cmms_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-cmms}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-cmms_dev}
      POSTGRES_DB: ${DB_NAME:-cmms_db}
    ports:
      - '${DB_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-cmms}']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### `.env.example` (commitar no repositório)

```env
# Banco de dados
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=cmms_db
DB_PORT=5432
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"

# JWT
JWT_SECRET=troque_este_valor_em_producao
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# App
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Comandos de setup (onboarding de novo dev)

```bash
# 1. Subir o banco
docker compose up -d

# 2. Copiar variáveis de ambiente
cp .env.example .env

# 3. Rodar migrations e seed
pnpm dlx prisma migrate dev
pnpm dlx prisma db seed

# 4. Iniciar o servidor
pnpm run start:dev
```

### Regras

- O `.env` real nunca é commitado (`.gitignore`)
- O `.env.example` com valores de dev é sempre mantido atualizado
- `prisma migrate dev` gera histórico versionado em `prisma/migrations/` — **nunca usar `prisma db push` em ambiente compartilhado**
- O volume `postgres_data` persiste os dados entre restarts; para resetar: `docker compose down -v`

---

## 🚀 Tarefa Inicial para o Claude Code

```
1.  Configurar o boilerplate NestJS com GraphQL (code-first) + Prisma + PostgreSQL
      - Usar pnpm como package manager
      - Configurar @nestjs/config com validação Joi para variáveis de ambiente
      - Configurar @nestjs/throttler para rate limiting

2.  Criar o docker-compose.yml com PostgreSQL 16 e o .env.example

3.  Implementar o schema.prisma completo conforme definido acima
      - Usar `prisma migrate dev` (nunca db push)

4.  Criar o seed.ts com os 4 roles padrão (Sysadmin, Manager, Engineer, Technician)

5.  Implementar o módulo de autenticação
      - JWT access token (15min) + Refresh Token (7 dias, httpOnly cookie)
      - PermissionGuard + decorator @RequiresPermission
      - CORS configurado via variável de ambiente

6.  Escrever os arquivos de teste (.spec.ts) ANTES de implementar os serviços (TDD)
      - WorkOrderService: transições de status + closingNotes obrigatório + SLA
      - RoleService: proteções isSystem + AuditLog
      - PermissionGuard: wildcard, permissão presente, permissão ausente

7.  Implementar o WorkOrderService
      - Validação de transições de status (incluindo REJECTED e CANCELLED)
      - closingNotes obrigatório ao COMPLETED, rejectionReason ao REJECTED
      - Verificação de SLA ao mover para IN_PROGRESS

8.  Implementar o RoleService com proteções de isSystem e AuditLog

9.  Implementar DataLoaders para User e Asset (prevenir N+1 nas queries GraphQL)

10. Implementar o módulo de PreventivePlans

11. Implementar o módulo de Notifications com Subscription GraphQL

12. Implementar os KPIs no módulo Dashboard (MTBF, MTTR, OEE, % OS no SLA)
```