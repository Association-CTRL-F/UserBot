FROM node:20.2.0-alpine3.16
RUN apk add dumb-init tzdata
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json .
COPY src src
COPY config/*.png config/
COPY config/commands/* config/commands/

RUN npm ci --only=production
CMD ["dumb-init", "node", "src/index.js"]
