FROM node:24-alpine

RUN apk add --no-cache dumb-init tzdata

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node
CMD ["dumb-init", "node", "src/index.js"]
