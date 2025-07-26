FROM node:24.4-alpine3.22 AS base

RUN apk --no-cache add curl
RUN corepack enable

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts --prod

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .

RUN pnpm run build

# Production stage
FROM base

ENV NODE_ENV=production
ENV LOG_LEVEL=debug

WORKDIR /app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app
COPY --from=build /app/package.json /app/package.json

# Expose port
EXPOSE $PORT

# Start app
CMD ls -la . && ls -la src && npm run start
