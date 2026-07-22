# syntax=docker/dockerfile:1

# ---- Dependencies ----
# `canvas` needs a toolchain when no prebuilt binary matches the platform,
# so keep the build deps here and out of the final image.
FROM node:22-bookworm AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  libpixman-1-dev \
  libpng-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM node:22-bookworm AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Runtime shared libraries for `canvas` (the -dev headers are build-only).
RUN apt-get update && apt-get install -y --no-install-recommends \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  libpixman-1-0 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0

# `output: 'standalone'` traces the server and its deps into .next/standalone;
# static assets and public/ are not traced and must be copied alongside it.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
