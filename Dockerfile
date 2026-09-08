FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund
COPY scripts/licenses.ts ./scripts/licenses.ts
RUN mkdir -p docs && npm run licenses && cp docs/THIRD-PARTY-NOTICES.txt /app/THIRD-PARTY-NOTICES.txt

FROM dependencies AS migration
COPY scripts ./scripts
COPY db ./db
CMD ["node", "--import", "tsx", "scripts/migrate.ts"]

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM dependencies AS notification-worker
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./
USER node
CMD ["node", "--import", "tsx", "scripts/notification-worker.ts"]

FROM dependencies AS export-worker
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PRIVATE_STORAGE_DIR=/data/private
RUN groupadd --system --gid 1001 booking && useradd --system --uid 1001 --gid booking booking && mkdir -p /data/private && chown booking:booking /data/private
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./
USER booking
CMD ["node", "--import", "tsx", "scripts/export-worker.ts"]

FROM dependencies AS payment-worker
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./
USER node
CMD ["node", "--import", "tsx", "scripts/payment-worker.ts"]

FROM dependencies AS billing-worker
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./
USER node
CMD ["node", "--import", "tsx", "scripts/billing-worker.ts"]

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --system --gid 1001 booking && useradd --system --uid 1001 --gid booking booking && mkdir -p /data/private && chown booking:booking /data/private
COPY --from=builder --chown=booking:booking /app/.next/standalone ./
COPY --from=builder --chown=booking:booking /app/.next/static ./.next/static
COPY --from=builder --chown=booking:booking /app/public ./public
COPY --from=builder --chown=booking:booking /app/db/migrations ./db/migrations
COPY --from=dependencies --chown=booking:booking /app/THIRD-PARTY-NOTICES.txt ./THIRD-PARTY-NOTICES.txt
USER booking
EXPOSE 3000
CMD ["node", "server.js"]
