# syntax=docker/dockerfile:1

# ─────────────────────────── build ───────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Schema and config first: the postinstall hook runs `prisma generate`,
# which needs them before the rest of the source is copied.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# The npm cache is kept in a BuildKit cache mount so a retry after a dropped
# connection reuses what was already downloaded instead of starting over.
# The retry flags cover the transient ECONNRESET the public registry throws
# when many packages are fetched at once.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-retries=5 \
           --fetch-retry-mintimeout=20000 \
           --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

# ────────────────────── production deps ──────────────────────
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips the prisma generate hook here; the generated client
# is copied from the build stage instead.
#
# --omit=optional keeps the Prisma CLI out of the image. @prisma/client lists
# `prisma` as an optional peer, so --omit=dev alone still installs it — along
# with ~120 transitive packages (mysql2, deepmerge-ts...) that Trivy flags and
# the API never loads at runtime. Also dropped: pg-cloudflare (Workers only)
# and optional react/typescript peers of tooling.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --omit=optional --ignore-scripts \
           --fetch-retries=5 \
           --fetch-retry-mintimeout=20000 \
           --fetch-retry-maxtimeout=120000

# ────────────────────────── runtime ──────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production

# The base image ships npm, corepack and yarn. The API starts with plain
# `node dist/main.js` and never uses them, but their bundled dependencies
# (pacote, sigstore, brace-expansion, picomatch, ip-address...) account for
# most of the HIGH findings Trivy reports. Removing them shrinks the attack
# surface without changing runtime behaviour.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY package.json ./

# node:alpine ships an unprivileged `node` user; never run the API as root.
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
