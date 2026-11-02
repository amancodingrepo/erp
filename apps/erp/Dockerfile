# Build from the repo root:
#   docker build -f apps/erp/Dockerfile .
FROM node:22-bookworm-slim AS schoolui
WORKDIR /sw
COPY apps/school-world/package.json apps/school-world/package-lock.json ./
RUN npm ci
COPY apps/school-world/ ./
ENV SCHOOL_WORLD_BASE=/school-world/
ENV SCHOOL_WORLD_OUT=/sw/dist
RUN npm run build

FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY apps/erp/package.json apps/erp/package-lock.json ./
RUN npm ci
COPY apps/erp/ ./
COPY --from=schoolui /sw/dist ./public/school-world
ENV AUTH_SECRET=build-time-placeholder-not-a-real-secret-0000
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV FIELD_ENCRYPTION_KEY=build-time-field-key-not-used-32ch
RUN test -f public/school-world/index.html
RUN grep -q "School World" public/school-world/index.html
RUN npx prisma generate && npm run build

FROM base AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts /app/tsconfig.json ./
# prisma/seed.ts imports from src/
COPY --from=build /app/src ./src
EXPOSE 3000
# Migrations run on start. A rolled-back image does not undo a migration that already committed.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3000"]
