FROM node:20.2.0-alpine3.16
RUN apk add dumb-init tzdata
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --chown=node:node . ./
RUN npm ci --only=production

USER node
CMD ["dumb-init", "node", "src/index.js"]
