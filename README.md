# CMMS — Sistema de Gestão de Manutenção Industrial

TCC — Unoesc, Campus São Miguel do Oeste (SC), 2026  
**Autores:** Fernando Camilo Schneider e Jean Carlo Toral  
**Orientador:** Prof. Me. Roberson Junior Fernandes Alves

Sistema web para gestão de manutenção de máquinas industriais baseado nos conceitos de CMMS (_Computerized Maintenance Management System_), cobrindo o workflow completo de uma Ordem de Serviço e cálculo automático de KPIs (MTBF, MTTR, OEE).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 6 + Vite 8 + Apollo Client 4 |
| Backend | NestJS 11 + TypeScript 5 + Apollo Server 5 (GraphQL code-first) |
| ORM | Prisma 7 |
| Banco | PostgreSQL 16 (Docker) |
| Auth | JWT (access 15min + refresh 7d, httpOnly cookie) |
| Pacotes | pnpm (monorepo) |

---

## Estrutura do repositório

```
/
├── .env                  # variáveis de ambiente (único, na raiz)
├── .env.example          # template do .env
├── prisma.config.ts      # configuração central do Prisma
├── prisma/
│   ├── schema.prisma     # schema do banco (source of truth)
│   └── migrations/       # migrations geradas incrementalmente
├── generated/
│   └── prisma/           # cliente Prisma gerado (não versionar)
├── backend/              # NestJS
├── frontend/             # React + Vite
└── docker-compose.yml    # PostgreSQL 16
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9 — `npm install -g pnpm`
- [Docker](https://www.docker.com/) + Docker Compose

---

## Setup inicial (primeira vez)

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd TCC
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` se necessário. Os valores padrão já funcionam com o Docker Compose local.

### 3. Subir o banco de dados

```bash
docker compose up -d
```

### 4. Rodar as migrations

```bash
pnpm migrate
```

> O Prisma vai pedir um nome para a migration. Use o padrão `snake_case` descrevendo o que foi adicionado (ex: `init_auth`, `add_assets`).

### 5. Gerar o cliente Prisma

```bash
pnpm prisma generate
```

---

## Rodando o projeto

```bash
# Backend e frontend em paralelo (recomendado)
pnpm start:all

# Ou separadamente:
pnpm start:backend   # NestJS na porta 3000
pnpm start:frontend  # Vite na porta 5173
```

---

## Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm migrate` | Cria e aplica uma nova migration |
| `pnpm rollback` | Reseta o banco e reaplica todas as migrations (dev only) |
| `pnpm studio` | Abre o Prisma Studio em `localhost:5555` |
| `pnpm start:all` | Sobe backend + frontend em paralelo |
| `pnpm start:backend` | Sobe só o backend (watch mode) |
| `pnpm start:frontend` | Sobe só o frontend |
| `cd backend && pnpm test` | Testes unitários do backend |
| `cd backend && pnpm test:e2e` | Testes e2e do backend |
| `cd backend && pnpm test:cov` | Cobertura de testes |
| `pnpm lint` | Lint em todo o projeto |

---

## Fluxo de desenvolvimento

### Adicionando um novo módulo

1. **Atualizar o schema** — adicionar o model em `prisma/schema.prisma`
2. **Criar a migration** — `pnpm migrate` (nome sugerido: `add_<modulo>`)
3. **Gerar o cliente** — `pnpm prisma generate`
4. **Implementar no backend** — criar pasta em `backend/src/modules/<modulo>/` seguindo a estrutura:
   ```
   <modulo>/
   ├── <modulo>.module.ts
   ├── <modulo>.resolver.ts
   ├── <modulo>.service.ts
   ├── <modulo>.repository.ts
   └── dto/
   ```
5. **Testes** — criar `<modulo>.service.spec.ts` e `<modulo>.resolver.spec.ts`

### Ordem de migrations (incremental)

| Migration | Módulo |
|---|---|
| `init_auth` | Role + User |
| `add_assets` | Asset + AssetCategory |
| `add_work_orders` | WorkOrder + Comment |
| `add_spare_parts` | SparePart + WorkOrderPart |
| `add_preventive_plans` | PreventivePlan |
| `add_notifications` | Notification |
| `add_audit_log` | AuditLog |

---

## Verificando o banco

```bash
# Interface visual
pnpm studio

# psql direto no container
docker exec -it cmms_postgres psql -U postgres -d cmms_db

# Dentro do psql:
\dt          # listar tabelas
\d "User"    # descrever campos de uma tabela
```

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | URL de conexão do PostgreSQL | `postgresql://postgres:postgres@localhost:5433/cmms_db` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | `postgres` |
| `DB_NAME` | Nome do banco | `cmms_db` |
| `DB_PORT` | Porta exposta pelo Docker | `5433` |
| `JWT_SECRET` | Segredo para assinar tokens JWT | Trocar em produção |
| `JWT_EXPIRATION` | Validade do access token | `15m` |
| `JWT_REFRESH_EXPIRATION` | Validade do refresh token | `7d` |
| `PORT` | Porta do backend NestJS | `3000` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:5173` |
| `NODE_ENV` | Ambiente de execução | `development` |

> Nunca commitar o `.env` com valores reais. O arquivo está no `.gitignore`.
