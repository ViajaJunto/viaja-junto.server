# syntax=docker/dockerfile:1

# ─────────────────────────── build ───────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Schema and config first: the postinstall hook runs `prisma generate`,
# which needs them before the rest of the source is copied.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npm run build

# ────────────────────── production deps ──────────────────────
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips the prisma generate hook here; the generated client
# is copied from the build stage instead, so the Prisma CLI (a devDependency)
# is never needed in the runtime image.
RUN npm ci --omit=dev --ignore-scripts

# ────────────────────────── runtime ──────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY package.json ./

# node:alpine ships an unprivileged `node` user; never run the API as root.
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
