# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable
WORKDIR /app

# Dependencies for building. Everything is bundled into the server build, so the runtime needs no node_modules.
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV ADAPTER=node
RUN yarn build

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build /app/build ./build
# package.json (type: module) is required for Node to treat build/ as ESM
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:${PORT}/ || exit 1
CMD ["node", "build"]
