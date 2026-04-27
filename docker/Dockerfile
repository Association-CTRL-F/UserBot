# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:25-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:25-alpine AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# ── Stage 3: runtime (distroless) ─────────────────────────────────────────────
FROM gcr.io/distroless/nodejs24-debian13
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package.json ./package.json
CMD ["src/index.js"]
