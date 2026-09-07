FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund

FROM dependencies AS migration
COPY scripts ./scripts
COPY db ./db
CMD ["node", "--import", "tsx", "scripts/migrate.ts"]

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --system --gid 1001 booking && useradd --system --uid 1001 --gid booking booking
COPY --from=builder --chown=booking:booking /app/.next/standalone ./
COPY --from=builder --chown=booking:booking /app/.next/static ./.next/static
COPY --from=builder --chown=booking:booking /app/public ./public
USER booking
EXPOSE 3000
CMD ["node", "server.js"]
