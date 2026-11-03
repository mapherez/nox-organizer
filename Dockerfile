# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build: install dependencies (better-sqlite3 compiles for the target
# platform), generate the Prisma client, and build Next.js.
# ---------------------------------------------------------------------------
FROM node:24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma7.config.ts ./
COPY prisma ./
RUN npm ci

COPY . .
# Valid URL for build time; the real one is provided at runtime.
ENV DATABASE_URL="file:./data/nox.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Run: slim runtime image with the built app.
# ---------------------------------------------------------------------------
FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# SQLite database lives in the /data volume (spec §25).
ENV DATABASE_URL="file:/data/nox.db"

COPY --from=build /app ./

# The node image ships a `node` user (uid 1000) — use it.
# `openssl` is needed so Prisma's engine version detection works at startup
# (the slim image ships libssl but no `openssl` binary).
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data \
  && chown -R node:node /app /data

USER node
EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["sh", "/app/scripts/entrypoint.sh"]
CMD ["npm", "run", "start"]
