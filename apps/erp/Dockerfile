# Build from the repo root:
#   docker build -f apps/erp/Dockerfile .
FROM node:20-bookworm-slim AS schoolui
WORKDIR /sw
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY apps/school-world/package.json apps/school-world/package-lock.json ./
RUN npm ci
COPY apps/school-world/ ./
ENV SCHOOL_WORLD_BASE=/school-world/
ENV SCHOOL_WORLD_OUT=/sw/dist
RUN npm run build

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY apps/erp/package.json apps/erp/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY apps/erp/ ./
COPY --from=schoolui /sw/dist ./public/school-world
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV SKIP_BUILD_CHECKS=1
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/erp"
ENV AUTH_SECRET="build-time-auth-secret-not-used-32ch"
ENV FIELD_ENCRYPTION_KEY="build-time-field-key-not-used-32ch"
RUN test -f public/school-world/index.html
RUN grep -q "School World" public/school-world/index.html
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl gnupg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-18 \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["npm", "run", "start:railway"]
