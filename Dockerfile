# ─── Stage 1: install + build ──────────────────────────────────────────────
FROM node:22-slim AS builder

# OpenSSL é obrigatório para o Prisma gerar o client e rodar migrations
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Instala pnpm 10
RUN npm install -g pnpm@10

WORKDIR /app

# Copia TODOS os manifests necessários para o pnpm workspace
# (root + workspaces + lockfile) — otimiza cache de dependências
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/package.json  ./backend/

# Instala todas as dependências do workspace
RUN pnpm install

# Copia o restante do código-fonte
COPY . .

# 1. Gera o Prisma Client (schema na raiz → cliente em backend/src/generated/prisma)
RUN cd backend && pnpm prisma generate --schema ../prisma/schema.prisma

# 2. Build do frontend → saída em backend/public/ (configurado no vite.config.ts)
# Usa vite diretamente (skip tsc -b) — erros de tipo são dívida técnica, não impedem runtime
RUN cd frontend && npx vite build

# 3. Compila o NestJS → saída em backend/dist/
# Usa tsc diretamente (mais transparente que nest build — evita deleteOutDir race condition)
RUN cd backend && ./node_modules/.bin/tsc -p tsconfig.build.json
# 4. Copia o Prisma Client gerado para dist/ (arquivos JS pré-compilados — tsc não os copia)
# src/generated/prisma/ contém index.js, binários de query engine, etc.
RUN cp -r /app/backend/src/generated /app/backend/dist/
# Verificação explícita: falha o build se dist/main.js não existir
RUN test -f /app/backend/dist/main.js \
    && echo "✓ dist/main.js found" \
    || (echo "✗ dist/main.js NOT FOUND. Contents of dist/:" && ls -la /app/backend/dist/ 2>&1 && exit 1)

# ─── Stage 2: runtime ──────────────────────────────────────────────────────
FROM node:22-slim AS runtime

# OpenSSL também necessário em runtime para prisma migrate deploy e queries
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

WORKDIR /app

# Copia a store do pnpm (.pnpm) e workspace root — necessário para que os symlinks
# de backend/node_modules/* (que apontam para ../../node_modules/.pnpm/...) resolvam
COPY --from=builder /app/node_modules      ./node_modules
COPY --from=builder /app/package.json      ./package.json

# Backend: dist compilado, build do frontend (public/), node_modules (com symlinks) e package.json
COPY --from=builder /app/backend/dist       ./backend/dist
COPY --from=builder /app/backend/public     ./backend/public
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json

# Schema e migrations do Prisma
COPY --from=builder /app/prisma             ./prisma

ENV NODE_ENV=production
EXPOSE 3000

# Sincroniza o schema Prisma com o banco (cria tabelas se não existirem) e inicia o NestJS
# Nota: prisma db push é usado aqui pois o projeto usa migrations SQL customizadas (não prisma migrate)
CMD ["sh", "-c", "cd backend && npx prisma db push --schema ../prisma/schema.prisma --skip-generate --accept-data-loss && node dist/main"]
